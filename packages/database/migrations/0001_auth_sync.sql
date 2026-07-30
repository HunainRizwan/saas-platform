-- ============================================================================
-- Supabase Auth ↔ application `users` sync
-- ----------------------------------------------------------------------------
-- Supabase Auth owns identity in `auth.users`. Our `public.users` row holds
-- application-specific fields (full_name, role) keyed on the SAME id. Rather
-- than have every code path remember to insert into public.users after
-- signup, a trigger on auth.users does it once, here, centrally.
--
-- This runs ONLY against a real Supabase project (or any Postgres with a
-- Supabase-shaped `auth.users` table). For local RLS testing without a live
-- Supabase project, tests/rls/ substitutes a stub `auth.users` + `auth.uid()`
-- function that mimics this contract — see tests/rls/00_local_auth_stub.sql.
-- ============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'seller'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();
