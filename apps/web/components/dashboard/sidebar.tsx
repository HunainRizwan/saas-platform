"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { NAV_ITEMS, isNavActive } from "@/lib/dashboard/nav-config";

type SidebarProps = {
  storeName: string;
  mobileOpen: boolean;
  onClose: () => void;
};

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-0.5 px-3">
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-50 text-brand-600"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ storeName, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Found missing in the Phase 3b self-audit: the drawer had no Escape
  // handler and never moved focus into itself when opened, so a keyboard
  // user tabbing to the (now off-screen, but still focusable without
  // this) hamburger button had no way to close it without a mouse, and
  // focus stayed stranded on whatever was focused before it opened. This
  // also restores focus to whatever triggered the drawer (the topbar's
  // hamburger button) once it closes, rather than dropping it silently.
  useEffect(() => {
    if (!mobileOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      previouslyFocused?.focus();
    };
  }, [mobileOpen, onClose]);

  return (
    <>
      {/* Desktop: fixed, always visible at md+ */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:border-r md:border-slate-200 md:bg-white">
        <div className="flex h-16 items-center px-4 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-900 truncate">{storeName}</span>
        </div>
        <div className="flex flex-1 flex-col py-4">
          <NavLinks pathname={pathname} />
        </div>
      </aside>

      {/* Mobile: overlay + slide-in drawer, only mounted when open */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={onClose}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col"
          >
            <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-900 truncate">{storeName}</span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col py-4">
              <NavLinks pathname={pathname} onNavigate={onClose} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
