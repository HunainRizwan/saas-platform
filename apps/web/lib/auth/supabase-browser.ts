import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase client — used inside "use client" components (auth
 * forms, cart state, anything running in the browser). Uses the public
 * anon key only; RLS is what keeps this safe to expose, per the reviewed
 * architecture's tenant-isolation strategy.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
