-- ============================================================================
-- Grant table access to Supabase's API roles (anon, authenticated, service_role)
-- ----------------------------------------------------------------------------
-- ROOT CAUSE (confirmed via real diagnostic logs from production manual
-- testing): every table in this project was created by migrations 0000-0003
-- via plain `CREATE TABLE`, which grants NO privileges to any role except
-- the table's owner. Row-Level Security policies (packages/database/policies/)
-- control WHICH ROWS a role can see once it's allowed to query a table at
-- all — but Postgres requires a separate, more basic table-level GRANT
-- before RLS is even evaluated. Supabase's platform sets this up
-- automatically for schema/data created through its own dashboard tooling,
-- but tables created by our own raw SQL migrations never received it,
-- so every query from `service_role` (used by checkSlugAvailability,
-- createStore's subscriptions/activity_logs writes, etc.) and from
-- `anon`/`authenticated` (used by the RLS-respecting server/browser
-- clients) failed with `permission denied for table X` (Postgres error
-- 42501) — regardless of how correct the RLS policies protecting that
-- table were.
--
-- This migration does two things:
--   1. Grants the necessary privileges on every EXISTING table (fixes the
--      bug for a database that already has 0000-0003 applied).
--   2. Sets ALTER DEFAULT PRIVILEGES for the role that runs migrations, so
--      every FUTURE table created by later migrations (Phase 4+: products,
--      orders, categories, etc.) gets these grants automatically — this is
--      the part that makes the fix permanent rather than a one-time patch,
--      per the explicit requirement that no phase should ever need a
--      manual GRANT statement again.
--
-- DEFENSIVE BY DESIGN: every grant below only runs if the target role
-- actually exists in the current database. A real Supabase project always
-- has anon/authenticated/service_role as fixed platform roles, so on
-- Supabase this runs unconditionally. Local/CI test databases (see
-- apps/web/tests/rls/00_local_auth_stub.sql, which uses a single
-- `app_authenticated` role instead of Supabase's three-role split) simply
-- skip whichever roles aren't present, instead of erroring the whole
-- migration — `GRANT ... TO a_role_that_does_not_exist` fails hard in
-- plain Postgres, so a plain unconditional GRANT would break any
-- non-Supabase-shaped database.
--
-- Safe to re-run: every statement here is idempotent.
-- ============================================================================

do $$
declare
  target_role text;
begin
  foreach target_role in array array['anon', 'authenticated', 'service_role', 'app_authenticated']
  loop
    if exists (select 1 from pg_roles where rolname = target_role) then
      execute format('grant usage on schema public to %I', target_role);
      execute format(
        'grant select, insert, update, delete on all tables in schema public to %I',
        target_role
      );
      execute format('grant usage, select on all sequences in schema public to %I', target_role);
      execute format('grant execute on all functions in schema public to %I', target_role);

      -- Ensures every table created by FUTURE migrations (Phase 4 onward)
      -- is automatically granted to this role at creation time, without
      -- anyone needing to remember to add a GRANT statement to each new
      -- migration file. `current_user` is whichever role actually runs
      -- this migration (via DATABASE_URL) — the same role every later
      -- migration will run as, since migrations are always applied the
      -- same way (see README.md).
      execute format(
        'alter default privileges for role %I in schema public grant select, insert, update, delete on tables to %I',
        current_user, target_role
      );
      execute format(
        'alter default privileges for role %I in schema public grant usage, select on sequences to %I',
        current_user, target_role
      );
      execute format(
        'alter default privileges for role %I in schema public grant execute on functions to %I',
        current_user, target_role
      );
    end if;
  end loop;
end
$$;
