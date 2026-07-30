"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { storeSettingsSchema, type StoreSettingsInput } from "@/lib/validators/store-settings";
import { SUPPORTED_CURRENCIES, SUPPORTED_COUNTRIES } from "@/lib/validators/store-setup";
import { updateStoreSettings } from "./actions";
import { updateStoreLogo } from "@/app/dashboard/setup/actions";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser";

type StoreSettingsFormProps = {
  storeId: string;
  initialData: StoreSettingsInput & { logoUrl: string | null };
};

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — same limit as the setup wizard
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function StoreSettingsForm({ storeId, initialData }: StoreSettingsFormProps) {
  const supabase = createSupabaseBrowserClient();

  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<StoreSettingsInput>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: initialData,
  });

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

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

  async function handleLogoUpload() {
    if (!logoFile) return;
    setLogoUploading(true);
    setLogoError(null);

    const ext = logoFile.name.split(".").pop() || "jpg";
    const path = `${storeId}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("store-assets")
      .upload(path, logoFile, { upsert: true, contentType: logoFile.type });

    if (uploadError) {
      setLogoError("Could not upload logo, please try again");
      setLogoUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("store-assets").getPublicUrl(path);

    const result = await updateStoreLogo(storeId, publicUrl);
    setLogoUploading(false);

    if (!result.success) {
      setLogoError(result.error ?? "Could not save your logo");
      return;
    }

    setLogoUrl(publicUrl);
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(values: StoreSettingsInput) {
    setServerError(null);
    setSaved(false);
    setSubmitting(true);

    const result = await updateStoreSettings(values);

    setSubmitting(false);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setSaved(true);
  }

  return (
    <div className="space-y-8">
      {/* Logo — its own save action, independent of the rest of the form,
          same pattern as the setup wizard (upload happens once a storeId
          already exists, which it always does here). */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Store logo</label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- seller-supplied external Supabase Storage URL, not a static local asset
              <img src={logoUrl} alt="Store logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-slate-400">No logo</span>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              id="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
            />
            {logoFile && (
              <button
                type="button"
                onClick={handleLogoUpload}
                disabled={logoUploading}
                className="mt-2 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {logoUploading ? "Uploading…" : "Upload new logo"}
              </button>
            )}
            {logoError && <p className="mt-1 text-xs text-red-600">{logoError}</p>}
            <p className="mt-1 text-xs text-slate-400">JPG, PNG, or WEBP, up to 2MB.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            Store name
          </label>
          <input
            id="name"
            type="text"
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
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
            Store description <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={3}
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
          <label htmlFor="whatsappNumber" className="block text-sm font-medium text-slate-700 mb-1">
            WhatsApp number
          </label>
          <input
            id="whatsappNumber"
            type="tel"
            aria-invalid={!!errors.whatsappNumber}
            aria-describedby={errors.whatsappNumber ? "whatsappNumber-error" : undefined}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register("whatsappNumber")}
          />
          {errors.whatsappNumber && (
            <p id="whatsappNumber-error" className="mt-1 text-xs text-red-600">
              {errors.whatsappNumber.message}
            </p>
          )}
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

        <div className="pt-2 border-t border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900 mt-4">Ad tracking</h2>
          <p className="mt-1 text-xs text-slate-500">
            Add these if you run ads to your store on Facebook, Instagram, or TikTok — they let
            you track conversions and build retargeting audiences. Both are optional.
          </p>

          <div className="mt-3 space-y-4">
            <div>
              <label htmlFor="facebookPixelId" className="block text-sm font-medium text-slate-700 mb-1">
                Meta (Facebook) Pixel ID <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="facebookPixelId"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 123456789012345"
                aria-invalid={!!errors.facebookPixelId}
                aria-describedby={errors.facebookPixelId ? "facebookPixelId-error" : "facebookPixelId-hint"}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                {...register("facebookPixelId")}
              />
              {errors.facebookPixelId && (
                <p id="facebookPixelId-error" className="mt-1 text-xs text-red-600">
                  {errors.facebookPixelId.message}
                </p>
              )}
              <p id="facebookPixelId-hint" className="mt-1 text-xs text-slate-400">
                Find this in Meta Events Manager → Data Sources. A 15–16 digit number, numbers only.
              </p>
            </div>

            <div>
              <label htmlFor="tiktokPixelId" className="block text-sm font-medium text-slate-700 mb-1">
                TikTok Pixel ID <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="tiktokPixelId"
                type="text"
                placeholder="e.g. C4A1B2C3D4E5F6G7H8I9"
                aria-invalid={!!errors.tiktokPixelId}
                aria-describedby={errors.tiktokPixelId ? "tiktokPixelId-error" : "tiktokPixelId-hint"}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                {...register("tiktokPixelId")}
              />
              {errors.tiktokPixelId && (
                <p id="tiktokPixelId-error" className="mt-1 text-xs text-red-600">
                  {errors.tiktokPixelId.message}
                </p>
              )}
              <p id="tiktokPixelId-hint" className="mt-1 text-xs text-slate-400">
                Find this in TikTok Ads Manager → Assets → Events. Uppercase letters and numbers only.
              </p>
            </div>
          </div>
        </div>

        {serverError && (
          <p
            role="alert"
            className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
          >
            {serverError}
          </p>
        )}
        {saved && (
          <p
            role="status"
            className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2"
          >
            Changes saved.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !isDirty}
          className="rounded-md bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
