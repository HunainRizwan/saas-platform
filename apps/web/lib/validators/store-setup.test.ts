import { describe, it, expect } from "vitest";
import { storeSetupSchema, RESERVED_SLUGS } from "@/lib/validators/store-setup";

const validBase = {
  name: "Ali's Cosmetics",
  slug: "alis-cosmetics",
  whatsappNumber: "+92 300 1234567",
  country: "Pakistan",
  currency: "PKR" as const,
};

describe("storeSetupSchema", () => {
  it("accepts a fully valid payload with only required fields", () => {
    const result = storeSetupSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts a valid payload with all optional fields filled in", () => {
    const result = storeSetupSchema.safeParse({
      ...validBase,
      logoUrl: "https://example.com/logo.png",
      description: "We sell skincare products.",
      businessCategory: "Cosmetics",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a store name shorter than 2 characters", () => {
    const result = storeSetupSchema.safeParse({ ...validBase, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects a slug with uppercase letters", () => {
    const result = storeSetupSchema.safeParse({ ...validBase, slug: "Alis-Cosmetics" });
    expect(result.success).toBe(false);
  });

  it("rejects a slug with spaces or special characters", () => {
    const result = storeSetupSchema.safeParse({ ...validBase, slug: "ali's cosmetics!" });
    expect(result.success).toBe(false);
  });

  it("rejects a slug starting or ending with a hyphen", () => {
    expect(storeSetupSchema.safeParse({ ...validBase, slug: "-alis" }).success).toBe(false);
    expect(storeSetupSchema.safeParse({ ...validBase, slug: "alis-" }).success).toBe(false);
  });

  it("rejects a slug shorter than 3 characters", () => {
    const result = storeSetupSchema.safeParse({ ...validBase, slug: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects every reserved slug", () => {
    for (const reserved of RESERVED_SLUGS) {
      const result = storeSetupSchema.safeParse({ ...validBase, slug: reserved });
      expect(result.success, `expected "${reserved}" to be rejected`).toBe(false);
    }
  });

  it("rejects a WhatsApp number with letters", () => {
    const result = storeSetupSchema.safeParse({ ...validBase, whatsappNumber: "not-a-number" });
    expect(result.success).toBe(false);
  });

  it("rejects a WhatsApp number that's too short", () => {
    const result = storeSetupSchema.safeParse({ ...validBase, whatsappNumber: "123" });
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported currency", () => {
    const result = storeSetupSchema.safeParse({ ...validBase, currency: "EUR" });
    expect(result.success).toBe(false);
  });

  it("rejects a description over 500 characters", () => {
    const result = storeSetupSchema.safeParse({ ...validBase, description: "x".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("allows description and businessCategory to be omitted entirely", () => {
    const rest = { ...validBase } as Record<string, unknown>;
    delete rest.description;
    delete rest.businessCategory;
    const result = storeSetupSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });
});
