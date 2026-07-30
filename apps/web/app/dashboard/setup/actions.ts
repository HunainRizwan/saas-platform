"use server";

import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { createSupabaseServiceClient } from "@/lib/auth/supabase-service";
import { storeSetupSchema, slugCheckSchema, type StoreSetupInput } from "@/lib/validators/store-setup";

const TRIAL_LENGTH_DAYS = 30;

export type CreateStoreResult =
  | { success: true; storeId: string }
  | { success: false; error: string; field?: keyof StoreSetupInput };

/**
 * Slug availability check — needs to see across ALL stores, not just the
 * current user's own (which is all RLS would show an ordinary authenticated
 * session, since no anon/cross-tenant SELECT policy exists on `stores` yet
 * — that's deliberately deferred to Phase 5's public storefront work, see
 * policies/02_stores.sql). A slug-uniqueness check is exactly the kind of
 * global, non-sensitive read RLS structurally can't answer for a single
 * tenant's session, so this uses the service-role client. It returns only
 * a boolean, never other stores' data — no information beyond "taken or
 * not" is exposed.
 */
export async function checkSlugAvailability(
  rawSlug: string,
): Promise<{ available: boolean; error?: string }> {
  const parsed = slugCheckSchema.safeParse({ slug: rawSlug });
  if (!parsed.success) {
    return { available: false, error: "Invalid slug format" };
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", parsed.data.slug)
      .limit(1)
      .maybeSingle();

    if (error) {
      // Production-appropriate logging: the error itself (Postgres/PostgREST
      // error codes and messages are safe to log — no user data, no
      // secrets), not a verbose dump of every intermediate step. This is
      // what would have shown the "permission denied for table stores"
      // (42501) root cause immediately, without needing the temporary
      // diagnostic instrumentation this replaced.
      console.error("checkSlugAvailability: Supabase query failed", error);
      return { available: false, error: "Could not check availability, try again" };
    }

    return { available: !data };
  } catch (caughtException) {
    console.error("checkSlugAvailability: unexpected exception", caughtException);
    return { available: false, error: "Could not check availability, try again" };
  }
}

/**
 * Creates the seller's first (and, for MVP, only) store. Two writes happen
 * here under two different trust tiers, deliberately:
 *   1. The `stores` INSERT goes through the RLS-respecting server client —
 *      `owner_id` is set to the authenticated user's own id, and the
 *      `stores_insert_owner` policy (policies/02_stores.sql) requires
 *      exactly that match. Using the RLS-respecting client here (rather
 *      than the service client) is defense-in-depth: even if this
 *      function had a bug that let someone else's id through, RLS would
 *      still reject it.
 *   2. The initial `subscriptions` row uses the service-role client,
 *      because policies/06_operations_and_audit.sql intentionally
 *      restricts all subscription writes to super_admin — this is the
 *      one legitimate, well-defined place a trusted server action creates
 *      that row on a seller's behalf (documented in that policy file's
 *      own comments).
 */
export async function createStore(input: StoreSetupInput): Promise<CreateStoreResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to create a store" };
  }

  const parsed = storeSetupSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid input",
      field: firstIssue?.path[0] as keyof StoreSetupInput | undefined,
    };
  }
  const data = parsed.data;

  // Defense-in-depth: re-check slug availability server-side even though
  // the client already checked it live — closes the race-condition window
  // between the client's check and this submit, and protects against a
  // tampered client request that skipped the check entirely.
  //
  // BUGFIX: this used to only destructure `available` and treat any falsy
  // value as "taken", which meant a genuine check failure (e.g. the
  // "permission denied for table stores" bug fixed by migration
  // 0004_grant_api_roles.sql) blocked store creation with a false "already
  // taken" message instead of the real error.
  const { available, error: slugCheckError } = await checkSlugAvailability(data.slug);
  if (slugCheckError) {
    return {
      success: false,
      error: "Could not verify your store link right now, please try again",
      field: "slug",
    };
  }
  if (!available) {
    return { success: false, error: "This store link is already taken", field: "slug" };
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_LENGTH_DAYS);

  const { data: store, error: insertError } = await supabase
    .from("stores")
    .insert({
      owner_id: user.id,
      name: data.name,
      slug: data.slug,
      whatsapp_number: data.whatsappNumber,
      country: data.country,
      currency: data.currency,
      description: data.description || null,
      business_category: data.businessCategory || null,
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("createStore: insert failed", insertError);
    // Postgres unique_violation — the slug was taken between our check
    // above and this insert (a real, if narrow, race window).
    if (insertError.code === "23505") {
      return { success: false, error: "This store link was just taken, try another", field: "slug" };
    }
    return { success: false, error: "Could not create your store, please try again" };
  }

  // Trusted server-only writes — see function doc comment above for why
  // these specifically require the service-role client.
  const serviceClient = createSupabaseServiceClient();

  const { error: subscriptionError } = await serviceClient.from("subscriptions").insert({
    store_id: store.id,
    plan: "trial",
    status: "active",
    starts_at: new Date().toISOString(),
    ends_at: trialEndsAt.toISOString(),
  });
  if (subscriptionError) {
    // Non-fatal: the store itself was created successfully. Logged so it
    // can be backfilled, but not surfaced as a failure to the seller.
    console.error("createStore: initial subscription row failed to create", subscriptionError);
  }

  const { error: activityLogError } = await serviceClient.from("activity_logs").insert({
    store_id: store.id,
    actor_user_id: user.id,
    actor_role: "seller",
    action: "store.create",
    entity_type: "store",
    entity_id: store.id,
  });
  if (activityLogError) {
    console.error("createStore: activity log entry failed to write", activityLogError);
  }

  return { success: true, storeId: store.id };
}

/**
 * Second step of logo upload: the client uploads the file directly to
 * Supabase Storage (browser client, under storage RLS —
 * policies/08_storage.sql) once it has a real storeId to path under, then
 * calls this to persist the resulting URL on the store row. Goes through
 * the RLS-respecting server client — `stores_update_member` already allows
 * an owner to update their own store, no service-role needed here.
 */
export async function updateStoreLogo(
  storeId: string,
  logoUrl: string,
): Promise<{ success: boolean; error?: string }> {
  if (!logoUrl || !logoUrl.startsWith("http")) {
    return { success: false, error: "Invalid logo URL" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("stores").update({ logo_url: logoUrl }).eq("id", storeId);

  if (error) {
    console.error("updateStoreLogo: update failed", error);
    return { success: false, error: "Could not save your logo, you can add it later in settings" };
  }

  return { success: true };
}
