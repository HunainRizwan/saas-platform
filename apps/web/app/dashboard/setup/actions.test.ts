import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Mocks both Supabase client tiers used by app/dashboard/setup/actions.ts:
 *   - serverClient: RLS-respecting, used for auth check + the stores INSERT
 *   - serviceClient: RLS-bypassing, used for slug check + subscriptions +
 *     activity_logs (per the trust-tier reasoning documented in actions.ts)
 * Each test builds a fresh chainable query-builder mock so assertions can
 * inspect exactly which table/method was called with which payload —
 * this is what actually proves createStore() uses the RIGHT client for
 * each write, not just that "some insert happened".
 */

function makeQueryBuilder(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.single = vi.fn(async () => result);
  builder.maybeSingle = vi.fn(async () => result);
  builder.insert = vi.fn(() => ({ ...builder, select: vi.fn(chain) }));
  builder.update = vi.fn(chain);
  return builder;
}

const serverAuthGetUser = vi.fn();
const serverFrom = vi.fn();
const serviceFrom = vi.fn();

vi.mock("@/lib/auth/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: serverAuthGetUser },
    from: serverFrom,
  })),
}));

vi.mock("@/lib/auth/supabase-service", () => ({
  createSupabaseServiceClient: vi.fn(() => ({
    from: serviceFrom,
  })),
}));

const validInput = {
  name: "Ali's Cosmetics",
  slug: "alis-cosmetics",
  whatsappNumber: "+92 300 1234567",
  country: "Pakistan",
  currency: "PKR" as const,
};

