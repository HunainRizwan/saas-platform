import { z } from "zod";

// Shared between the client-side wizard form and the server action's
// re-validation — same "never trust client validation alone" rule as
// lib/validators/auth.ts.

// Slug rules: lowercase letters, numbers, hyphens only, 3–50 chars, can't
// start/end with a hyphen. This is what appears in store.com/{slug} and
// in the public tracking URL scheme, so it needs to be URL-safe and can't
// collide with reserved app routes (checked separately server-side).
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const RESERVED_SLUGS = new Set([
  "dashboard",
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "api",
  "admin",
  "track",
  "settings",
  "products",
  "orders",
  "customers",
  "analytics",
  "inventory",
]);

// Currencies supported at MVP — PKR is the default and, realistically,
// the only one most beta sellers need, but the field exists so this isn't
// a breaking change to widen later.
export const SUPPORTED_CURRENCIES = ["PKR", "USD"] as const;

// Countries supported at MVP — same reasoning as currencies above. Shared
// by both the Store Setup Wizard (Phase 3a) and Store Settings (Phase 3c)
// so the two forms' country dropdowns can never silently drift apart.
export const SUPPORTED_COUNTRIES = ["Pakistan"] as const;

// Free-form for MVP rather than a rigid enum — beta feedback will tell us
// the real category taxonomy sellers want; locking it down now risks
// guessing wrong (same reasoning as the Beta MVP Scope decision).
export const BUSINESS_CATEGORY_SUGGESTIONS = [
  "Clothing",
  "Cosmetics",
  "Home & Living",
  "Grocery",
  "Mobiles & Electronics",
  "Shoes",
  "Boutique",
  "Other",
] as const;

export const storeNameSchema = z
  .string()
  .min(2, "Store name must be at least 2 characters")
  .max(100, "Store name is too long");

export const slugSchema = z
  .string()
  .min(3, "Store link must be at least 3 characters")
  .max(50, "Store link is too long")
  .regex(slugPattern, "Use only lowercase letters, numbers, and hyphens")
  .refine((s) => !RESERVED_SLUGS.has(s), "This link is reserved, please choose another");

export const whatsappNumberSchema = z
  .string()
  .min(10, "Enter a valid WhatsApp number")
  .max(20, "Enter a valid WhatsApp number")
  .regex(/^[0-9+\-\s]+$/, "Numbers, +, - and spaces only");

export const countrySchema = z.string().min(2, "Select a country").max(100);

export const currencySchema = z.enum(SUPPORTED_CURRENCIES);

export const logoUrlSchema = z.string().url().optional().or(z.literal(""));

export const descriptionSchema = z
  .string()
  .max(500, "Keep it under 500 characters")
  .optional()
  .or(z.literal(""));

export const businessCategorySchema = z.string().max(50).optional().or(z.literal(""));

// Reused (not duplicated) by lib/validators/store-settings.ts (Phase 3c) —
// the field-level schemas above are the single source of truth for these
// rules; storeSetupSchema just composes them for the setup wizard's shape.
export const storeSetupSchema = z.object({
  name: storeNameSchema,
  slug: slugSchema,
  whatsappNumber: whatsappNumberSchema,
  country: countrySchema,
  currency: currencySchema,
  logoUrl: logoUrlSchema,
  description: descriptionSchema,
  businessCategory: businessCategorySchema,
});

export type StoreSetupInput = z.infer<typeof storeSetupSchema>;

export const slugCheckSchema = z.object({
  slug: z.string().min(1),
});
