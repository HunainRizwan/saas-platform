"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validators/auth";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser";

/**
 * Reached via the link in the password-reset email (Supabase Auth's native
 * flow, configured in forgot-password/page.tsx's redirectTo). Supabase's
 * client SDK automatically exchanges the URL's recovery token for a
 * session on page load, so by the time this form submits, `updateUser` is
 * operating on an authenticated (recovery) session — no manual token
 * handling needed here.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password: values.password });

    setSubmitting(false);

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push("/login");
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 mb-1">Set a new password</h1>
      <p className="text-sm text-slate-500 mb-6">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {serverError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {submitting ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
