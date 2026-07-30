/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Supabase Storage public bucket host will be added here once the
    // storage bucket is provisioned (Phase 2 Step 2 / Phase 4 media work).
    remotePatterns: [],
  },
  async headers() {
    // Baseline security headers per reviewed ARCHITECTURE.md §10 (A05).
    // CSP is intentionally not finalized yet — it needs to know the exact
    // set of external origins (Supabase project URL, image CDN) before it
    // can be tightened without breaking the app; a permissive-but-present
    // header set ships now, hardened in Phase 13.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
