"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators/auth";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser";

export default function ForgotPasswordPage() {
  const supabase = createSupabaseBrowserClient();
  const [submitting, setSubmitting] = useState(false);
  // Deliberately shows the same success state whether or not the email is
  // registered — prevents account enumeration (reviewed ARCHITECTURE.md
  // §10, A07). Supabase's resetPasswordForEmail already behaves this way
  // (it never errors on an unknown email), so this just mirrors that.
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    setSubmitting(true);
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="text-center">
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Check your email</h1>
        <p className="text-sm text-slate-500">
          If an account exists for that email, we&apos;ve sent a password reset link.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-brand-600 font-medium hover:underline"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 mb-1">Reset your password</h1>
      <p className="text-sm text-slate-500 mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="text-brand-600 font-medium hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
