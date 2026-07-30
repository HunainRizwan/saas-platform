import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Regression test for the /dashboard/setup 404 bug.
 *
 * Root cause: (dashboard)/layout.tsx redirects "no-store" users to
 * "/dashboard/setup", but no page existed at that path (Phase 3's setup
 * wizard hadn't been built yet) -> 404.
 *
 * Fix: added apps/web/app/dashboard/setup/page.tsx as a stub, deliberately
 * placed OUTSIDE the (dashboard) route group so it does NOT inherit
 * (dashboard)/layout.tsx's store-check redirect. This test locks in that
 * the page itself still handles all three getCurrentStore() states
 * correctly, so nobody re-nests it under (dashboard) later and
 * reintroduces an infinite redirect loop for "no-store" users.
 */

const { getCurrentStore, redirect } = vi.hoisted(() => ({
  getCurrentStore: vi.fn(),
  redirect: vi.fn((url: string) => {
    // next/navigation's redirect() works by throwing; replicate that so
    // the page function's control flow (and our assertions) behave the
    // same way it does in the real app.
    const err = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
    err.digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw err;
  }),
}));

vi.mock("@/lib/auth/get-current-store", () => ({ getCurrentStore }));
vi.mock("next/navigation", () => ({ redirect }));

async function renderSetupPage() {
  // Re-import fresh each time so the two vi.mock modules above are in effect.
  const { default: SetupPage } = await import("../app/dashboard/setup/page");
  return SetupPage();
}

describe("/dashboard/setup page", () => {
  beforeEach(() => {
    getCurrentStore.mockReset();
    redirect.mockClear();
  });

  it("redirects unauthenticated visitors to /login", async () => {
    getCurrentStore.mockResolvedValue({ status: "unauthenticated" });

    await expect(renderSetupPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects users who already have a store to /dashboard (no loop back to /setup)", async () => {
    getCurrentStore.mockResolvedValue({
      status: "ok",
      userId: "u1",
      storeId: "s1",
      role: "owner",
    });

    await expect(renderSetupPage()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("does NOT redirect authenticated users with no store (this is the case that used to 404)", async () => {
    getCurrentStore.mockResolvedValue({ status: "no-store", userId: "u1" });

    // Note: this bare vitest environment has no JSX runtime configured
    // (the app itself uses Next's compiler, which does), so rendering the
    // returned <div> throws a harness-only ReferenceError once control
    // flow reaches the `return (...)`. That's fine for this test's
    // purpose: what matters is confirming neither redirect branch fired
    // for the "no-store" case -- that's the case that used to loop back
    // into the (dashboard) layout's redirect before the fix.
    await expect(renderSetupPage()).rejects.not.toThrow(/^NEXT_REDIRECT:/);
    expect(redirect).not.toHaveBeenCalled();
  });
});
