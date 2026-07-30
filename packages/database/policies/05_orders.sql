alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

-- ---------- orders ----------
create policy orders_all_member on public.orders
  for all using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- ---------- order_items ----------
-- Deliberately no store_id on this table (reviewed ARCHITECTURE.md §5.7).
-- Isolation is expressed as a subquery against `orders`, joined on the FK
-- this table already has — no denormalized/duplicated store_id to drift.
create policy order_items_all_via_order on public.order_items
  for all using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and public.is_store_member(orders.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and public.is_store_member(orders.store_id)
    )
  );

-- ---------- order_status_history ----------
create policy order_status_history_all_via_order on public.order_status_history
  for all using (
    exists (
      select 1 from public.orders
      where orders.id = order_status_history.order_id
        and public.is_store_member(orders.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_status_history.order_id
        and public.is_store_member(orders.store_id)
    )
  );

-- Public order creation (checkout, Phase 6) and public tracking (Phase 8)
-- both go through server-side API routes using the service-role key, which
-- bypasses RLS by design under application-level authorization (validating
-- the store is active, the tracking_token matches, etc.) — no anon
-- INSERT/SELECT policy is added on these tables for the public path.
