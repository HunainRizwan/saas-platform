# PROJECT.md

## Overview
Multi-tenant SaaS platform enabling Pakistani small businesses (clothing, cosmetics, grocery, mobile, electronics, boutiques) to launch a WhatsApp-native online store in under 5 minutes. Stack: Next.js, React, TypeScript, Tailwind, PostgreSQL (Supabase), REST API, multi-tenant via shared-schema + Row-Level Security (Supabase Auth, `auth.uid()`-based policies).

## Codename
TBD. Not a blocker. Repo uses placeholder name `saas-platform`.

## Completed Modules
- Phase 1: Architecture & Planning (approved)
- Phase 1 (Reviewed): Principal Engineer review (approved)

## Current Module
**Phase 2 — Database & Auth Foundation — ~92% complete, awaiting your approval.**
See `PHASE2_FINAL_REPORT.md` for the full completion report (implemented items, 9 bugs found and fixed during final verification — including one critical privilege-escalation vulnerability — and final test status).

### Phase 2 final status (all re-verified from a clean install this session)
| Check | Result |
|---|---|
| TypeScript | ✅ 0 errors |
| ESLint | ✅ 0 errors/warnings |
| Next.js build | ✅ Success |
| Unit tests | ✅ 8/8 |
| RLS isolation tests | ✅ 25/25 (21 tenant-isolation + 4 privilege-escalation regression) |
| Service-role key exposure | ✅ Confirmed clean |
| Privilege escalation | ✅ Found, fixed, permanently regression-tested |
| Migrations/FKs | ✅ 15 tables, 27 FKs, 24 indexes, 0 errors |
| Live Supabase project test | 🔴 **Not possible from this sandbox — requires your Supabase account** |

**Phase 3 will not start until you approve `PHASE2_FINAL_REPORT.md` or complete the manual steps listed in it.**

## Beta MVP Scope (Founder decision — 2026-07-18)
Founder goal: an affordable, non-technical alternative to Shopify/WordPress for Pakistani sellers, with a 6-month target of ~50 active sellers, organic + paid (TikTok/Facebook ads) acquisition, and a launch story suitable for podcasts/industry visibility. Decision: **strictly limit post-Phase-2 build to 6 features**, then beta launch — everything else waits for real user feedback rather than being guessed at upfront.

### The 6 MVP features (in build order)
1. **Product Management** (Phase 4)
2. **Public Storefront** (Phase 5)
3. **Checkout + WhatsApp Order Generation** (Phase 6) — the core differentiator vs. generic Shopify clones
4. **Order Management** (Phase 7) — status updates only (pending → confirmed → dispatched → delivered), not full CRM/analytics
5. **Public Order Tracking** (Phase 8) — cheap to build, high trust payoff (`track.store.com/orderid`)
6. **Facebook Pixel + TikTok Pixel Integration** *(new — added this session)* — a Pixel ID field in Store Settings (Phase 3 scope for the field itself), with the tracking script injected on storefront + checkout pages (Phase 5/6 scope for the injection). Required because sellers running paid TikTok/Facebook ads need conversion tracking/retargeting for that spend to be worthwhile — without this, the "run ads to your store" pitch is incomplete.

