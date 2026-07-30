import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs on every request. Two jobs:
 *   1. Refresh the Supabase session cookie if it's close to expiry — without
 *      this, users get silently logged out mid-session because Server
 *      Components can't write cookies (see supabase-server.ts's comment).
 *   2. Gate `(dashboard)` and `(admin)` routes: redirect unauthenticated
 *      visitors to /login, and non-super_admins away from /admin/*.
 *
 * Public routes — (storefront), (tracking), (auth) itself — are NOT gated
 * here; they're intentionally open per the reviewed architecture's public
 * API design (§9).
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isDashboardRoute = DASHBOARD_ROUTE_PREFIXES.some((p) => path.startsWith(p));
  const isAdminRoute = path.startsWith("/admin");

  if ((isDashboardRoute || isAdminRoute) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && user) {
    // super_admin check happens against our own `users` table, not a
    // Supabase Auth claim — role isn't something Supabase Auth tracks for
    // us, it's an application concept (users.role, reviewed schema §5).
    const { data: appUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (appUser?.role !== "super_admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

// These correspond to the (dashboard) route group's actual paths — Next.js
// route groups `(dashboard)` don't appear in the URL, so this list is the
// real top-level segments inside that group.
const DASHBOARD_ROUTE_PREFIXES = [
  "/dashboard",
  "/products",
  "/orders",
  "/customers",
  "/analytics",
  "/inventory",
  "/settings",
];

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - public storefront/tracking assets
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
