import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["node_modules", "tests/rls/**", "tests/e2e/**"], // RLS suite runs via run_rls_tests.sh, not vitest
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
