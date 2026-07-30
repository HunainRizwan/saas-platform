-- ============================================================================
-- LOCAL TESTING ONLY — stub of Supabase's auth schema.
-- ----------------------------------------------------------------------------
-- Real Supabase projects provide `auth.users` and `auth.uid()` natively;
-- this file recreates just enough of that contract so our RLS policies
-- (which call auth.uid()) can be tested against a plain local Postgres
-- instance without needing a live Supabase project. This file is NEVER
-- run against dev/staging/production Supabase databases — those already
-- have the real thing.
-- ============================================================================

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

-- Mimics Supabase's auth.uid(): reads the current request's JWT-derived
-- user id. In real Supabase this comes from the verified JWT; here it's a
-- session variable the test harness sets explicitly per simulated request.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

-- A non-superuser role to actually run queries "as" a seller — RLS is a
-- no-op for superusers/table owners, so tests MUST run as this role to be
-- meaningful.
do $$
begin
  if not exists (select from pg_roles where rolname = 'app_authenticated') then
    create role app_authenticated nologin;
  end if;
end
$$;

grant usage on schema public, auth to app_authenticated;
grant select, insert, update, delete on all tables in schema public to app_authenticated;
grant execute on all functions in schema public to app_authenticated;
grant execute on function auth.uid() to app_authenticated;
