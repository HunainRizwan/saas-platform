import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "@saas-platform/database";

/**
 * Drizzle client for direct SQL-shaped queries (analytics rollups in
 * Phase 10, background jobs, anything the Supabase query builder is a poor
 * fit for). Most Phase 2–9 CRUD goes through the Supabase server client
 * (lib/auth/supabase-server.ts) instead, since that client's requests
 * already carry the user's session cookie and Supabase's own layer wires
 * it into `auth.uid()` for RLS automatically.
 *
 * A raw Postgres connection via DATABASE_URL does NOT get that for free —
 * Supabase's PostgREST layer is what normally sets `request.jwt.claims`
 * per request. `withUserContext` recreates that contract for direct
 * Drizzle connections: it wraps a query in a transaction and sets
 * `request.jwt.claims` (SET LOCAL — scoped to the transaction only, so it
 * can never leak to another request sharing a pooled connection) so that
 * `auth.uid()` — which every RLS policy in packages/database/policies/
 * calls via is_store_member()/is_super_admin() — resolves correctly.
 *
 * This is the precise, easy-to-get-wrong transaction control that the
 * reviewed architecture's Drizzle-over-Prisma decision (§16) was made for.
 */

const client = postgres(process.env.DATABASE_URL!, { max: 10 });
export const db = drizzle(client, { schema });

export async function withUserContext<T>(
  userId: string,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const claims = JSON.stringify({ sub: userId, role: "authenticated" });
    await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
    await tx.execute(sql`set local role authenticated`);
    return fn(tx as unknown as typeof db);
  });
}

/**
 * Trusted-server-only escape hatch — runs WITHOUT RLS, using whatever role
 * DATABASE_URL connects as (should be a role with BYPASSRLS in production,
 * e.g. the same trust tier as the Supabase service-role key). Same rules
 * as supabase-service.ts: never reachable from client code, caller is
 * responsible for its own authorization.
 */
export async function withServiceContext<T>(fn: (tx: typeof db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => fn(tx as unknown as typeof db));
}
