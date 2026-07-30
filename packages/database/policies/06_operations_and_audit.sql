alter table public.inventory_logs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;

-- ---------- inventory_logs ----------
create policy inventory_logs_all_member on public.inventory_logs
  for all using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- ---------- subscriptions ----------
-- Sellers can read their own subscription (billing settings screen) but
-- cannot write to it directly — only server-side billing logic / admin
-- actions should change plan/status, so writes are restricted to super_admin.
create policy subscriptions_select_member on public.subscriptions
  for select using (public.is_store_member(store_id));

create policy subscriptions_write_super_admin on public.subscriptions
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------- activity_logs ----------
-- Sellers can read their own store's activity log (future "activity" UI);
-- writes come exclusively from application code using the service-role
-- key (so ip_address/user_agent can be captured server-side), not from
-- authenticated client sessions directly.
create policy activity_logs_select_member on public.activity_logs
  for select using (store_id is not null and public.is_store_member(store_id));

create policy activity_logs_select_super_admin on public.activity_logs
  for select using (public.is_super_admin());

-- ---------- notifications ----------
create policy notifications_select_own on public.notifications
  for select using (recipient_user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update using (recipient_user_id = auth.uid());
