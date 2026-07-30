-- ============================================================================
-- RLS helper: is_store_member(store_id)
-- ----------------------------------------------------------------------------
-- Returns true if the currently authenticated user (auth.uid()) is either
-- the owner of the given store OR a row in store_staff for that store.
-- Every tenant-table policy in this directory calls this function rather
-- than repeating the owner-or-staff join inline — one place to fix if the
-- membership rule ever changes (e.g. adding per-role granularity later).
--
-- SECURITY DEFINER is required so this function can read `stores`/`store_staff`
-- to answer the membership question even when the calling role's own RLS
-- policies on those tables would otherwise block the read — this function
-- IS part of the trust boundary, which is why it lives here, is reviewed
-- carefully, and does nothing except answer true/false.
-- ============================================================================

create or replace function public.is_store_member(target_store_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.stores
    where id = target_store_id
      and owner_id = auth.uid()
  )
  or exists (
    select 1 from public.store_staff
    where store_id = target_store_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'super_admin'
  );
$$;
