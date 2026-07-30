-- ============================================================================
-- Two-store seed fixture for RLS isolation testing.
-- Store A ("Ali's Cosmetics") and Store B ("Sana's Boutique") each get one
-- owner user, one product, one customer, one order (with an item and a
-- status-history row), one inventory log, one activity log row, and one
-- notification — i.e. one row in every tenant table — so the isolation
-- suite can assert Store A can never see/touch any of Store B's rows,
-- across every table, not just a subset.
-- ============================================================================

-- Fixed uuids for deterministic assertions in the test suite.
-- Store A
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'ali@example.com');
-- public.users row is created automatically by the handle_new_auth_user()
-- trigger (migrations/0001_auth_sync.sql) — just fix up the display name.
update public.users set full_name = 'Ali' where id = '11111111-1111-1111-1111-111111111111';
insert into public.stores (id, owner_id, slug, name, trial_ends_at) values
  ('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'alis-cosmetics', 'Ali''s Cosmetics', now() + interval '30 days');
insert into public.categories (id, store_id, name, slug) values
  ('a2222222-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 'Skincare', 'skincare');
insert into public.products (id, store_id, category_id, name, slug, price, stock_qty) values
  ('a3333333-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000001', 'Rose Face Wash', 'rose-face-wash', 599.00, 20);
insert into public.product_images (id, store_id, product_id, url) values
  ('a4444444-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 'a3333333-0000-0000-0000-000000000001', 'https://example.com/a.jpg');
insert into public.customers (id, store_id, name, phone) values
  ('a5555555-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 'Fatima', '0300-1111111');
insert into public.orders (id, store_id, customer_id, order_number, subtotal, total, customer_name, customer_phone, customer_address, customer_city, tracking_token) values
  ('a6666666-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 'a5555555-0000-0000-0000-000000000001', 'ALI-1001', 599.00, 599.00, 'Fatima', '0300-1111111', 'House 1', 'Karachi', 'track-a-001');
insert into public.order_items (id, order_id, product_id, product_name, unit_price, quantity, line_total) values
  ('a7777777-0000-0000-0000-000000000001', 'a6666666-0000-0000-0000-000000000001', 'a3333333-0000-0000-0000-000000000001', 'Rose Face Wash', 599.00, 1, 599.00);
insert into public.order_status_history (id, order_id, status) values
  ('a8888888-0000-0000-0000-000000000001', 'a6666666-0000-0000-0000-000000000001', 'pending');
insert into public.inventory_logs (id, store_id, product_id, change_qty, reason, order_id) values
  ('a9999999-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 'a3333333-0000-0000-0000-000000000001', -1, 'order', 'a6666666-0000-0000-0000-000000000001');
insert into public.subscriptions (id, store_id, plan, starts_at, ends_at) values
  ('aa111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 'trial', now(), now() + interval '30 days');
insert into public.activity_logs (id, store_id, actor_user_id, actor_role, action) values
  ('ab111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'seller', 'product.create');
insert into public.notifications (id, store_id, recipient_user_id, type, title) values
  ('ac111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'new_order', 'New order received');

-- Store B (mirror structure, all different uuids/owner)
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'sana@example.com');
update public.users set full_name = 'Sana' where id = '22222222-2222-2222-2222-222222222222';
insert into public.stores (id, owner_id, slug, name, trial_ends_at) values
  ('b1111111-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'sanas-boutique', 'Sana''s Boutique', now() + interval '30 days');
insert into public.categories (id, store_id, name, slug) values
  ('b2222222-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Dresses', 'dresses');
insert into public.products (id, store_id, category_id, name, slug, price, stock_qty) values
  ('b3333333-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'b2222222-0000-0000-0000-000000000001', 'Lawn Suit', 'lawn-suit', 2499.00, 10);
insert into public.product_images (id, store_id, product_id, url) values
  ('b4444444-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'b3333333-0000-0000-0000-000000000001', 'https://example.com/b.jpg');
insert into public.customers (id, store_id, name, phone) values
  ('b5555555-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Ayesha', '0300-2222222');
insert into public.orders (id, store_id, customer_id, order_number, subtotal, total, customer_name, customer_phone, customer_address, customer_city, tracking_token) values
  ('b6666666-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'b5555555-0000-0000-0000-000000000001', 'SANA-1001', 2499.00, 2499.00, 'Ayesha', '0300-2222222', 'House 2', 'Lahore', 'track-b-001');
insert into public.order_items (id, order_id, product_id, product_name, unit_price, quantity, line_total) values
  ('b7777777-0000-0000-0000-000000000001', 'b6666666-0000-0000-0000-000000000001', 'b3333333-0000-0000-0000-000000000001', 'Lawn Suit', 2499.00, 1, 2499.00);
insert into public.order_status_history (id, order_id, status) values
  ('b8888888-0000-0000-0000-000000000001', 'b6666666-0000-0000-0000-000000000001', 'pending');
insert into public.inventory_logs (id, store_id, product_id, change_qty, reason, order_id) values
  ('b9999999-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'b3333333-0000-0000-0000-000000000001', -1, 'order', 'b6666666-0000-0000-0000-000000000001');
insert into public.subscriptions (id, store_id, plan, starts_at, ends_at) values
  ('ba111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'trial', now(), now() + interval '30 days');
insert into public.activity_logs (id, store_id, actor_user_id, actor_role, action) values
  ('bb111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'seller', 'product.create');
insert into public.notifications (id, store_id, recipient_user_id, type, title) values
  ('bc111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'new_order', 'New order received');
