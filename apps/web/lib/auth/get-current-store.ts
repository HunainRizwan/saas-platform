import { createSupabaseServerClient } from "./supabase-server";

export type CurrentStoreResult =
  | { status: "unauthenticated" }
  | { status: "no-store"; userId: string }
  | { status: "ok"; userId: string; storeId: string; role: "owner" | "staff"; storeRole?: string };

/**
 * Resolves the currently authenticated Supabase session to the store they
 * own or are staff on. This is the single place that answers "which store
 * is this request for" — every dashboard route/API route should call this
 * rather than re-deriving store_id itself, so there's exactly one code path
 * to audit for correctness (reviewed ARCHITECTURE.md §9's auth flow).
 *
 * NOTE: a seller can currently only own one store (schema allows multiple
 * via store_staff for future team features, but the v1 product scope is
 * one store per seller) — if a user is both an owner and staff elsewhere,
 * ownership wins. Multi-store-per-owner is not a Phase 2 concern.
 */
export async function getCurrentStore(): Promise<CurrentStoreResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "unauthenticated" };
  }

  // RLS on `stores` (policies/02_stores.sql) already restricts this query
  // to rows the user owns or staffs — no need to filter by owner_id here
  // explicitly, but we do anyway for clarity and defense-in-depth.
  const { data: ownedStore } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (ownedStore) {
    return { status: "ok", userId: user.id, storeId: ownedStore.id, role: "owner" };
  }

  const { data: staffRow } = await supabase
    .from("store_staff")
    .select("store_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (staffRow) {
    return {
      status: "ok",
      userId: user.id,
      storeId: staffRow.store_id,
      role: "staff",
      storeRole: staffRow.role,
    };
  }

  return { status: "no-store", userId: user.id };
}
