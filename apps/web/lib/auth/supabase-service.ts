import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — BYPASSES RLS entirely. Use ONLY in trusted
 * server-only contexts where the operation is authorized by application
 * logic instead of a user's own session:
 *   - public checkout order creation (Phase 6) — the customer has no
 *     Supabase session at all, so RLS can't apply; the API route itself
 *     must validate the store is active before inserting
 *   - courier/shipping webhooks (future, §17) — no user session on an
 *     inbound webhook
 *   - scheduled jobs (trial expiry, low-stock alerts, analytics refresh)
 *
 * NEVER import this file into any "use client" component or any code path
 * reachable from the browser. NEVER log or return this key. If a route
 * handler uses this client, it is personally responsible for enforcing
 * whatever authorization the bypassed RLS would otherwise have provided.
 */
export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
