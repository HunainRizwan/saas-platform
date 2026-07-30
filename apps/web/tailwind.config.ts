import type { Config } from "tailwindcss";

// Design tokens intentionally minimal at Phase 2 — full visual system arrives
// with the actual dashboard/storefront UI work (Phase 3+). This config only
// needs to exist now so the auth screens render with sane defaults.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f7ff",
          500: "#3b5bfd",
          600: "#2f47cc",
          900: "#141b3d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
