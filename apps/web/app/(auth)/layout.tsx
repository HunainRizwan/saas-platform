import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* Store name/logo placeholder — full branding lands with the
              finalized codename (tracked in PROJECT.md as an open item). */}
          <span className="text-xl font-semibold text-brand-900">Your Store, Online</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
