import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import postgres from "postgres";

/**
 * ROOT CAUSE THIS FILE FIXES (found via direct evidence, not assumption):
 *
 * `packages/database/package.json`'s `db:migrate` script ran
 * `drizzle-kit migrate`, which decides what to apply by reading
 * `migrations/meta/_journal.json` — NOT by scanning the migrations
 * folder. That journal was missing entries for TWO real migration files
 * that exist on disk:
 *   - 0001_auth_sync.sql (hand-written, never run through `drizzle-kit
 *     generate`, so it was never added to the journal at all)
 *   - 0004_grant_api_roles.sql (created directly, same gap)
 * `drizzle-kit migrate` would therefore silently never apply either file,
 * even with a correctly configured DATABASE_URL — confirmed by diffing
 * the journal against `ls migrations/*.sql`.
 *
 * Separately, nothing in this package ever loaded environment variables
 * from a .env file — `drizzle.config.ts` reads `process.env.DATABASE_URL`
 * directly, so unless a developer manually exported it in their shell,
 * every drizzle-kit command failed with "DATABASE_URL is undefined".
 * Confirmed by grepping this package for any `dotenv` usage: none existed.
 *
 * This script replaces `drizzle-kit migrate` as the actual `db:migrate`
 * implementation. It does NOT depend on drizzle-kit's journal at all —
 * it applies every `.sql` file in migrations/, in filename order, exactly
 * once, tracked in its own `_migrations_applied` table in the target
 * database. This is deliberately simple and inspectable: the source of
 * truth for "what has been applied" is a real table you can query
 * yourself, not an opaque JSON file that has to be kept manually in sync.
 *
 * `drizzle-kit generate` (unaffected by this fix) is still the right tool
 * for GENERATING new migration SQL from schema/*.ts changes during
 * development — this script only replaces how migrations get APPLIED.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error(
      [
        "",
        "DATABASE_URL is not set.",
        "",
        "This script reads it from the environment. Either:",
        "  1. Create packages/database/.env (copy .env.example) with your real",
        "     DATABASE_URL, or",
        "  2. Export it before running: DATABASE_URL=\"...\" npm run db:migrate --workspace=packages/database",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await sql`
      create table if not exists public._migrations_applied (
        filename    text primary key,
        applied_at  timestamptz not null default now()
      )
    `;

    const alreadyApplied = new Set(
      (await sql<{ filename: string }[]>`select filename from public._migrations_applied`).map(
        (row) => row.filename,
      ),
    );

    const migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort(); // filenames are zero-padded (0000_, 0001_, ...), so lexical sort == correct order

    if (migrationFiles.length === 0) {
      console.log("No migration files found in", MIGRATIONS_DIR);
      return;
    }

    let appliedCount = 0;

    for (const filename of migrationFiles) {
      if (alreadyApplied.has(filename)) {
        console.log(`  skip   ${filename} (already applied)`);
        continue;
      }

      const filePath = join(MIGRATIONS_DIR, filename);
      const rawSql = readFileSync(filePath, "utf8");

      console.log(`  apply  ${filename} ...`);
      try {
        // Each migration file runs in its own transaction — if a file
        // fails partway through, its changes roll back and it's NOT
        // marked as applied, so re-running this script will retry it
        // cleanly rather than silently skipping a half-applied migration.
        await sql.begin(async (tx) => {
          await tx.unsafe(rawSql);
          await tx`insert into public._migrations_applied (filename) values (${filename})`;
        });
        appliedCount++;
        console.log(`  done   ${filename}`);
      } catch (err) {
        console.error(`\nMigration failed: ${filename}`);
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    }

    if (appliedCount === 0) {
      console.log("\nDatabase already up to date — nothing to apply.");
    } else {
      console.log(`\nApplied ${appliedCount} migration(s) successfully.`);
    }
  } finally {
    await sql.end();
  }
}

main();
