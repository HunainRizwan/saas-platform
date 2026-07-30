# TASKS.md

## Completed Tasks — Phase 1 & Review
(unchanged — see CHANGELOG.md for full history)

## Completed Tasks — Phase 2 (build)
(unchanged from previous update — schema, RLS policies, Supabase Auth integration, Auth UI, CI workflow — see CHANGELOG.md "[Phase 2]" entry for the full list)

## Completed Tasks — Phase 2 Final Verification (this session)
- [x] Full audit of implemented files against ARCHITECTURE.md / PHASE2_IMPLEMENTATION_PLAN.md / PROJECT.md
- [x] Confirmed no missing tables (15/15 match reviewed schema exactly)
- [x] Confirmed no missing RLS policies (15/15 tables have RLS enabled)
- [x] Confirmed no service_role key exposure in client code (only imported in a server-only Route Handler)
- [x] Found and fixed: missing `postgres` npm dependency (typecheck failure)
- [x] Found and fixed: incompatible ESLint config for eslint@9 (lint crash)
- [x] Found and fixed: `next-env.d.ts` false-positive lint failure
- [x] Found and fixed: `useSearchParams()` missing Suspense boundary — **was breaking `next build` entirely**
- [x] Found and fixed: **critical privilege-escalation vulnerability** — sellers could change their own `role` to `super_admin` via direct UPDATE
- [x] Found and fixed: escalation-fix's first version blocked legitimate admin bootstrapping — refined
- [x] Found and fixed: missing `super_admin` UPDATE policy on `users` (blocked legitimate admin actions, needed for Phase 12)
- [x] Added 4 new permanent regression tests for the privilege-escalation fix to the RLS suite (now 25 total assertions)
- [x] Re-ran full verification pipeline (typecheck, lint, build, unit tests, RLS suite) from a **clean install + clean Postgres** to confirm reproducibility — all green
- [x] Wrote `PHASE2_FINAL_REPORT.md` — full completion report

## Completed — Bugfix (post-Phase-2-report)
- [x] Fixed /dashboard/setup 404 — added stub page outside (dashboard) route group, 3 regression tests, independently re-verified (typecheck/lint/build/unit/RLS all passing)

## Current Tasks — Awaiting Your Approval
- [ ] **You**: review `PHASE2_FINAL_REPORT.md` and approve, or request changes
- [ ] **You**: create 3 Supabase projects (dev/staging/production)
- [ ] **You**: fill in `apps/web/.env.local` from your dev project's credentials
- [ ] **You**: push repo to GitHub (for `ci.yml` to run for real)
- [ ] **Me** (once unblocked): apply migrations + all 8 policy files (including `07_security_fixes.sql`) to your real dev Supabase project
- [ ] **Me** (once unblocked): verify signup/login/logout/forgot-password/protected-routes end-to-end against real Supabase Auth
- [ ] **Me** (once unblocked): confirm `ci.yml` passes in real GitHub Actions

## Beta MVP Roadmap (Founder decision — 2026-07-18) — supersedes the generic phase list below for prioritization purposes; phase numbering unchanged
Scope frozen to 6 features post-Phase-2, then beta launch. See PROJECT.md "Beta MVP Scope" for full reasoning.

- [x] Phase 3a: **Store Setup Wizard** — ✅ complete. Schema additions, Supabase Storage policies, validators, 3 server actions, full wizard UI, 24 new tests, all passing. See CHANGELOG.md "[Phase 3]" entry.
- [x] Phase 3b: **Dashboard Shell** — ✅ complete. Responsive sidebar, topbar, user menu + logout, active-nav highlighting, 6 stub pages (no dead links), 19 new tests, all passing. See CHANGELOG.md "[Phase 3b]" entry.
- [x] Phase 3c: **Store Settings** — ✅ complete (this session). Facebook/TikTok Pixel ID schema + validators (formats verified against real platform docs), settings form (name/description/WhatsApp/country/currency/Pixel IDs/logo) reusing Phase 3a's validators and trust-tier pattern, real settings hub page, 29 new tests, all passing. See CHANGELOG.md "[Phase 3c]" entry.

**Phase 3 (a+b+c) is now fully complete.**

