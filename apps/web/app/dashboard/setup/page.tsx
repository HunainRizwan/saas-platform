import { redirect } from "next/navigation";
import { getCurrentStore } from "@/lib/auth/get-current-store";
import { StoreSetupWizard } from "./store-setup-wizard";

/**
 * Redirect target for authenticated users with no store yet (see
 * (dashboard)/layout.tsx's "no-store" branch). This lives OUTSIDE the
 * (dashboard) route group on purpose: that group's layout redirects
 * "no-store" users to this exact path, so if this page inherited that
 * same layout, an authenticated user with no store would be redirected
 * back to itself on every render — an infinite redirect loop. Being a
 * physical sibling of the (dashboard) group (not inside it) means this
 * page only inherits the root layout, not the store-check one, breaking
 * that loop while still sharing the "/dashboard" URL prefix so
 * middleware's auth gate (DASHBOARD_ROUTE_PREFIXES) still protects it.
 *
 * This redirect logic is unchanged from Phase 2 — only the render branch
 * below (previously a stub) now renders the real Phase 3 wizard.
 */
export default async function SetupPage() {
  const result = await getCurrentStore();

  if (result.status === "unauthenticated") {
    redirect("/login");
  }

  if (result.status === "ok") {
    // Already has a store — nothing to set up, send them to the real dashboard.
    // This is what makes returning users with a store skip setup entirely.
    redirect("/dashboard");
  }

  return <StoreSetupWizard />;
}
