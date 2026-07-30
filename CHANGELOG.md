
## [Phase 2 — Final Verification] — 2026-07-17
### Audited
- Full cross-check of implemented files against ARCHITECTURE.md, PHASE2_IMPLEMENTATION_PLAN.md, PROJECT.md.
- Table completeness: 15/15 tables match the reviewed schema exactly (no missing, no stray tables).
- RLS completeness: 15/15 tables have Row-Level Security enabled, 26 policy statements.
- Service-role key exposure: confirmed zero client-side (`"use client"`) references; sole import is in a server-only Next.js Route Handler.
- Migration/FK integrity: 27 foreign keys, 24 indexes, applied to a real local Postgres 16 instance with zero errors across multiple clean rebuilds.

### Fixed (9 issues found during this audit — see PHASE2_FINAL_REPORT.md §2 for full detail)
1. Missing `postgres` npm package dependency (`lib/db/client.ts` import) — typecheck failure.
2. `.eslintrc.json` incompatible with installed `eslint@9` — replaced with flat-config `eslint.config.mjs`.
3. First flat-config draft referenced `@typescript-eslint/no-unused-vars` without registering the plugin — switched to `next/typescript`'s pre-wired rule set.
4. `next-env.d.ts` false-positive lint failure — added to ESLint ignores (standard Next.js practice).
5. **`next build` was failing outright** — `/login`'s `useSearchParams()` needed a Suspense boundary (Next.js 15 requirement). Split into `login-form.tsx` + a `<Suspense>`-wrapped `page.tsx`.
6. **CRITICAL — privilege escalation**: `users_update_own` RLS policy allowed any authenticated seller to change their own `role` column, including to `super_admin`, via a direct client-SDK `UPDATE`. Verified exploitable against real Postgres RLS before fixing. Closed with a `BEFORE UPDATE` trigger (`prevent_role_self_escalation()`).
7. The above fix's first version also blocked legitimate first-admin bootstrapping (no user session context). Refined to allow role changes when `auth.uid()` is NULL (trusted direct/service context) while still blocking any authenticated end-user session from self-escalating.
8. No RLS policy existed allowing a `super_admin` to `UPDATE` another user's row (only `SELECT` existed) — added `users_update_super_admin`, needed for the fix above's legitimate path and for Phase 12's admin panel.
9. A bug in the new regression test itself (stale `app.current_user_id` session variable between test blocks) caused a false failure on first run — fixed in the test script.

