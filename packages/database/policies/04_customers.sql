alter table public.customers enable row level security;

create policy customers_all_member on public.customers
  for all using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- Public checkout (Phase 6) creates/looks up customers by (store_id, phone)
-- via the service-role key on the server (not via a client-side RLS bypass) —
-- the checkout API route runs as a trusted server context, not as an
-- anonymous browser session, so no anon INSERT policy is needed here.
