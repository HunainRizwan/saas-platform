/**
 * Next.js route-group loading UI — shown automatically during navigation
 * within (dashboard) while a page's server-side data fetch is in flight.
 * Mirrors the shell's actual layout proportions so it doesn't flash/shift
 * once the real content arrives.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-40 rounded bg-slate-200" />
      <div className="h-4 w-64 rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
        <div className="h-24 rounded-lg bg-slate-200" />
        <div className="h-24 rounded-lg bg-slate-200" />
        <div className="h-24 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}