### Added
- `packages/database/policies/07_security_fixes.sql` — the privilege-escalation fix and the missing admin-update policy.
- 4 new permanent regression tests in the RLS isolation suite (tests 19–20, covering: escalation blocked, non-role self-update still works, real admin can change another's role) — suite is now 25 assertions, up from 21.
- `PHASE2_FINAL_REPORT.md` — full Phase 2 completion report.

### Verified (clean install + clean Postgres, this session, reproducible)
- TypeScript: 0 errors
- ESLint: 0 errors/warnings
- `next build`: succeeds, 7 routes generated
- Unit tests: 8/8 passing
- RLS isolation suite: 25/25 passing

### Explicitly NOT Verified (cannot be, from this sandbox)
- Live Supabase project signup/login/forgot-password end-to-end (no Supabase account access).
- `ci.yml` has not run inside real GitHub Actions (repo not yet pushed).

### Status
Phase 2 ~92% complete. **Awaiting user approval of PHASE2_FINAL_REPORT.md before Phase 3 begins**, per explicit instruction not to proceed until Phase 2 is fully documented and approved.

## [Phase 2 — Bugfix] — /dashboard/setup 404 — 2026-07-17
### Fixed
- `(dashboard)/layout.tsx` redirected authenticated users with no store to `/dashboard/setup`, but no page existed at that path — 404.
- Added `apps/web/app/dashboard/setup/page.tsx`, deliberately placed OUTSIDE the `(dashboard)` route group (as a physical sibling) so it does not inherit `(dashboard)/layout.tsx`'s store-check redirect — nesting it inside that group would cause an infinite redirect loop for "no-store" users. Page still falls under `middleware.ts`'s `/dashboard` prefix, so auth protection is unaffected.
- Added `apps/web/tests/dashboard-setup.test.ts` — 3 regression tests locking in all three `getCurrentStore()` states, specifically guarding against future re-nesting under `(dashboard)`.

### Verified (independent review pass)
- `tsc --noEmit`: 0 errors · `eslint`: 0 errors/warnings · `next build`: succeeds, no route collision · Unit tests: 11/11 (8 pre-existing + 3 new) · RLS isolation suite: 25/25 (files confirmed untouched)
- Full recursive diff against Phase 2 baseline confirmed exactly 2 files added, nothing else touched.

### Note
This is a Phase 2 stub only — the real multi-step store setup wizard (name, slug, logo, WhatsApp number) remains Phase 3 scope.

## [Planning] — Beta MVP Scope Decision — 2026-07-18
### Decided
- Founder-level strategic decision: post-Phase-2 build strictly limited to 6 features, then beta launch. Goal: affordable Shopify/WordPress alternative for Pakistani sellers, ~50 active sellers within 6 months via organic + paid (TikTok/Facebook ads) acquisition, building toward a launch story suitable for industry visibility (podcasts, etc.).
- The 6 MVP features: Product Management, Public Storefront, Checkout + WhatsApp Order Generation, Order Management (status-only), Public Order Tracking, and **Facebook Pixel + TikTok Pixel Integration** (new).
- Pixel integration added because sellers running paid ads need conversion tracking/retargeting — without it, the "run ads to your store" pitch (explicitly part of the founder's stated business model) is incomplete.
- Explicitly deferred past beta: Trial System, Admin Panel, Analytics Dashboard, Inventory alerts, full Customer CRM. These are not cancelled — reprioritization will be based on real beta feedback rather than upfront guessing.

### Added to roadmap (no code yet — planning only)
- Phase 3: new task — Pixel ID input fields in Store Settings.
- Phase 5: new task — inject Pixel/TikTok tracking scripts on storefront pages.
- Phase 6: new task — fire purchase-conversion events on checkout completion.

See PROJECT.md "Beta MVP Scope" and TASKS.md "Beta MVP Roadmap" for full detail.

## [Phase 3] — Store Setup Wizard — 2026-07-18
### Added
- **Schema**: `packages/database/migrations/0002_store_setup_fields.sql` — added `country` (default 'Pakistan'), `currency` (default 'PKR'), `description`, `business_category` to `stores`. Generated via Drizzle Kit, applied to real local Postgres, verified.
- **Storage**: `packages/database/policies/08_storage.sql` — `store-assets` public bucket + RLS policies scoping logo upload/update/delete to store members (via `is_store_member()`), public read for storefront display. Supabase-only (documented in file header); not applicable to local Postgres, so excluded from the local RLS suite.
- **Validators**: `apps/web/lib/validators/store-setup.ts` — slug format/reserved-word rules, WhatsApp number format, supported currencies (`PKR`, `USD`), business category suggestions.
- **Server Actions** (`apps/web/app/dashboard/setup/actions.ts`):
  - `checkSlugAvailability` — cross-tenant slug uniqueness check via the service-role client (RLS structurally can't answer this for a single tenant's session, since no public SELECT policy on `stores` exists yet — deferred to Phase 5).
  - `createStore` — inserts via the RLS-respecting server client (`owner_id` bound to the authenticated session, not client input), computes `trial_ends_at` server-side, re-checks slug availability server-side (closes the race-condition window), then creates the initial `subscriptions` row and an `activity_logs` entry via the service-role client (consistent with `policies/06`'s existing restriction that only super_admin/trusted-server writes may touch `subscriptions`).
  - `updateStoreLogo` — persists the uploaded logo's public URL via the RLS-respecting client.
- **UI**: `apps/web/app/dashboard/setup/store-setup-wizard.tsx` — full form (name, auto-derived+editable slug with live debounced availability check, WhatsApp number, country, currency, optional business category/description/logo), client-side validation mirroring the server schema, logo upload directly to Supabase Storage after store creation.
- **Route**: `apps/web/app/dashboard/setup/page.tsx` — Phase 2's stub replaced with `<StoreSetupWizard />` in the "no-store" render branch. **The redirect logic itself (unauthenticated → `/login`, has-store → `/dashboard`) is unchanged from Phase 2.**
- **Tests**: 24 new tests — 13 validator tests, 11 server-action tests (mocked Supabase clients, asserting the correct trust tier is used for each write — this is what actually proves `owner_id` comes from the session and `subscriptions`/`activity_logs` go through the service client, not just that "an insert happened").

### Fixed (found during this phase's verification)
- `run_rls_tests.sh` looped over all `policies/*.sql` files including the new Supabase-only `08_storage.sql`, which fails against local Postgres (no `storage` schema). Excluded it explicitly with a clear skip message; RLS isolation suite is unaffected since storage isn't part of tenant-table isolation.
- `run_rls_tests.sh` didn't apply the new `0002_store_setup_fields.sql` migration — added it to the runner so the test DB matches real schema going forward.
- Drizzle Kit generated the new migration as `0001_...` (collided with the hand-written `0001_auth_sync.sql`, since Drizzle's journal doesn't track that file) — renamed to `0002_store_setup_fields.sql` and corrected the journal tag to match.
- One new test had unused destructured variables tripping ESLint — fixed by not destructuring the discarded keys at all.

### Verified (clean install, this session)
- TypeScript: 0 errors · ESLint: 0 errors/warnings · `next build`: succeeds, `/dashboard/setup` now 3.34kB (was 1.32kB stub) · Unit tests: **35/35** (24 new + 11 pre-existing) · RLS isolation suite: **25/25** (unchanged from Phase 2, confirmed no regression)

### Scope notes
- Business category is free-form (suggestion list, not a rigid enum) — matches the Beta MVP Scope decision to avoid guessing a taxonomy ahead of real seller feedback.
- Country is Pakistan-only for MVP (single-option select) — same reasoning, expand only if beta reveals demand.
- Logo upload failure does not block store creation — the store row is already committed by that point; seller can add a logo later from Store Settings (not yet built — Phase 3 continuation or Phase 4).

## [Phase 3b] — Dashboard Shell — 2026-07-18
### Added
- **Nav logic**: `apps/web/lib/dashboard/nav-config.ts` — `NAV_ITEMS` (Dashboard, Products, Orders, Customers, Analytics, Inventory, Settings) and a pure `isNavActive()` function, deliberately extracted from the Sidebar component so it's unit-testable without a rendering environment (this project's Vitest config runs in plain Node, no jsdom).
- **Components** (`apps/web/components/dashboard/`):
  - `sidebar.tsx` — desktop fixed sidebar (always visible ≥`md`) + mobile slide-in drawer with overlay, closes on nav/Escape/outside-click, active-link highlighting
  - `topbar.tsx` — sticky header, mobile hamburger trigger, reserved space for future page titles/breadcrumbs (Phase 4+)
  - `user-menu.tsx` — avatar-initials button, dropdown with name/email + Logout (`supabase.auth.signOut()` → redirect to `/login`)
  - `dashboard-shell.tsx` — composes Sidebar + Topbar, owns the mobile-drawer open/close state so the layout itself can stay a server component
  - `coming-soon.tsx` — reusable empty-state, used by every not-yet-built nav destination
- **Stub pages**: `products`, `orders`, `customers`, `analytics`, `inventory`, `settings` — each a real route using `ComingSoon`, so the sidebar has zero dead links without implementing any Phase 4+ feature logic
- **Loading state**: `(dashboard)/loading.tsx` — skeleton matching the shell's real proportions
- **Tests**: 19 new — 8 for `nav-config`/`isNavActive` (including a false-positive-prefix edge case: `/products-archive` must not match `/products`), 3 for `(dashboard)/layout`'s redirect logic (mirrors the established `dashboard-setup.test.ts` mocking pattern)

### Modified
- `apps/web/app/(dashboard)/layout.tsx` — now fetches store name + user display name/email and renders `<DashboardShell>` instead of a bare `<div>`. **The three-way redirect logic (unauthenticated → `/login`, no-store → `/dashboard/setup`, ok → render) is byte-for-byte unchanged** — confirmed via the new layout test and a live server check.
- `apps/web/app/(dashboard)/dashboard/page.tsx` — replaced the Phase 2 debug placeholder ("Auth + store resolution working. Store ID: ...") with a proper welcome empty-state. No product/order data — that's Phase 4+.

### Verified (clean re-run, this session)
- TypeScript: 0 errors · ESLint: 0 errors/warnings · `next build`: succeeds, all 6 new nav routes build as real dynamic routes · Unit tests: **46/46** (19 new) · RLS isolation suite: **25/25** (untouched, confirmed no regression)
- **Live server check**: unauthenticated requests to all 6 new routes (`/products`, `/orders`, `/customers`, `/analytics`, `/inventory`, `/settings`) correctly return `307 → /login?redirectTo=...`, none 404 — same middleware gate as `/dashboard`.

### Explicitly out of scope this session (per instruction)
- Store Settings page content (Pixel ID fields, store editing) — remains Phase 3c
- Any Product Management logic — remains Phase 4

## [Phase 3b — Self-Audit] — 2026-07-18
### Audited against ARCHITECTURE.md, PROJECT.md, TASKS.md
Confirmed: redirect logic unchanged from Phase 2/3a (byte-identical, verified via grep + existing/new tests), no duplicate routes, no dead components (every new component traced to exactly one real usage site, `ComingSoon` used in 7), no Phase 3c/4 leakage (all 6 stub pages contain only `<ComingSoon>` with static copy), `settings/store|billing|team` subfolders from Phase 1 scaffolding left untouched and don't conflict with the new `settings/page.tsx` stub.

### Fixed (2 real issues found)
1. **Redundant server query**: `(dashboard)/dashboard/page.tsx` was independently re-fetching the store name already fetched by `(dashboard)/layout.tsx` for the sidebar/topbar — two DB round-trips for the same value on every `/dashboard` load. Removed; the page no longer queries anything, since it already inherits the layout's guarantee of being authenticated with a store. (Contrast with `dashboard/setup/page.tsx`'s own re-check, which is NOT redundant — that page sits outside this layout group and has no other guard.)
2. **Missing keyboard/focus handling on the mobile drawer**: no `Escape`-to-close, no focus moved into the drawer on open, no focus restored to the triggering element on close. Added all three, plus `role="dialog"` / `aria-modal="true"` / `aria-label` on the drawer element for correct assistive-tech semantics.

### Verified (clean re-run after fixes)
TypeScript 0 errors · ESLint 0 errors/warnings · `next build` succeeds (all routes unaffected) · Unit tests 46/46 (unchanged — no test was coupled to the removed query) · RLS isolation suite 25/25 (untouched)

### Not found (checked, clean)
No duplicate layouts/components/routes · every new component is used · no Phase 3c (Store Settings) or Phase 4 (Product Management) logic present anywhere in the diff · nested active-route highlighting logic already correctly extends to future Phase 3c routes like `/settings/store` (verified via `isNavActive`'s existing test coverage, no change needed).

## [Phase 3c] — Store Settings — 2026-07-18
### Added
- **Schema**: `packages/database/migrations/0003_pixel_tracking_fields.sql` — added `facebook_pixel_id`, `tiktok_pixel_id` to `stores` (both nullable). Generated via Drizzle Kit, applied to real local Postgres, verified. Formats verified via research before writing validation: Meta/Facebook Pixel ID is 15–16 numeric digits only; TikTok Pixel ID is uppercase letters + numbers only.
- **Validators** (`apps/web/lib/validators/store-settings.ts`): `storeSettingsSchema` reuses `storeNameSchema`, `whatsappNumberSchema`, `countrySchema`, `currencySchema`, `descriptionSchema` — extracted as named exports from `store-setup.ts` (Phase 3a) rather than redefined, so both forms' rules can never silently drift apart. Adds `facebookPixelIdSchema` and `tiktokPixelIdSchema`, format-verified against real platform documentation. Slug and business category deliberately excluded — not in the Phase 3c feature list, and slug isn't editable post-creation by design (changing it breaks every link a seller has already shared).
- **Server Actions** (`apps/web/app/(dashboard)/settings/store/actions.ts`): `getStoreSettings` (fetches the caller's store via the existing `getCurrentStore()` helper, RLS-respecting client) and `updateStoreSettings` (validates, then updates via the same RLS-respecting client/trust tier `createStore()` already established in Phase 3a — no service-role client needed here, since nothing touched requires bypassing RLS). `updateStoreLogo` is reused directly from Phase 3a's setup actions via a direct import in the form component — **not** re-exported from this file, because Next.js's `"use server"` compiler forbids re-exporting another module's export from a server-action file (only functions defined in the file itself may be exported). This was caught by actually running `next build`, not by typecheck or lint.
- **UI**: `apps/web/app/(dashboard)/settings/store/page.tsx` (server component, fetches initial data) + `store-settings-form.tsx` (client form: name, description, WhatsApp, country, currency, Pixel IDs, logo upload reusing the wizard's exact upload flow). Loading state via the form's own `submitting`/`logoUploading` flags; success (`role="status"`) and error (`role="alert"`) states both announced to assistive tech; Save button disabled unless the form is actually dirty.
- **Settings hub**: `apps/web/app/(dashboard)/settings/page.tsx` replaced its `ComingSoon` stub with a real section list (Store → live link, Billing/Team → still marked "Coming soon"), so the one real settings screen isn't buried behind a fake placeholder.
- **Tests**: 29 new — 19 validator tests (`store-settings.test.ts`, including verified-format edge cases like rejecting the `act_` ad-account-ID prefix mistake for Facebook and lowercase input for TikTok) + 10 server-action tests (mocked clients, asserting: correct trust tier used, snake_case↔camelCase field mapping, empty Pixel ID fields stored as `null` not `""`, validation runs before any DB call, and that `updateStoreLogo` is correctly *not* exported from this file per the Next.js constraint above).

### Modified (reuse-driven, zero duplication)
- `apps/web/lib/validators/store-setup.ts` — extracted `storeNameSchema`, `slugSchema`, `whatsappNumberSchema`, `countrySchema`, `currencySchema`, `logoUrlSchema`, `descriptionSchema`, `businessCategorySchema` as named exports (`storeSetupSchema` now composes them, identical behavior — confirmed via the full existing 13-test suite passing unchanged). Also moved the wizard's local `COUNTRIES` constant to a new shared export `SUPPORTED_COUNTRIES`, so Settings' country dropdown can reuse it instead of redefining it.
- `apps/web/app/dashboard/setup/store-setup-wizard.tsx` — updated to import `SUPPORTED_COUNTRIES` instead of its own local constant. No behavior change.
- `apps/web/tests/rls/run_rls_tests.sh` — added `0003_pixel_tracking_fields.sql` to the applied-migrations list.

### Fixed (found during this phase's verification)
- Initial draft re-exported `updateStoreLogo` from `settings/store/actions.ts` for convenience — `next build` failed outright ("Only async functions are allowed to be exported in a 'use server' file"). Fixed by having the form component import it directly from its Phase 3a source instead; updated the corresponding test to assert the correct (non-re-exported) shape.

### Verified (clean re-run, this session)
TypeScript: 0 errors · ESLint: 0 errors/warnings · `next build`: succeeds, `/settings/store` is a real 3.38kB route · Unit tests: **75/75** (29 new) · RLS isolation suite: **25/25** (unaffected — no new policies needed, `stores_update_member` from Phase 2 already covers these columns) · **Live server check**: unauthenticated requests to `/settings` and `/settings/store` correctly return `307 → /login?redirectTo=...`, neither 404s.

### Scope notes
- Country/currency are editable using the exact same MVP-limited option sets as the setup wizard (Pakistan-only, PKR/USD) — per the Beta MVP Scope principle of not guessing ahead of real seller demand.
- Slug editing and business category editing are explicitly out of scope (not in the Phase 3c feature list).

## [Phase 3 — Independent Audit] — 2026-07-19
### Audited (treated as one system: 3a + 3b + 3c, verified from scratch, no prior report trusted)
27-point checklist covering architecture compliance, scope compliance, auth flow, protected routes, validation reuse, trust-tier separation, database consistency, security, accessibility, mobile responsiveness, dead code, duplicate code, unnecessary queries, and cross-phase regression risk. Confirmed via direct code inspection, greps, and a live production-build server check across all 9 protected + 3 public routes — not by re-reading prior changelogs.

### Fixed (3 real, confirmed defects)
1. **Accessibility — cross-cutting (affects Phase 3a and 3c)**: no field in either the Store Setup Wizard or the Store Settings form wired `aria-invalid`/`aria-describedby` on validation errors. A screen reader user got no programmatic association between an invalid input and its error text — the error was visible, not announced. Fixed on every validated field in both forms (name, slug, WhatsApp, description in the wizard; name, description, WhatsApp, Facebook Pixel ID, TikTok Pixel ID in Settings), each error/hint `<p>` given a matching `id`.
2. **Database consistency**: the Drizzle migration journal's `idx: 0` entry still referenced the pre-rename filename (`0000_parched_jimmy_woo`) instead of the actual file on disk (`0000_initial_schema.sql`) — a leftover from Phase 2 that was never corrected (unlike the two later renames, which were). Fixed the tag to match reality.
3. **Build hygiene**: a stray `tsconfig.tsbuildinfo` was present in the repo, and `.gitignore` had no pattern to stop it recurring. Removed the file, added `*.tsbuildinfo` to `.gitignore`.

### Confirmed clean (checked, no defect found)
Zero Phase 4 leakage (grepped for product/order/cart/checkout logic and direct `products`/`orders`/`categories` table access — none found outside comments referencing future phases). No over-posting risk in `updateStoreSettings` (Zod strips unknown keys; the update payload is explicitly field-whitelisted regardless). Zero duplicated validation regex between `store-setup.ts` and `store-settings.ts`. No dead code (every extracted validator schema traced to a real usage site, internal or external). No unexpected cross-phase coupling (Dashboard Shell doesn't import Setup/Settings validators). Live server check: all 9 protected routes (`/dashboard`, `/dashboard/setup`, `/products`, `/orders`, `/customers`, `/analytics`, `/inventory`, `/settings`, `/settings/store`) correctly return `307 → /login`; all 3 public routes (`/login`, `/signup`, `/forgot-password`) return `200`. No regressions detected between 3a, 3b, and 3c.

### Verified (full pipeline re-run after fixes)
TypeScript: 0 errors · ESLint: 0 errors/warnings · Unit tests: **75/75** (unchanged — no test was coupled to the ARIA attributes added) · `next build`: succeeds, all 17 routes generated · RLS isolation suite: **25/25** (unaffected)

### Files Modified
- `apps/web/app/dashboard/setup/store-setup-wizard.tsx` — ARIA wiring on name, slug, WhatsApp, description
- `apps/web/app/(dashboard)/settings/store/store-settings-form.tsx` — ARIA wiring on name, description, WhatsApp, both Pixel ID fields
- `packages/database/migrations/meta/_journal.json` — corrected stale tag
- `.gitignore` — added `*.tsbuildinfo`

### Files Removed
- `apps/web/tsconfig.tsbuildinfo` (build artifact, should never have been present)

### Verdict
**Phase 3 (3a + 3b + 3c) is genuinely ready to freeze for manual testing.**

## [Phase 3 — Critical Bugfix] — Slug Availability Check — 2026-07-20
### Bug Report
Real manual testing (post-audit) found the Store Setup Wizard's slug availability check returning "Already taken" for every slug tried, including completely random, never-seen values (e.g. `xqz847291abc`) — blocking store creation entirely.

### Root Cause (reproduced and proven, not assumed)
The underlying query logic in `checkSlugAvailability` (`available: !data`) was **correct** — this was proven by standing up a real `PostgREST` server (downloaded and run for this investigation) against a real Postgres instance with our actual schema/RLS applied, fronted by a minimal gateway replicating Supabase's `/rest/v1` routing, then running the exact query through the real `@supabase/supabase-js` client library. Against that real stack, an existing slug correctly returned `available: false` and a brand-new random slug correctly returned `available: true`.

The **actual bug**: `checkSlugAvailability` can legitimately return `{ available: false, error: "..." }` when the check itself fails for any reason (network issue, misconfigured Supabase env vars, transient outage) — but both the wizard's client-side status logic and `createStore`'s server-side re-check only looked at `available`, treating a failed check identically to a genuine slug conflict. Any environment-specific failure on the user's machine was therefore silently relabeled "Already taken" for every slug, with no way to see the real error.

### Fixed
- `apps/web/app/dashboard/setup/store-setup-wizard.tsx`: added an `"error"` state to `SlugStatus`, distinct from `"taken"`. The debounced check now checks `result.error` first and shows *"Couldn't check availability right now — we'll check again when you submit"* (amber, non-blocking) instead of a false "Already taken" (red, blocking).
- `apps/web/app/dashboard/setup/actions.ts`: `createStore`'s server-side re-check now destructures `error` alongside `available` and returns *"Could not verify your store link right now, please try again"* when the check itself failed, instead of falsely claiming the slug is taken.
- Added a regression test (`actions.test.ts`) that simulates the availability check erroring and asserts the response is NOT the "already taken" message and does NOT reach the insert.

### Verified
- **Query correctness**: proven against a real PostgREST + Postgres + RLS + Supabase-shaped gateway stack (existing slug → taken; random slug → available) — this was never actually broken.
- **Error handling fix**: TypeScript 0 errors · ESLint 0 errors/warnings · Unit tests **77/77** (2 new) · `next build` succeeds (`/dashboard/setup` 3.67kB) · RLS isolation suite **25/25** (unaffected — this bug and fix are entirely in application-layer error handling, not RLS/schema).

### Note on production impact
The underlying cause of the *original* check failure on the reporter's machine (why the request errored at all) wasn't captured in the bug report and couldn't be reproduced in this sandbox (no access to their real Supabase project/env). This fix ensures that whatever that cause turns out to be, it will now show as a clear, honest error instead of a misleading block — the immediate blocker is resolved either way. If the check continues to error in the real environment, the visible message will now point at the real problem (connectivity/config) rather than a false slug conflict.

## [Phase 3 — Diagnostic Instrumentation] — 2026-07-20
### Status
The misleading "Already taken" message is fixed (previous entry). The user's manual testing now shows the honest message — "Could not verify your store link right now" — but the *underlying* check is still failing in their real Supabase environment. That environment is not accessible from this sandbox (confirmed: no browser/account access, and the sandbox's network allowlist doesn't reach Supabase's infrastructure at all), so the real cause can't be reproduced here — it has to be read from the reporter's own `npm run dev` terminal.

### Added — Temporary Diagnostic Logging
`apps/web/app/dashboard/setup/actions.ts` — added a `diagLog()` helper (server-side `console.error` only, never sent to the browser) and logging at every step of the flow the bug report asked for:
- `checkSlugAvailability`: input validation result, an env-var sanity check (presence/shape only — never logs actual secret values), the full raw Supabase `{data, error, status, statusText}` response, and any thrown exception (wrapped the previously-unguarded query in try/catch, itself a minor robustness fix)
- `createStore`: validation result, the full `checkSlugAvailability` result it receives, and the full insert `{store, insertError}` result

Clearly marked as temporary in a header comment, with instructions to remove or reduce once the real cause is identified. Verified firing correctly and printing full structured detail via the existing mocked test suite (a test that simulates a Supabase error surfaced the exact diagnostic output expected).

### Verified
TypeScript: 0 errors · ESLint: 0 errors/warnings (switched `console.log` → `console.error` to satisfy the project's lint rule, which only allows `warn`/`error`) · Unit tests: **77/77** (unchanged) · `next build`: succeeds · RLS isolation suite: **25/25** (unaffected — this is pure application-layer logging)

### Next Step
Reporter to reproduce the failure locally with this instrumented build and paste the `[DIAG:...]` terminal output back — that output will show the exact Supabase error (likely one of: invalid/misconfigured `SUPABASE_SERVICE_ROLE_KEY`, malformed `NEXT_PUBLIC_SUPABASE_URL`, or a network-level failure) needed to apply the real, evidence-based fix rather than a guess.

## [Phase 3 — Critical Bugfix, Root Cause] — Table Grants — 2026-07-20
### Root Cause Confirmed (from real diagnostic logs the reporter provided)
The wizard's honest error message (previous entry) surfaced the real underlying failure: `error.code: 42501, message: "permission denied for table stores"`. Every table in this project was created by migrations 0000–0003 via plain `CREATE TABLE`, which grants no privileges to any role except the table's owner. Row-Level Security policies control *which rows* a role can see once it's allowed to query a table — but Postgres requires a separate, more basic table-level `GRANT` before RLS is even evaluated. That grant was never added. This affected every table for `service_role`, `anon`, and `authenticated` alike — not just `stores`, and not just the slug check.

### Fixed — Permanently, via Migration (no manual SQL step)
- Added `packages/database/migrations/0004_grant_api_roles.sql` — grants `SELECT/INSERT/UPDATE/DELETE` on every existing table (and, via `ALTER DEFAULT PRIVILEGES`, every table any *future* migration creates) to `anon`, `authenticated`, `service_role`. Applied via the exact same `psql -f` workflow as every other migration — no ad hoc SQL, no Supabase dashboard step.
- Made the migration **role-existence-defensive**: it checks `pg_roles` before granting to each target role, so it runs safely whether against a real Supabase project (which always has `anon`/`authenticated`/`service_role`) or the local test harness (which uses a single `app_authenticated` role instead) — a plain unconditional `GRANT ... TO service_role` would hard-error against the local harness, since that role doesn't exist there. Found and fixed during this session's own verification, before it could become a second bug.
- Updated `apps/web/tests/rls/run_rls_tests.sh` and `README.md`'s migration list to include `0004` (README was already stale — it was missing `0002` and `0003` too, now corrected).
- Reduced the previous round's temporary diagnostic logging (`apps/web/app/dashboard/setup/actions.ts`) to production-appropriate `console.error` calls on actual failure paths only — no more verbose per-step dumps, consistent with the earlier "remove or reduce to appropriate production logging" instruction. Also fixed a small pre-existing gap while touching this code: the `subscriptions`/`activity_logs` inserts in `createStore` previously discarded their error results silently; they're now logged (non-fatally — the store itself is already created by that point).

### Verified — From a Completely Clean Database (not prior state)
This was proven, not assumed, using the same real PostgREST + Postgres + Supabase-shaped-gateway reproduction stack built for the earlier root-cause investigation:
1. Dropped and rebuilt the test database from scratch, with `anon`/`authenticated`/`service_role`/`authenticator` roles created fresh and **zero manual `GRANT` statements** — only the project's own migration files (`0000`→`0004`) and RLS policies applied, in the same order and via the same commands documented in `README.md`.
2. Ran the exact query `checkSlugAvailability` uses, via the real `service_role` JWT and real `@supabase/supabase-js`: existing slug correctly returned `available: false`; brand-new random slugs correctly returned `available: true` — the original reported symptom.
3. Ran the exact `stores` INSERT `createStore` uses, via a real `authenticated` JWT for a freshly-created user (with the `auth.users`→`public.users` sync trigger fired, matching a real signup): **store creation succeeded end-to-end**, returning a real store `id`.

### Re-verified (full pipeline, after all changes)
TypeScript: 0 errors · ESLint: 0 errors/warnings · Unit tests: **77/77** (unchanged) · `next build`: succeeds, all 17 routes generated · RLS isolation suite: **25/25** (confirmed unaffected — migration 0004 was also exercised inside this suite's own database setup, correctly applying only to the `app_authenticated` role present there)

### For Anyone Cloning This Repo
No manual GRANT statements are needed, ever. Apply migrations `0000` through `0004` in order (see updated `README.md`), then the RLS policy files — that's the complete, self-contained setup.

## [Phase 3 — Migration Workflow Root Cause Fix] — 2026-07-26
### The Actual Root Cause (found with direct evidence, not re-guessed)
Migration `0004_grant_api_roles.sql` (previous entry) was correct SQL, but never reached the live Supabase database. Investigation, with evidence at each step:

1. `packages/database/package.json`'s `db:migrate` script ran `drizzle-kit migrate` — a *completely different mechanism* from the `psql -f migrations/*.sql` workflow this project actually documented and had been using. `drizzle-kit migrate` decides what to apply by reading `migrations/meta/_journal.json`, not by scanning the migrations folder.
2. Diffed that journal against the real files on disk: **`0001_auth_sync.sql` and `0004_grant_api_roles.sql` had no journal entries at all** — both were added by hand (0001 was hand-written from day one; 0004 was created directly without ever running `drizzle-kit generate` to register it). `drizzle-kit migrate` therefore could never have applied either file, *even with a correctly configured `DATABASE_URL`*.
3. Separately confirmed via `grep -rn "dotenv"` that nothing in `packages/database` ever loaded environment variables from a `.env` file — `drizzle.config.ts` read `process.env.DATABASE_URL` directly with zero loading mechanism, explaining the reported `DATABASE_URL is undefined` error.
4. Conclusion, confirmed by reproducing both failures directly: the `db:migrate` npm script was scaffolded in Phase 2, never actually wired up, and never tested end-to-end — it was dead, misleading tooling sitting alongside the real (manual, `README`-documented) `psql` workflow. A reasonable developer trying `npm run db:migrate` — the more obviously "correct" thing to try in a Drizzle project — hit a silent dead end.

### Fixed
- **`packages/database/scripts/migrate.ts`** (new): a self-contained migration runner that does not depend on `drizzle-kit`'s journal at all. Applies every `.sql` file in `migrations/`, in filename order, exactly once, tracked in a real `public._migrations_applied` table in the target database — an inspectable source of truth (`select * from public._migrations_applied`) instead of an opaque JSON file that has to be kept manually in sync. Each migration runs in its own transaction; a failed migration rolls back and is retried cleanly on the next run rather than being silently marked applied.
- **`packages/database/package.json`**: `db:migrate` now runs `tsx scripts/migrate.ts` instead of `drizzle-kit migrate`. Added `postgres` and `dotenv` dependencies.
- **`packages/database/drizzle.config.ts`**: added `dotenv/config` so `drizzle-kit generate`/`drizzle-kit studio` (unaffected otherwise — still the right tool for generating new migration SQL from schema changes) no longer hit the same "DATABASE_URL is undefined" gap.
- **`packages/database/.env.example`** (new): documents that this package loads its own `.env`, separate from `apps/web/.env.local`.
- **`README.md`**: replaced the manual `psql -f migrations/0000...0004...` loop with the single working command (`npm run db:migrate`), and documented how to verify what's actually been applied.

### Related, Non-Blocking Gap Found (not fixed here — out of scope for this bug)
`db:seed` references `packages/database/scripts/seed.ts`, which doesn't exist — the same class of "scaffolded but never built" gap as `db:migrate` was, but not on the store-creation critical path. Flagged for a future pass.

### Verified — With Direct Evidence, Not Assumption
1. Ran the exact new command against a completely clean database (dropped and recreated, Supabase-shaped `auth` schema stub added since that's a real Supabase platform primitive this database wouldn't otherwise have): `npm run db:migrate` — with no `.env` present, it now fails with a clear, actionable message instead of a cryptic one. With `.env` present, **all 5 migrations applied successfully, including 0004**.
2. Directly queried Postgres's own privilege system after the run: `has_table_privilege('service_role', 'public.stores', 'SELECT')` → `true`, `INSERT` → `true`, `has_table_privilege('authenticated', 'public.stores', 'SELECT')` → `true` — the exact permission that was missing, confirmed fixed via the exact command path that failed before.
3. Ran the command a third time to confirm idempotency: correctly reported "Database already up to date — nothing to apply," skipping all 5 files.
4. Full standard pipeline re-run: TypeScript 0 errors · ESLint 0 errors/warnings · Unit tests **77/77** (unchanged) · `next build` succeeds (17 routes) · RLS isolation suite **25/25** (unaffected — this fix is entirely in tooling/workflow, not schema or policies)

### For Anyone Cloning This Repo
`cd packages/database && cp .env.example .env` (fill in `DATABASE_URL`) `&& npm run db:migrate` — one command, no manual GRANT, no manual SQL, no drizzle-kit journal to keep in sync by hand.
