alter table public.stores enable row level security;
alter table public.store_staff enable row level security;

-- ---------- stores ----------

create policy stores_select_member on public.stores
  for select using (owner_id = auth.uid() or public.is_store_member(id));

create policy stores_insert_owner on public.stores
  for insert with check (owner_id = auth.uid());

create policy stores_update_member on public.stores
  for update using (owner_id = auth.uid() or public.is_store_member(id));

create policy stores_select_super_admin on public.stores
  for select using (public.is_super_admin());

create policy stores_update_super_admin on public.stores
  for update using (public.is_super_admin());

-- NOTE: no general anon/public SELECT policy on `stores` yet. The public
-- storefront (Phase 5) will need a narrow policy exposing only the fields
-- required to render store.com/{slug} for status = 'active' stores — added
-- when that phase is built, not now, to avoid over-exposing columns
-- (whatsapp_number, address, etc.) before the exact public read shape is
-- designed.

-- ---------- store_staff ----------

create policy store_staff_select_member on public.store_staff
  for select using (public.is_store_member(store_id));

create policy store_staff_manage_owner on public.store_staff
  for all using (
    exists (select 1 from public.stores where id = store_id and owner_id = auth.uid())
  );
