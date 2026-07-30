"use server";

import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { getCurrentStore } from "@/lib/auth/get-current-store";
import { storeSettingsSchema, type StoreSettingsInput } from "@/lib/validators/store-settings";

// NOTE: `updateStoreLogo` is reused directly from the Store Setup Wizard
// (Phase 3a, app/dashboard/setup/actions.ts) rather than duplicated —
// but it's imported straight from there by the form component
// (store-settings-form.tsx), NOT re-exported from this file. Next.js's
// "use server" compiler only allows a file marked "use server" to export
// async functions defined in that same file — re-exporting another
// module's export (`export { updateStoreLogo } from "..."`) fails at
// build time ("Only async functions are allowed to be exported in a
// 'use server' file"), caught by actually running `next build`.

export type StoreSettingsData = StoreSettingsInput & {
  logoUrl: string | null;
};

export type GetStoreSettingsResult =
  | { success: true; storeId: string; data: StoreSettingsData }
  | { success: false; error: string };

export type UpdateStoreSettingsResult = { success: true } | { success: false; error: string };

/**
 * Fetches the current store's editable settings for the authenticated
 * owner/staff member. Uses getCurrentStore() (the same store-resolution
 * helper every dashboard route uses) rather than re-implementing
 * "which store does this user own" logic here — one source of truth.
 */
export async function getStoreSettings(): Promise<GetStoreSettingsResult> {
  const result = await getCurrentStore();

  if (result.status !== "ok") {
    return { success: false, error: "No store found for this account" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stores")
    .select("name, description, whatsapp_number, country, currency, facebook_pixel_id, tiktok_pixel_id, logo_url")
    .eq("id", result.storeId)
    .single();

  if (error || !data) {
    return { success: false, error: "Could not load your store settings" };
  }

  return {
    success: true,
    storeId: result.storeId,
    data: {
      name: data.name,
      description: data.description ?? "",
      whatsappNumber: data.whatsapp_number ?? "",
      country: data.country,
      currency: data.currency,
      facebookPixelId: data.facebook_pixel_id ?? "",
      tiktokPixelId: data.tiktok_pixel_id ?? "",
      logoUrl: data.logo_url,
    },
  };
}

/**
 * Updates the store row for the authenticated owner/staff member. Uses the
 * RLS-respecting server client only — `stores_update_member` (reviewed
 * ARCHITECTURE.md / policies/02_stores.sql) already scopes this update to
 * stores the caller is a member of, the same trust tier createStore() uses
 * for its own INSERT (Phase 3a). No service-role client is needed here:
 * unlike the initial `subscriptions` row at store creation, nothing in
 * this update touches a table RLS restricts to super_admin.
 */
export async function updateStoreSettings(
  input: StoreSettingsInput,
): Promise<UpdateStoreSettingsResult> {
  const result = await getCurrentStore();

  if (result.status !== "ok") {
    return { success: false, error: "No store found for this account" };
  }

  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("stores")
    .update({
      name: data.name,
      description: data.description || null,
      whatsapp_number: data.whatsappNumber,
      country: data.country,
      currency: data.currency,
      facebook_pixel_id: data.facebookPixelId || null,
      tiktok_pixel_id: data.tiktokPixelId || null,
    })
    .eq("id", result.storeId);

  if (error) {
    return { success: false, error: "Could not save your changes, please try again" };
  }

  return { success: true };
}
