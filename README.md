# saas-platform (codename TBD)

Multi-tenant SaaS enabling Pakistani small businesses to launch a WhatsApp-native
online store in under 5 minutes. See `ARCHITECTURE.md` for the full system design
and `PROJECT.md` / `TASKS.md` / `CHANGELOG.md` for current status.

**Status:** Phase 2 (Database & Auth Foundation) — in progress.

---

## What's implemented so far (Phase 2)

- Full repo scaffold (`apps/web`, `packages/database`)
- Complete database schema as Drizzle migrations (15 tables, reviewed architecture)
- Row-Level Security policies on every tenant table, keyed on Supabase Auth's `auth.uid()`
- **RLS isolation test suite — written AND verified**: 21 assertions covering every
  tenant table, both read and write, both directions (Store A ↔ Store B), plus the
  unauthenticated case. Run it yourself:
  ```
  bash apps/web/tests/rls/run_rls_tests.sh
  ```
- Supabase Auth integration: browser/server/service clients, session-refresh middleware,
  route guards for `(dashboard)` and `(admin)`
- Signup / Login / Forgot Password / Reset Password UI, wired to Supabase Auth's native flow
- Minimal CI pipeline (`.github/workflows/ci.yml`): typecheck, lint, build, unit tests,
  and the RLS isolation suite — all required to pass before merge
- `password_reset_tokens` intentionally does not exist — password reset uses Supabase
  Auth's built-in flow, per the approved Phase 2 decision

## What is NOT yet implemented (later phases)

Dashboard UI beyond a placeholder, store settings, product management, storefront,
checkout, order management, CRM, inventory, analytics, trial locking, admin panel,
courier integration. See `ARCHITECTURE.md` §11 for the full phase roadmap.

---

## ⚠️ Action required from you before this runs against real data

Everything above was built and tested in a **local sandbox** against a **local
Postgres instance** simulating Supabase Auth's `auth.uid()` contract (see
`apps/web/tests/rls/00_local_auth_stub.sql` — this file is test-only and is never
applied to a real Supabase project, which already provides the real thing).

I cannot create cloud Supabase projects on your behalf — that requires your own
Supabase account. Here's exactly what to do:

### 1. Create three Supabase projects

Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create:
- `<name>-dev`
- `<name>-staging`
- `<name>-production`

(`<name>` = final codename once decided — placeholder is fine for now, projects can
be renamed later.)

### 2. For each project, grab these values

Project Settings → API:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ never commit this, never expose client-side)

Project Settings → Database → Connection string (URI, "Session pooler" or direct):
- → `DATABASE_URL`

### 3. Fill in the env files

Copy each template from `/env-templates/` into `apps/web/.env.local` (for dev) and
into your hosting provider's secret manager (for staging/production — never commit
filled-in `.env` files). Templates:
- `env-templates/.env.development.example`
- `env-templates/.env.staging.example`
- `env-templates/.env.production.example`

### 4. Enable email/password auth + configure email templates

In each Supabase project: Authentication → Providers → enable Email. Authentication →
Email Templates → customize the "Reset Password" template if you want branded copy
(defaults work fine for now).

### 5. Apply the schema + policies to each real project

**One command applies every migration** (this replaced a broken setup — see
`CHANGELOG.md`'s "Migration Workflow Root Cause Fix" entry if you're curious
why there used to be two different, inconsistent ways to do this):

```
cd packages/database
cp .env.example .env        # then edit .env and paste your real DATABASE_URL
npm run db:migrate
```

This applies every file in `migrations/` in order, exactly once — safe to
re-run any time (already-applied migrations are skipped). It requires
`packages/database/.env` (separate from `apps/web/.env.local` — each
workspace loads its own), not just an exported shell variable.

To verify what's actually been applied to a given database (useful if
something seems off), query the tracking table this command maintains:
```
psql "$DATABASE_URL" -c "select * from public._migrations_applied order by applied_at;"
```

If you've changed `schema/*.ts` and need a new migration file generated
first:
```
npx drizzle-kit generate
```
(`drizzle-kit generate` is still the right tool for generating new migration
SQL from schema changes — only *applying* migrations now goes through
`npm run db:migrate` above, not `drizzle-kit migrate`.)

Then apply the RLS policies:
```
for f in policies/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

Do **not** run `apps/web/tests/rls/00_local_auth_stub.sql` against a real Supabase
project — it would conflict with Supabase's real `auth` schema.

### 6. Tell me when this is done

Once dev is provisioned and `apps/web/.env.local` is filled in, let me know and I'll
walk through running the app locally (`npm install && npm run dev`) against your real
dev project to confirm signup/login/forgot-password work end-to-end — that's the last
item on the Phase 2 Definition of Done that only your credentials can unblock.

---

## Local development (once env is set up)

```
npm install
npm run dev              # http://localhost:3000
npm run typecheck
npm run lint
npm run test              # unit tests (Vitest)
bash apps/web/tests/rls/run_rls_tests.sh   # RLS isolation suite (needs local Postgres)
```
