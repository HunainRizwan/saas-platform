import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client — used in Server Components, Server Actions,
 * and Route Handlers. Reads/writes the session via Next.js's cookie store,
 * which is what lets `auth.uid()` resolve correctly inside RLS policies for
 * requests made through this client (the JWT travels via cookie, Supabase's
 * Postgres wrapper verifies it and exposes the claims to policies).
 *
 * This client uses the ANON key and respects RLS — it is what "seller acting
 * as themselves" requests should go through. For trusted server-only
 * operations that must bypass RLS (checkout order creation, webhook
 * handlers, admin actions), use `createSupabaseServiceClient()` instead
 * (lib/auth/supabase-service.ts) — never expose the service role key to
 * anything client-reachable.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component (not a Route Handler/Server
            // Action) — Next.js disallows setting cookies here. The
            // middleware (middleware.ts) is responsible for refreshing the
            // session in that case, so this is safe to ignore.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // See note above.
          }
        },
      },
    },
  );
}
