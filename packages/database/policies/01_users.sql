alter table public.users enable row level security;

-- A user can always read and update their own row.
create policy users_select_own on public.users
  for select using (id = auth.uid());

create policy users_update_own on public.users
  for update using (id = auth.uid());

-- super_admin can read every user (needed for the admin panel, Phase 12).
create policy users_select_super_admin on public.users
  for select using (public.is_super_admin());

-- No general insert/delete policy: rows are created exclusively by the
-- handle_new_auth_user() trigger (migrations/0001_auth_sync.sql), which
-- runs as SECURITY DEFINER and bypasses RLS by design.
