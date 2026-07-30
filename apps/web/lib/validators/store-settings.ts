import { z } from "zod";
import {
  storeNameSchema,
  whatsappNumberSchema,
  countrySchema,
  currencySchema,
  descriptionSchema,
} from "./store-setup";

// Reused directly from the Store Setup Wizard's validators (Phase 3a) —
// name/WhatsApp/country/currency/description follow the exact same rules
// here as at store creation, so they're imported rather than re-defined.
// Slug is intentionally NOT editable here (changing a live store's URL
// breaks every link a seller has already shared) and business category
// isn't part of the Phase 3c feature list — neither is duplicated or
// reused in this file.

// Meta/Facebook Pixel ID: verified format — 15 to 16 numeric digits only,
// no letters, dashes, or "act_" prefix (that's a different ID, an ad
// account ID, not the Pixel ID).
export const facebookPixelIdSchema = z
  .string()
  .regex(/^\d{15,16}$/, "Meta Pixel ID should be 15–16 digits, numbers only")
  .optional()
  .or(z.literal(""));

// TikTok Pixel ID (Pixel Code): verified format — uppercase letters and
// numbers only, no special characters or spaces. Length isn't a published
// fixed spec, so this is a lenient reasonable range rather than an exact
// match, same "best-effort format check" approach as the WhatsApp number
// pattern in store-setup.ts.
export const tiktokPixelIdSchema = z
  .string()
  .regex(/^[A-Z0-9]{10,32}$/, "TikTok Pixel ID should be uppercase letters and numbers only")
  .optional()
  .or(z.literal(""));

export const storeSettingsSchema = z.object({
  name: storeNameSchema,
  description: descriptionSchema,
  whatsappNumber: whatsappNumberSchema,
  country: countrySchema,
  currency: currencySchema,
  facebookPixelId: facebookPixelIdSchema,
  tiktokPixelId: tiktokPixelIdSchema,
});

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
