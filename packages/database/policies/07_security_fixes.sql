-- ============================================================================
-- SECURITY FIX: prevent role self-escalation on public.users
-- ----------------------------------------------------------------------------
-- Found during Phase 2 final audit: `users_update_own` (01_users.sql) allows
-- any user to UPDATE their own row (id = auth.uid()), but a Postgres RLS
-- USING clause on UPDATE cannot compare OLD.role to NEW.role — it can only
-- gate row *visibility*, not which columns are allowed to change within an
-- otherwise-visible row. Verified exploitable: a seller calling
-- `update users set role = 'super_admin' where id = auth.uid()` through the
-- ordinary Supabase client (anon key + their own session — no RLS bypass
-- needed) succeeded and actually changed their role.
--
-- Fix: a BEFORE UPDATE trigger that rejects any change to `role` unless the
-- ACTOR (not the target row) is already a super_admin. This is the standard
-- pattern for column-level write restriction under Postgres RLS, since RLS
-- itself has no native column-grant mechanism expressive enough for this
-- case (a real column-privilege GRANT would block the whole column for a
-- role, not just for non-admin actors on their own row).
-- ============================================================================

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- auth.uid() is NULL when there is no end-user session at all — i.e.
    -- a direct/trusted connection (migrations, seed scripts, an operator
    -- with raw DB access, or a service-role job with no user JWT). That
    -- tier already has full control of the database by other means (it
    -- could drop this trigger entirely), so this fix isn't trying to stop
    -- it — it exists specifically to stop an AUTHENTICATED END-USER
    -- SESSION (auth.uid() IS NOT NULL) from calling update on their own
    -- row through the ordinary client SDK and granting themselves a role
    -- they don't have. That's the exploit this trigger closes; without
    -- this NULL carve-out, bootstrapping the very first super_admin
    -- becomes impossible (verified: see Phase 2 audit notes).
    if auth.uid() is not null and not public.is_super_admin() then
      raise exception 'Only a super_admin may change a user''s role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_self_escalation on public.users;
create trigger trg_prevent_role_self_escalation
  before update on public.users
  for each row execute procedure public.prevent_role_self_escalation();

-- ============================================================================
-- GAP FIX: 01_users.sql had users_select_super_admin but no corresponding
-- UPDATE policy — a super_admin could SELECT any user but not UPDATE any
-- user, so there was no legitimate path for an admin to ever change
-- someone's role (needed for Phase 12's admin panel, and for the
-- role-change flow the trigger above is explicitly designed to allow).
-- Verified missing via the Phase 2 audit's Case 3 test (an authenticated
-- super_admin's UPDATE to another user's row matched 0 rows — blocked by
-- RLS row-visibility, not by the trigger).
-- ============================================================================

create policy users_update_super_admin on public.users
  for update using (public.is_super_admin())
  with check (public.is_super_admin());