### Explicitly deferred past beta (not forgotten — reprioritize after real user feedback)
- Trial System (manual seller management via spreadsheet during beta)
- Admin Panel (use the Supabase dashboard directly for beta's small seller count)
- Analytics Dashboard
- Inventory low-stock alerts
- Customer CRM beyond what Order Management already captures

### Why this scope
Produces one complete, sellable loop: *seller creates a store and lists products → runs ads or shares a link → customer buys and gets a WhatsApp order → seller fulfills and updates status → customer tracks it*. That loop is the whole MVP promise. Billing, admin tooling, and analytics are valuable but don't block that loop from working, and guessing at them now risks building things beta sellers won't actually need.

## Bugfixes Since Last Report
- Fixed: /dashboard/setup 404 (missing route for the authenticated-no-store redirect target). New stub page added outside the (dashboard) route group to avoid a redirect loop. 3 new regression tests, all passing. Full verification re-run (typecheck/lint/build/unit/RLS) — all green. See CHANGELOG.md for detail.

## Phase 3 — Store Setup Wizard — Complete
Implemented: schema additions (country/currency/description/business_category), Supabase Storage bucket+policies for logos, Zod validators, 3 server actions (checkSlugAvailability, createStore, updateStoreLogo) with correct trust-tier separation (RLS-respecting client for owner writes, service-role client for the slug uniqueness check and the subscriptions/activity_logs rows that RLS restricts to super_admin), and the real wizard UI replacing Phase 2's stub at /dashboard/setup.

Verified this session (clean re-run): TypeScript 0 errors, ESLint 0 errors/warnings, next build succeeds, 35/35 unit tests (24 new), 25/25 RLS isolation tests (confirmed no regression from Phase 2). Full detail in CHANGELOG.md "[Phase 3]" entry.

## Phase 3b — Dashboard Shell — Complete
Responsive sidebar (desktop fixed + mobile drawer), sticky topbar, user profile menu with logout, active-nav highlighting, and stub pages for all 6 nav destinations (Products/Orders/Customers/Analytics/Inventory/Settings) so nothing 404s while Phase 4+ builds the real screens. (dashboard)/layout.tsx now fetches store name + user profile for the shell — its Phase 2/3a redirect logic is unchanged (verified by test + live server check).

Verified this session: TypeScript 0 errors, ESLint 0 errors/warnings, next build succeeds (all 6 new routes build as real dynamic routes), 46/46 unit tests (19 new), 25/25 RLS isolation tests (untouched). Live server check confirmed all 6 new routes correctly redirect unauthenticated visitors to /login instead of 404ing. Full detail in CHANGELOG.md "[Phase 3b]" entry.

Remaining for Phase 3: Store Settings page (Phase 3c) — store editing + Facebook/TikTok Pixel ID fields, not yet built.

## Phase 3c — Store Settings — Complete
Implemented: schema additions (facebook_pixel_id, tiktok_pixel_id, both nullable, formats verified against real platform docs), a settings validator that reuses Phase 3a's field schemas (extracted as named exports rather than duplicated), two server actions on the same trust tier as the setup wizard, the full settings form (name/description/WhatsApp/country/currency/Pixel IDs/logo), and a real settings hub page replacing the old stub.

One real Next.js constraint caught by actually running the build (not by typecheck/lint): a *use server* file can only export functions defined in that same file — re-exporting Phase 3a's updateStoreLogo from the new actions file failed the build; fixed by importing it directly in the form component instead.

Verified this session (clean re-run): TypeScript 0 errors, ESLint 0 errors/warnings, next build succeeds, 75/75 unit tests (29 new), 25/25 RLS isolation tests (unaffected). Live server check confirmed /settings and /settings/store correctly gate unauthenticated visitors to /login instead of 404ing. Full detail in CHANGELOG.md "[Phase 3c]" entry.

**Phase 3 (a+b+c) is now fully complete.**

## Phase 3 — Independent Audit — Complete
A from-scratch independent audit (not trusting prior approvals) covering all of Phase 3 (3a+3b+3c) as one system: architecture compliance, scope compliance, auth flow, protected routes, validation reuse, trust-tier separation, DB consistency, security, accessibility, mobile responsiveness, dead/duplicate code, unnecessary queries, and cross-phase regression risk.

Found and fixed 3 real defects: (1) missing aria-invalid/aria-describedby on validation errors across BOTH the Setup Wizard and Settings form — a genuine screen-reader gap, now fixed on every validated field in both; (2) a stale Drizzle migration journal tag left over from a Phase 2 rename; (3) a stray build artifact + missing .gitignore pattern. Everything else audited clean — zero Phase 4 leakage, no over-posting risk, zero duplicated validation logic, no dead code, no cross-phase coupling, and a full live-server check across all 9 protected + 3 public routes showed no regressions.

Re-verified after fixes: TypeScript 0 errors, ESLint 0 errors/warnings, 75/75 unit tests (unchanged), next build succeeds (17 routes), 25/25 RLS isolation tests. Full detail in CHANGELOG.md "[Phase 3 — Independent Audit]" entry.

**Phase 3 (3a + 3b + 3c) is genuinely ready to freeze for manual testing.**

## Critical Bugfix — Slug Availability Check — Complete
Real manual testing found the Setup Wizard always showing "Already taken" for every slug. Root cause reproduced and PROVEN (not assumed) by standing up a real PostgREST + Postgres + RLS + Supabase-shaped gateway stack and running the actual query through the real supabase-js library — the query logic itself was correct. The real bug: any check FAILURE (not just a genuine conflict) was being silently relabeled "Already taken" in both the wizard UI and the server-side re-check, because neither looked at the error field checkSlugAvailability already returns.

Fixed in both places, added a regression test. Re-verified: TypeScript 0 errors, ESLint 0 errors/warnings, 77/77 unit tests (2 new), next build succeeds, 25/25 RLS suite (unaffected — this was an application-layer bug, not RLS/schema). Full detail in CHANGELOG.md.

## Critical Bugfix — Root Cause (Table Grants) — Complete
Real diagnostic logs (from the reporter's own terminal, per their explicit request for instrumentation) revealed the true root cause: Postgres error 42501, permission denied for table stores. Every table in this project was missing the base table-level GRANT that PostgREST/Supabase's anon/authenticated/service_role roles need underneath RLS — RLS was never the problem, the grant layer beneath it was simply never created.

Fixed permanently via a new migration (0004_grant_api_roles.sql), applied the same way as every other migration (no manual SQL, no Supabase dashboard step). Made it role-existence-defensive so it works identically against real Supabase and the local test harness. Proven — not assumed — on a completely clean database with zero manual grants, using a real PostgREST + Postgres + Supabase-shaped stack: slug check and full store creation both verified end-to-end.

Re-verified: TypeScript 0 errors, ESLint 0 errors/warnings, 77/77 unit tests, next build succeeds, 25/25 RLS suite. Diagnostic logging from the previous round reduced to production-appropriate error-only logging. README.md's migration list corrected (was also missing 0002/0003). Full detail in CHANGELOG.md.

## Migration Workflow Root Cause Fix — Complete
The GRANT migration (0004) was correct SQL but never reached the live Supabase database. Root cause, found with direct evidence: db:migrate ran drizzle-kit migrate, which reads a journal file that never tracked our hand-written 0001 migration or the new 0004 — so it silently could never apply either, even with DATABASE_URL configured. Separately, nothing in packages/database ever loaded .env files at all, explaining the DATABASE_URL is undefined error independently.

Fixed with a new self-contained migration runner (packages/database/scripts/migrate.ts) that doesnt depend on drizzle-kits journal — tracks applied migrations in a real, queryable table instead. Proven end-to-end on a completely clean database: ran the real npm run db:migrate command, confirmed all 5 migrations applied, then directly queried Postgres privileges (has_table_privilege) to confirm service_role now has SELECT/INSERT on stores — the exact permission that was missing. Confirmed idempotent (safe to re-run).

Re-verified: TypeScript 0 errors, ESLint 0 errors/warnings, 77/77 unit tests, next build succeeds, 25/25 RLS suite. README updated to document the single working command. Full detail in CHANGELOG.md.

## Progress
**~3 / 13 phases**

| Phase | Status |
|---|---|
| 1. Architecture & Planning (+ Reviewed) | ✅ Approved |
| 2. Database & Auth Foundation | ✅ Approved |
| 3a. Store Setup Wizard | ✅ Complete |
| 3b. Dashboard Shell | ✅ Complete |
| 3c. Store Settings | ✅ Complete — see note above |
| 4–13 | ⚪ Not started |

## Key Baseline Decisions
- ORM: **Drizzle**
- Auth: **Supabase Auth**
- `password_reset_tokens`: dropped, using Supabase Auth's native reset flow
- Environments: three Supabase projects (dev/staging/production) from the start
- Multi-tenancy: shared Postgres schema + `store_id` + RLS
- RLS isolation test suite: Phase 2 deliverable — complete, **25/25 passing** (includes new privilege-escalation regression tests)

## Critical fixes made during Phase 2 final verification (see PHASE2_FINAL_REPORT.md §2 for full detail)
- Fixed: `useSearchParams()` without Suspense boundary broke `next build` entirely
- Fixed: **critical** — any authenticated user could self-escalate to `super_admin` via a direct `UPDATE` to their own `users` row; closed via a trigger, with bootstrap and legitimate-admin-action paths verified still working
- Fixed: missing `postgres` package dependency, incompatible ESLint config, missing admin UPDATE policy on `users`

## Notes
- No further code changes will be made until you approve the Phase 2 final report or request changes.
- This file is updated at the end of every phase/step — never rewritten wholesale, only amended.
