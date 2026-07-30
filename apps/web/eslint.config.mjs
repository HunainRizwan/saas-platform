import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // next/typescript brings in @typescript-eslint's recommended rules
  // (including no-unused-vars) already wired to the plugin correctly —
  // redeclaring the rule manually without the plugin registered was the
  // bug caught by actually running eslint (see CHANGELOG.md).
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "tests/rls/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
