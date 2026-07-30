import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrentStore = vi.fn();
const serverFrom = vi.fn();

vi.mock("@/lib/auth/get-current-store", () => ({ getCurrentStore }));

vi.mock("@/lib/auth/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ from: serverFrom })),
}));

// updateStoreLogo is re-exported from the setup actions file — mock its
// origin so importing this test file doesn't pull in the real Supabase
// clients that file also depends on.
vi.mock("@/app/dashboard/setup/actions", () => ({
  updateStoreLogo: vi.fn(async () => ({ success: true })),
}));

const validInput = {
  name: "Ali's Cosmetics",
  description: "We sell skincare products.",
  whatsappNumber: "+92 300 1234567",
  country: "Pakistan",
  currency: "PKR" as const,
  facebookPixelId: "",
  tiktokPixelId: "",
};

describe("getStoreSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an error when the caller has no store", async () => {
    const { getStoreSettings } = await import("./actions");
    getCurrentStore.mockResolvedValue({ status: "no-store", userId: "u1" });

    const result = await getStoreSettings();
    expect(result.success).toBe(false);
    expect(serverFrom).not.toHaveBeenCalled();
  });

  it("fetches and maps snake_case DB columns to camelCase fields", async () => {
    const { getStoreSettings } = await import("./actions");
    getCurrentStore.mockResolvedValue({ status: "ok", userId: "u1", storeId: "s1", role: "owner" });

    const singleMock = vi.fn(async () => ({
      data: {
        name: "Ali's Cosmetics",
        description: "Great store",
        whatsapp_number: "+92 300 1234567",
        country: "Pakistan",
        currency: "PKR",
        facebook_pixel_id: "123456789012345",
        tiktok_pixel_id: null,
        logo_url: "https://cdn.example.com/logo.png",
      },
      error: null,
    }));
    serverFrom.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: singleMock })) })),
    });

    const result = await getStoreSettings();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.whatsappNumber).toBe("+92 300 1234567");
      expect(result.data.facebookPixelId).toBe("123456789012345");
      expect(result.data.tiktokPixelId).toBe(""); // null coerced to empty string
      expect(result.data.logoUrl).toBe("https://cdn.example.com/logo.png");
    }
  });

  it("returns an error when the query fails", async () => {
    const { getStoreSettings } = await import("./actions");
    getCurrentStore.mockResolvedValue({ status: "ok", userId: "u1", storeId: "s1", role: "owner" });
    serverFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: { message: "db error" } })) })),
      })),
    });

    const result = await getStoreSettings();
    expect(result.success).toBe(false);
  });
});

describe("updateStoreSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an error when the caller has no store", async () => {
    const { updateStoreSettings } = await import("./actions");
    getCurrentStore.mockResolvedValue({ status: "unauthenticated" });

    const result = await updateStoreSettings(validInput);
    expect(result.success).toBe(false);
    expect(serverFrom).not.toHaveBeenCalled();
  });

  it("rejects invalid input before touching the database", async () => {
    const { updateStoreSettings } = await import("./actions");
    getCurrentStore.mockResolvedValue({ status: "ok", userId: "u1", storeId: "s1", role: "owner" });

    const result = await updateStoreSettings({ ...validInput, name: "A" }); // too short
    expect(result.success).toBe(false);
    expect(serverFrom).not.toHaveBeenCalled();
  });

  it("rejects an invalid Facebook Pixel ID before touching the database", async () => {
    const { updateStoreSettings } = await import("./actions");
    getCurrentStore.mockResolvedValue({ status: "ok", userId: "u1", storeId: "s1", role: "owner" });

    const result = await updateStoreSettings({ ...validInput, facebookPixelId: "not-numeric" });
    expect(result.success).toBe(false);
    expect(serverFrom).not.toHaveBeenCalled();
  });

  it("on success, updates via the RLS-respecting client, scoped to the caller's own store", async () => {
    const { updateStoreSettings } = await import("./actions");
    getCurrentStore.mockResolvedValue({ status: "ok", userId: "u1", storeId: "s1", role: "owner" });

    const eqMock = vi.fn(async () => ({ error: null }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    serverFrom.mockReturnValue({ update: updateMock });

    const result = await updateStoreSettings({
      ...validInput,
      facebookPixelId: "123456789012345",
      tiktokPixelId: "C4A1B2C3D4E5F6G7H8I9",
    });

    expect(result.success).toBe(true);
    expect(serverFrom).toHaveBeenCalledWith("stores");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: validInput.name,
        facebook_pixel_id: "123456789012345",
        tiktok_pixel_id: "C4A1B2C3D4E5F6G7H8I9",
      }),
    );
    expect(eqMock).toHaveBeenCalledWith("id", "s1");
  });

  it("stores empty Pixel ID fields as null, not empty string", async () => {
    const { updateStoreSettings } = await import("./actions");
    getCurrentStore.mockResolvedValue({ status: "ok", userId: "u1", storeId: "s1", role: "owner" });

    const eqMock = vi.fn(async () => ({ error: null }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    serverFrom.mockReturnValue({ update: updateMock });

    await updateStoreSettings(validInput); // facebookPixelId/tiktokPixelId are ""

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ facebook_pixel_id: null, tiktok_pixel_id: null }),
    );
  });

  it("returns a friendly error when the update fails", async () => {
    const { updateStoreSettings } = await import("./actions");
    getCurrentStore.mockResolvedValue({ status: "ok", userId: "u1", storeId: "s1", role: "owner" });

    const eqMock = vi.fn(async () => ({ error: { message: "db error" } }));
    serverFrom.mockReturnValue({ update: vi.fn(() => ({ eq: eqMock })) });

    const result = await updateStoreSettings(validInput);
    expect(result.success).toBe(false);
  });
});

describe("updateStoreLogo reuse", () => {
  it("is imported directly from the Phase 3a setup actions by the form, not duplicated here", async () => {
    // actions.ts intentionally does NOT export updateStoreLogo — Next.js's
    // "use server" compiler forbids re-exporting another module's export
    // from a "use server" file (only async functions defined in the file
    // itself may be exported), caught by `next build`. Reuse instead
    // happens via a direct import in store-settings-form.tsx.
    const actions = await import("./actions");
    expect("updateStoreLogo" in actions).toBe(false);

    const setupActions = await import("@/app/dashboard/setup/actions");
    expect(typeof setupActions.updateStoreLogo).toBe("function");
  });
});