## Completed — Independent Phase 3 Audit
- [x] Full 27-point audit of Phase 3 as one system (3a+3b+3c), no prior report trusted, verified from actual code/behavior
- [x] Fixed: missing aria-invalid/aria-describedby across both forms (Setup Wizard + Settings)
- [x] Fixed: stale Drizzle migration journal tag
- [x] Fixed: stray build artifact + missing .gitignore pattern
- [x] Re-ran full pipeline after fixes: TypeScript, ESLint, unit tests (75/75), next build, RLS suite (25/25) — all green
- [x] Live server check across all protected + public routes — no regressions

**Phase 3 (3a + 3b + 3c) is frozen and ready for manual testing.**

## Completed — Migration Workflow Root Cause Fix
- [x] Found real root cause with direct evidence: db:migrate ran drizzle-kit migrate, whose journal never tracked hand-written migration 0001 or new migration 0004 — meaning db:migrate could never have applied either, regardless of DATABASE_URL
- [x] Confirmed separately: packages/database never loaded .env files at all (grepped for dotenv usage: none)
- [x] Built packages/database/scripts/migrate.ts — self-contained runner, doesn't depend on drizzle-kit's journal, tracks applied migrations in a real queryable table
- [x] Fixed db:migrate script, added dotenv loading to drizzle.config.ts too, added .env.example
- [x] Verified on a completely clean database using the real npm run db:migrate command: all 5 migrations applied, service_role privileges confirmed via has_table_privilege(), idempotency confirmed (3rd run = no-op)
- [x] Updated README.md with the corrected, single-command workflow
- [x] Re-ran full pipeline: TypeScript, ESLint, unit tests (77/77), next build, RLS suite (25/25) — all green
- [ ] Known non-blocking gap flagged (not fixed): db:seed references a scripts/seed.ts that doesn't exist yet

## Completed — Critical Bugfix (root cause, table grants)
- [x] Diagnosed real root cause from reporter's own terminal logs: Postgres 42501, permission denied for table stores
- [x] Identified why: migrations 0000-0003 never granted anon/authenticated/service_role table access (RLS policies were never the problem)
- [x] Fixed via new migration 0004_grant_api_roles.sql — permanent, applies to all future tables too via ALTER DEFAULT PRIVILEGES
- [x] Made the migration role-existence-defensive (safe against both real Supabase and the local test harness's different role names)
- [x] Verified on a completely clean database, zero manual grants — real PostgREST + Postgres stack, both slug check and full store creation proven end-to-end
- [x] Reduced diagnostic logging to production-appropriate error-only logging
- [x] Fixed stale README migration list (was missing 0002/0003 too)
- [x] Re-ran full pipeline: TypeScript, ESLint, unit tests (77/77), next build, RLS suite (25/25) — all green

## Completed — Critical Bugfix (found during real manual testing)
- [x] Reproduced the "every slug shows Already taken" bug against a real PostgREST + Postgres + RLS stack (downloaded and ran real PostgREST for this), proving the query logic itself was correct
- [x] Found real root cause: check failures were being displayed identically to genuine slug conflicts, in both the wizard UI and the server-side re-check
- [x] Fixed both locations, added a regression test
- [x] Re-ran full pipeline: TypeScript, ESLint, unit tests (77/77), next build, RLS suite (25/25) — all green
- [ ] Phase 4: Product Management — **MVP feature 1**
- [ ] Phase 5: Public Storefront — **MVP feature 2** — **includes new task: inject Pixel/TikTok tracking scripts on storefront pages**
- [ ] Phase 6: Checkout + WhatsApp Order Generation — **MVP feature 3** — **includes new task: fire Pixel/TikTok purchase-conversion events on checkout completion**
- [ ] Phase 7: Order Management — **MVP feature 4** — status updates only (pending→confirmed→packed→dispatched→delivered→cancelled); full Customer CRM explicitly descoped from beta, see below
- [ ] Phase 8: Public Order Tracking — **MVP feature 5**
- [ ] **→ BETA LAUNCH ←**

### Explicitly deferred past beta (reprioritize using real user feedback, not upfront guessing)
- [ ] Phase 9: Inventory + Low Stock Alerts — deferred
- [ ] Phase 10: Analytics Dashboard — deferred
- [ ] Phase 11: Trial System — deferred (manual spreadsheet tracking during beta)
- [ ] Phase 12: Admin Panel — deferred (use Supabase dashboard directly during beta)
- [ ] Phase 13: Polish, Performance, Launch Readiness — partially pulled forward as needed for beta stability (loading states, mobile QA), full scope deferred
- [ ] Customer CRM beyond Order Management's built-in customer records — deferred
