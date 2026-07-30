import { ComingSoon } from "@/components/dashboard/coming-soon";
import { LayoutDashboard } from "lucide-react";

/**
 * No server query here — this page inherits (dashboard)/layout.tsx, which
 * already fetches the store name for the sidebar/topbar and already
 * guarantees (via its redirect logic) that anyone reaching this page is
 * authenticated and has a store. Re-fetching the store name here (as an
 * earlier draft did) was a genuine redundant query, caught in the Phase 3b
 * self-audit: two separate DB round-trips fetching the same value on every
 * /dashboard load. Contrast with app/dashboard/setup/page.tsx, which
 * legitimately re-checks auth/store state itself because it sits OUTSIDE
 * this layout group and has no other guard.
 */
export default function DashboardPage() {
  return (
    <ComingSoon
      title="Welcome to your dashboard"
      description="Revenue, orders, and product widgets land here starting Phase 4 — for now, use the sidebar to explore the rest of the dashboard shell."
      icon={LayoutDashboard}
    />
  );
}
