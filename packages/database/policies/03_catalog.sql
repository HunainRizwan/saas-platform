alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;

-- ---------- categories ----------
create policy categories_all_member on public.categories
  for all using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- ---------- products ----------
create policy products_all_member on public.products
  for all using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- ---------- product_images ----------
create policy product_images_all_member on public.product_images
  for all using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- ---------- product_variants ----------
create policy product_variants_all_member on public.product_variants
  for all using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- NOTE: public/anon read policies for the storefront (Phase 5) — e.g.
-- "anyone can SELECT products where store status = 'active' and
-- products.status = 'active'" — are added when the storefront is built,
-- not here. Adding them prematurely without the exact public query shape
-- risks over-broad exposure.