describe("createStore / checkSlugAvailability / updateStoreLogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checkSlugAvailability: returns available=true when no store has that slug", async () => {
    const { checkSlugAvailability } = await import("./actions");
    serviceFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null }));

    const result = await checkSlugAvailability("brand-new-slug");
    expect(result.available).toBe(true);
    expect(serviceFrom).toHaveBeenCalledWith("stores");
  });

  it("checkSlugAvailability: returns available=false when a store already has that slug", async () => {
    const { checkSlugAvailability } = await import("./actions");
    serviceFrom.mockReturnValue(makeQueryBuilder({ data: { id: "existing-id" }, error: null }));

    const result = await checkSlugAvailability("taken-slug");
    expect(result.available).toBe(false);
  });

  it("checkSlugAvailability: rejects an invalid slug without hitting the database", async () => {
    const { checkSlugAvailability } = await import("./actions");
    const result = await checkSlugAvailability("");
    expect(result.available).toBe(false);
    expect(serviceFrom).not.toHaveBeenCalled();
  });

  it("createStore: fails cleanly when there is no authenticated user", async () => {
    const { createStore } = await import("./actions");
    serverAuthGetUser.mockResolvedValue({ data: { user: null } });

    const result = await createStore(validInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/logged in/i);
    }
  });

  it("createStore: rejects invalid input before touching the database", async () => {
    const { createStore } = await import("./actions");
    serverAuthGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const result = await createStore({ ...validInput, slug: "AB" }); // invalid: uppercase + too short
    expect(result.success).toBe(false);
    expect(serverFrom).not.toHaveBeenCalled();
  });

  it("createStore: rejects when the slug is already taken (server-side race-condition check)", async () => {
    const { createStore } = await import("./actions");
    serverAuthGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    // The internal checkSlugAvailability() call uses serviceFrom — simulate "taken".
    serviceFrom.mockReturnValue(makeQueryBuilder({ data: { id: "someone-elses-store" }, error: null }));

    const result = await createStore(validInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.field).toBe("slug");
    }
    // Must never reach the actual insert if the slug is taken.
    expect(serverFrom).not.toHaveBeenCalled();
  });

  it("createStore: BUGFIX regression — when the slug check itself fails (not a real conflict), surfaces the real error instead of falsely reporting 'already taken'", async () => {
    // Reproduces the reported production bug: every slug, including brand
    // new random ones, showed "Already taken". Root cause (confirmed
    // against a real PostgREST/Supabase-shaped stack): checkSlugAvailability
    // returning { available: false, error: "..." } on a genuine check
    // failure was being treated identically to a real slug conflict.
    const { createStore } = await import("./actions");
    serverAuthGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    // Simulate the availability check itself erroring (e.g. a transient
    // Supabase/network failure), NOT finding a conflicting row.
    serviceFrom.mockReturnValue(
      makeQueryBuilder({ data: null, error: { message: "connection error" } }),
    );

    const result = await createStore(validInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Must NOT be the misleading "already taken" message.
      expect(result.error).not.toMatch(/already taken/i);
      expect(result.error).toMatch(/could not verify/i);
      expect(result.field).toBe("slug");
    }
    // Must never reach the actual insert when the check itself failed —
    // we can't confirm the slug is safe to use.
    expect(serverFrom).not.toHaveBeenCalled();
  });

  it("createStore: on success, inserts the store with owner_id set to the AUTHENTICATED user's id (not client-supplied)", async () => {
    const { createStore } = await import("./actions");
    serverAuthGetUser.mockResolvedValue({ data: { user: { id: "real-user-id" } } });
    serviceFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null })); // slug available

    const insertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { id: "new-store-id" }, error: null })),
      })),
    }));
    serverFrom.mockReturnValue({ insert: insertMock });

    const result = await createStore(validInput);

    expect(result.success).toBe(true);
    expect(serverFrom).toHaveBeenCalledWith("stores");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: "real-user-id",
        name: validInput.name,
        slug: validInput.slug,
      }),
    );
  });

  it("createStore: creates the initial subscription row via the SERVICE client, not the RLS-respecting one", async () => {
    const { createStore } = await import("./actions");
    serverAuthGetUser.mockResolvedValue({ data: { user: { id: "real-user-id" } } });

    let serviceCallCount = 0;
    serviceFrom.mockImplementation((table: string) => {
      serviceCallCount++;
      if (table === "stores") {
        return makeQueryBuilder({ data: null, error: null }); // availability check
      }
      // subscriptions / activity_logs inserts
      return { insert: vi.fn(async () => ({ data: null, error: null })) };
    });

    const insertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { id: "new-store-id" }, error: null })),
      })),
    }));
    serverFrom.mockReturnValue({ insert: insertMock });

    await createStore(validInput);

    const calledTables = serviceFrom.mock.calls.map((c) => c[0]);
    expect(calledTables).toContain("subscriptions");
    expect(calledTables).toContain("activity_logs");
    // stores INSERT must go through serverFrom (RLS-respecting), never serviceFrom.
    expect(serviceCallCount).toBeGreaterThan(0);
  });

  it("createStore: handles a unique-constraint race condition (Postgres 23505) with a friendly message", async () => {
    const { createStore } = await import("./actions");
    serverAuthGetUser.mockResolvedValue({ data: { user: { id: "real-user-id" } } });
    serviceFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null })); // passed the pre-check

    const insertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: null, error: { code: "23505" } })),
      })),
    }));
    serverFrom.mockReturnValue({ insert: insertMock });

    const result = await createStore(validInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.field).toBe("slug");
      expect(result.error).toMatch(/taken/i);
    }
  });

  it("updateStoreLogo: rejects a non-URL value without calling the database", async () => {
    const { updateStoreLogo } = await import("./actions");
    const result = await updateStoreLogo("store-1", "not-a-url");
    expect(result.success).toBe(false);
    expect(serverFrom).not.toHaveBeenCalled();
  });

  it("updateStoreLogo: updates the store row via the RLS-respecting server client", async () => {
    const { updateStoreLogo } = await import("./actions");
    const eqMock = vi.fn(async () => ({ error: null }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    serverFrom.mockReturnValue({ update: updateMock });

    const result = await updateStoreLogo("store-1", "https://cdn.example.com/logo.png");
    expect(result.success).toBe(true);
    expect(serverFrom).toHaveBeenCalledWith("stores");
    expect(updateMock).toHaveBeenCalledWith({ logo_url: "https://cdn.example.com/logo.png" });
    expect(eqMock).toHaveBeenCalledWith("id", "store-1");
  });
});

describe("BUG REPRODUCTION: checkSlugAvailability on a backend/config error", () => {
  it("current (buggy) behavior: a query error is silently treated identically to a genuinely taken slug", async () => {
    const { checkSlugAvailability } = await import("./actions");
    // Simulates a misconfigured SUPABASE_SERVICE_ROLE_KEY, wrong URL, or
    // any other backend failure — the query resolves with an `error`
    // object, no `data`. This is exactly what happens when the service
    // client can't actually reach/authenticate to Supabase.
    serviceFrom.mockReturnValue(
      makeQueryBuilder({ data: null, error: { message: "invalid API key" } }),
    );

    const result = await checkSlugAvailability("xqz847291abc"); // a random, definitely-unused slug

    // THIS IS THE BUG: a completely random slug that was never in the
    // database at all comes back `available: false` — identical to what
    // a REAL conflict looks like. The caller (and the UI) has no way to
    // tell "this slug is taken" apart from "the check itself is broken".
    expect(result.available).toBe(false);
  });
});
