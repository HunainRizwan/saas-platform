import "dotenv/config";
import type { Config } from "drizzle-kit";

// DATABASE_URL is loaded from packages/database/.env (see .env.example) via
// the `dotenv/config` import above — point that file at dev/staging/prod by
// swapping its contents. Never hardcode a connection string here.
// NOTE: this only affects `drizzle-kit generate`/`drizzle-kit studio`, which
// read this config file directly. The actual `db:migrate` command uses
// scripts/migrate.ts instead (see that file's header comment for why).
export default {
  schema: "./schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  strict: true,
  verbose: true,
} satisfies Config;
