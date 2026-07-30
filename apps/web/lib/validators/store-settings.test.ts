import { describe, it, expect } from "vitest";
import { storeSettingsSchema, facebookPixelIdSchema, tiktokPixelIdSchema } from "@/lib/validators/store-settings";

const validBase = {
  name: "Ali's Cosmetics",
  description: "We sell skincare products.",
  whatsappNumber: "+92 300 1234567",
  country: "Pakistan",
  currency: "PKR" as const,
};

describe("storeSettingsSchema", () => {
  it("accepts a fully valid payload with no Pixel IDs", () => {
    expect(storeSettingsSchema.safeParse(validBase).success).toBe(true);
  });

  it("accepts a valid payload with both Pixel IDs", () => {
    const result = storeSettingsSchema.safeParse({
      ...validBase,
      facebookPixelId: "123456789012345",
      tiktokPixelId: "C4A1B2C3D4E5F6G7H8I9",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty-string Pixel IDs (both optional)", () => {
    const result = storeSettingsSchema.safeParse({
      ...validBase,
      facebookPixelId: "",
      tiktokPixelId: "",
    });
    expect(result.success).toBe(true);
  });

  it("does NOT include a slug field — slug is not editable in settings", () => {
    // storeSettingsSchema deliberately has no slug key at all, unlike
    // storeSetupSchema — confirms it wasn't accidentally reused wholesale.
    expect("slug" in storeSettingsSchema.shape).toBe(false);
  });

  it("does NOT include a businessCategory field — outside Phase 3c's feature list", () => {
    expect("businessCategory" in storeSettingsSchema.shape).toBe(false);
  });

  it("rejects a store name shorter than 2 characters (reused rule from store-setup)", () => {
    expect(storeSettingsSchema.safeParse({ ...validBase, name: "A" }).success).toBe(false);
  });

  it("rejects an unsupported currency (reused rule from store-setup)", () => {
    expect(storeSettingsSchema.safeParse({ ...validBase, currency: "EUR" }).success).toBe(false);
  });
});

describe("facebookPixelIdSchema", () => {
  it("accepts a valid 15-digit ID", () => {
    expect(facebookPixelIdSchema.safeParse("123456789012345").success).toBe(true);
  });

  it("accepts a valid 16-digit ID", () => {
    expect(facebookPixelIdSchema.safeParse("1234567890123456").success).toBe(true);
  });

  it("rejects an ID with letters", () => {
    expect(facebookPixelIdSchema.safeParse("12345678901234a").success).toBe(false);
  });

  it("rejects an ID that's too short", () => {
    expect(facebookPixelIdSchema.safeParse("123").success).toBe(false);
  });

  it("rejects an ID with the act_ ad-account prefix (common mistake)", () => {
    expect(facebookPixelIdSchema.safeParse("act_123456789012345").success).toBe(false);
  });

  it("rejects an ID with dashes", () => {
    expect(facebookPixelIdSchema.safeParse("123-456-789-012-345").success).toBe(false);
  });

  it("accepts an empty string (optional field)", () => {
    expect(facebookPixelIdSchema.safeParse("").success).toBe(true);
  });
});

describe("tiktokPixelIdSchema", () => {
  it("accepts a valid uppercase alphanumeric ID", () => {
    expect(tiktokPixelIdSchema.safeParse("C4A1B2C3D4E5F6G7H8I9").success).toBe(true);
  });

  it("rejects a lowercase ID", () => {
    expect(tiktokPixelIdSchema.safeParse("c4a1b2c3d4e5f6g7h8i9").success).toBe(false);
  });

  it("rejects an ID with special characters or spaces", () => {
    expect(tiktokPixelIdSchema.safeParse("C4A1-B2C3 D4E5").success).toBe(false);
  });

  it("rejects an ID that's too short", () => {
    expect(tiktokPixelIdSchema.safeParse("C4A1").success).toBe(false);
  });

  it("accepts an empty string (optional field)", () => {
    expect(tiktokPixelIdSchema.safeParse("").success).toBe(true);
  });
});
