import type { LucideIcon } from "lucide-react";

type ComingSoonProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

/**
 * Shared empty-state for nav destinations that exist in the shell but
 * don't have a real feature behind them yet (Products, Orders, Customers,
 * Analytics, Inventory — all later phases per the Beta MVP roadmap in
 * TASKS.md). Keeps every stub page visually consistent and gives the
 * sidebar real, non-404 destinations without building any Phase 4+ logic.
 */
export function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">{title}</h1>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}
