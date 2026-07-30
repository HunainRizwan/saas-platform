import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentStore } from "@/lib/auth/get-current-store";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

/**
 * Auth gating itself already happens in middleware.ts (redirects
 * unauthenticated visitors to /login before this layout even renders).
 * This layout handles the second-order case: an authenticated user with
 * no store yet — sent to the setup wizard (Phase 3a).
 *
 * The three-way redirect logic below is UNCHANGED from Phase 2/3a — only
 * the "ok" branch's render output changed, from a bare <div> to the real
 * Dashboard Shell (Phase 3b). Fetching the store name and user display
 * name here (rather than extending getCurrentStore()'s return shape) is
 * deliberate: it's shell-specific presentation data, not auth/tenant
 * resolution logic, so it doesn't belong in that shared helper.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const result = await getCurrentStore();

  if (result.status === "unauthenticated") {
    redirect("/login");
  }

  if (result.status === "no-store") {
    redirect("/dashboard/setup");
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: store }, { data: authData }] = await Promise.all([
    supabase.from("stores").select("name").eq("id", result.storeId).single(),
    supabase.auth.getUser(),
  ]);

  let displayName = authData.user?.email ?? "Account";
  if (authData.user) {
    const { data: profile } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profile?.full_name) displayName = profile.full_name;
  }

  return (
    <DashboardShell
      storeName={store?.name ?? "Your Store"}
      displayName={displayName}
      email={authData.user?.email ?? ""}
    >
      {children}
    </DashboardShell>
  );
}
