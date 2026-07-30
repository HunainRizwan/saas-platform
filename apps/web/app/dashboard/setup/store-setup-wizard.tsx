"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  storeSetupSchema,
  SUPPORTED_CURRENCIES,
  SUPPORTED_COUNTRIES,
  BUSINESS_CATEGORY_SUGGESTIONS,
  type StoreSetupInput,
} from "@/lib/validators/store-setup";
import { createStore, checkSlugAvailability, updateStoreLogo } from "./actions";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser";

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function StoreSetupWizard() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const slugTouchedRef = useRef(false);
  const slugCheckSeq = useRef(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StoreSetupInput>({
    resolver: zodResolver(storeSetupSchema),
    defaultValues: {
      country: "Pakistan",
      currency: "PKR",
    },
  });

  const name = watch("name");
  const slug = watch("slug");

  // Auto-derive the slug from the store name until the seller manually
  // edits the slug field themselves — standard pattern, keeps the common
  // case (seller never touches the slug) fast while still fully editable.
  useEffect(() => {
    if (!slugTouchedRef.current && name) {
      setValue("slug", slugify(name), { shouldValidate: true });
    }
  }, [name, setValue]);

  // Debounced live availability check — this is a UX nicety; the real
  // authority is the server-side re-check inside createStore(), which
  // also closes the race-condition window this client-side check can't.
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus("idle");
      return;
    }

    const parsed = storeSetupSchema.shape.slug.safeParse(slug);
    if (!parsed.success) {
      setSlugStatus("invalid");
      return;
    }

    setSlugStatus("checking");
    const seq = ++slugCheckSeq.current;
    const timer = setTimeout(async () => {
      const result = await checkSlugAvailability(slug);
      // Ignore stale responses from an earlier keystroke that resolved late.
      if (seq !== slugCheckSeq.current) return;

      // BUGFIX (found via manual testing + reproduced against a real
      // PostgREST/Supabase-shaped stack): checkSlugAvailability() returns
      // { available: false, error: "..." } when the CHECK ITSELF fails
      // (network issue, misconfigured Supabase env vars, etc.) — this
      // used to be collapsed into the same "taken" state as a genuine
      // slug conflict, so ANY failure showed "Already taken" for every
      // slug, including brand-new random ones. Now surfaced distinctly.
      if (result.error) {
        setSlugStatus("error");
        return;
      }
      setSlugStatus(result.available ? "available" : "taken");
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setLogoFile(null);
      return;
    }
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError("Logo must be a JPG, PNG, or WEBP image");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setLogoError("Logo must be under 2MB");
      e.target.value = "";
      return;
    }
    setLogoFile(file);
  }

  async function onSubmit(values: StoreSetupInput) {
    setServerError(null);

    if (slugStatus === "taken") {
      setServerError("This store link is already taken — please choose another.");
      return;
    }

    setSubmitting(true);

    const result = await createStore(values);

    if (!result.success) {
      setServerError(result.error);
      setSubmitting(false);
      return;
    }

    // Logo upload happens after store creation, since the storage path is
    // scoped by store_id (see policies/08_storage.sql) — the store has to
    // exist first. A failure here doesn't block onboarding; the seller can
    // add a logo later from Store Settings.
    if (logoFile) {
      const ext = logoFile.name.split(".").pop() || "jpg";
      const path = `${result.storeId}/logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("store-assets")
        .upload(path, logoFile, { upsert: true, contentType: logoFile.type });

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("store-assets").getPublicUrl(path);
        await updateStoreLogo(result.storeId, publicUrl);
      }
      // Silently continue on upload failure — not worth blocking the whole
      // wizard over an optional field; store creation itself already succeeded.
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Set up your store</h1>
          <p className="mt-1 text-sm text-slate-500">
            A few details and your store is live. Takes about a minute.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Store name
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Ali's Cosmetics"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                {...register("name")}
              />
              {errors.name && (
                <p id="name-error" className="mt-1 text-xs text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-slate-700 mb-1">
                Store link
              </label>
              <div className="flex items-center rounded-md border border-slate-300 focus-within:ring-2 focus-within:ring-brand-500 overflow-hidden">
                <span className="pl-3 text-sm text-slate-400 whitespace-nowrap">store.com/</span>
                <input
                  id="slug"
                  type="text"
                  aria-invalid={!!errors.slug || slugStatus === "taken"}
                  aria-describedby="slug-status"
                  className="w-full px-2 py-2 text-sm focus:outline-none"
                  {...register("slug", {
                    onChange: () => {
                      slugTouchedRef.current = true;
                    },
                  })}
                />
              </div>
              <div id="slug-status" className="mt-1 min-h-[1rem]" role="status">
                {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
                {!errors.slug && slugStatus === "checking" && (
                  <p className="text-xs text-slate-400">Checking availability…</p>
                )}
                {!errors.slug && slugStatus === "available" && (
                  <p className="text-xs text-green-600">Available</p>
                )}
                {!errors.slug && slugStatus === "taken" && (
                  <p className="text-xs text-red-600">Already taken — try another</p>
                )}
                {!errors.slug && slugStatus === "error" && (
                  <p className="text-xs text-amber-600">
                    Couldn&apos;t check availability right now — we&apos;ll check again when you submit.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="whatsappNumber" className="block text-sm font-medium text-slate-700 mb-1">
                WhatsApp number
              </label>
              <input
                id="whatsappNumber"
                type="tel"
                placeholder="+92 300 1234567"
                aria-invalid={!!errors.whatsappNumber}
                aria-describedby={errors.whatsappNumber ? "whatsappNumber-error" : "whatsappNumber-hint"}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                {...register("whatsappNumber")}
              />
              {errors.whatsappNumber && (
                <p id="whatsappNumber-error" className="mt-1 text-xs text-red-600">
                  {errors.whatsappNumber.message}
                </p>
              )}
              <p id="whatsappNumber-hint" className="mt-1 text-xs text-slate-400">
                Orders will be sent to this number as a WhatsApp message.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-1">
                  Country
                </label>
                <select
                  id="country"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  {...register("country")}
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-slate-700 mb-1">
                  Currency
                </label>
                <select
                  id="currency"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  {...register("currency")}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="businessCategory" className="block text-sm font-medium text-slate-700 mb-1">
                Business category <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                id="businessCategory"
                defaultValue=""
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                {...register("businessCategory")}
              >
                <option value="">Select a category</option>
                {BUSINESS_CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                Store description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="description"
                rows={3}
                placeholder="Tell customers a little about your store"
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? "description-error" : undefined}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                {...register("description")}
              />
              {errors.description && (
                <p id="description-error" className="mt-1 text-xs text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="logo" className="block text-sm font-medium text-slate-700 mb-1">
                Store logo <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
              />
              {logoError && <p className="mt-1 text-xs text-red-600">{logoError}</p>}
              <p className="mt-1 text-xs text-slate-400">JPG, PNG, or WEBP, up to 2MB.</p>
            </div>

            {serverError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || slugStatus === "checking" || slugStatus === "taken"}
              className="w-full rounded-md bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Creating your store…" : "Create store"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
