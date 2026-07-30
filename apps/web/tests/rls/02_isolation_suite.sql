-- ============================================================================
-- RLS ISOLATION TEST SUITE
-- ----------------------------------------------------------------------------
-- Runs as `app_authenticated` (a real non-superuser role — RLS is a no-op
-- for superusers/owners) with app.current_user_id set to Store A's owner
-- (Ali, 11111111-...-111). Every assertion below must return the row count
-- shown in the comment. Any deviation is a tenant-isolation failure and
-- must block Phase 3 from starting.
--
-- Run with:
--   psql -v ON_ERROR_STOP=1 -f 02_isolation_suite.sql
-- and inspect output — a companion runner script (run_rls_tests.sh) greps
-- for FAIL and exits non-zero for CI.
-- ============================================================================

set role app_authenticated;
set app.current_user_id = '11111111-1111-1111-1111-111111111111'; -- Ali, Store A owner

-- ---------------------------------------------------------------------------
-- 1. Ali can see his own store, not Store B's.
-- ---------------------------------------------------------------------------
select
  case when count(*) = 1 then 'PASS 1a: sees own store'
       else 'FAIL 1a: expected 1 own store, got ' || count(*) end
from public.stores where id = 'a1111111-0000-0000-0000-000000000001';

select
  case when count(*) = 0 then 'PASS 1b: cannot see Store B'
       else 'FAIL 1b: expected 0, got ' || count(*) end
from public.stores where id = 'b1111111-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 2. Products: Ali sees only his own product.
-- ---------------------------------------------------------------------------
select
  case when count(*) = 1 then 'PASS 2a: sees own product'
       else 'FAIL 2a: got ' || count(*) end
from public.products where store_id = 'a1111111-0000-0000-0000-000000000001';

select
  case when count(*) = 0 then 'PASS 2b: cannot see Store B product'
       else 'FAIL 2b: got ' || count(*) end
from public.products where store_id = 'b1111111-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 3. Categories
-- ---------------------------------------------------------------------------
select
  case when count(*) = 0 then 'PASS 3: cannot see Store B category'
       else 'FAIL 3: got ' || count(*) end
from public.categories where store_id = 'b1111111-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 4. product_images
-- ---------------------------------------------------------------------------
select
  case when count(*) = 0 then 'PASS 4: cannot see Store B product image'
       else 'FAIL 4: got ' || count(*) end
from public.product_images where store_id = 'b1111111-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 5. Customers
-- ---------------------------------------------------------------------------
select
  case when count(*) = 0 then 'PASS 5: cannot see Store B customer'
       else 'FAIL 5: got ' || count(*) end
from public.customers where store_id = 'b1111111-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 6. Orders
-- ---------------------------------------------------------------------------
select
  case when count(*) = 0 then 'PASS 6: cannot see Store B order'
       else 'FAIL 6: got ' || count(*) end
from public.orders where store_id = 'b1111111-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 7. order_items — the subquery-based policy (no store_id column on this
--    table itself — this is the one most likely to have a subtle bug).
-- ---------------------------------------------------------------------------
select
  case when count(*) = 1 then 'PASS 7a: sees own order item'
       else 'FAIL 7a: got ' || count(*) end
from public.order_items where order_id = 'a6666666-0000-0000-0000-000000000001';

select
  case when count(*) = 0 then 'PASS 7b: cannot see Store B order item via subquery policy'
       else 'FAIL 7b: got ' || count(*) end
from public.order_items where order_id = 'b6666666-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 8. order_status_history
-- ---------------------------------------------------------------------------
select
  case when count(*) = 0 then 'PASS 8: cannot see Store B order status history'
       else 'FAIL 8: got ' || count(*) end
from public.order_status_history where order_id = 'b6666666-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 9. inventory_logs
-- ---------------------------------------------------------------------------
select
  case when count(*) = 0 then 'PASS 9: cannot see Store B inventory log'
       else 'FAIL 9: got ' || count(*) end
from public.inventory_logs where store_id = 'b1111111-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 10. subscriptions (select allowed for members; write restricted to admin —
--     tested separately in 11)
-- ---------------------------------------------------------------------------
select
  case when count(*) = 0 then 'PASS 10: cannot see Store B subscription'
       else 'FAIL 10: got ' || count(*) end
from public.subscriptions where store_id = 'b1111111-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 11. Sellers cannot write to subscriptions even for their OWN store
--     (writes restricted to super_admin per policy 06).
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    update public.subscriptions set plan = 'yearly' where store_id = 'a1111111-0000-0000-0000-000000000001';
    if found then
      raise notice 'FAIL 11: seller was able to update own subscription (should be admin-only)';
    else
      raise notice 'PASS 11: seller update to subscriptions affected 0 rows (blocked by RLS)';
    end if;
  end;
end
$$;

-- ---------------------------------------------------------------------------
-- 12. activity_logs
-- ---------------------------------------------------------------------------
select
  case when count(*) = 0 then 'PASS 12: cannot see Store B activity log'
       else 'FAIL 12: got ' || count(*) end
from public.activity_logs where store_id = 'b1111111-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 13. notifications — scoped to recipient_user_id, not store membership;
--     Ali should not see Sana's notification even though both are "sellers".
-- ---------------------------------------------------------------------------
select
  case when count(*) = 0 then 'PASS 13: cannot see Sana''s notification'
       else 'FAIL 13: got ' || count(*) end
from public.notifications where recipient_user_id = '22222222-2222-2222-2222-222222222222';

-- ---------------------------------------------------------------------------
-- 14. Cross-tenant WRITE attempts must also fail, not just reads.
--     Attempt to update Store B's product while impersonating Ali.
-- ---------------------------------------------------------------------------
do $$
begin
  update public.products set name = 'HACKED' where store_id = 'b1111111-0000-0000-0000-000000000001';
  if found then
    raise notice 'FAIL 14: cross-tenant UPDATE succeeded — RLS isolation broken';
  else
    raise notice 'PASS 14: cross-tenant UPDATE affected 0 rows (blocked by RLS)';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 15. Attempt to INSERT a product directly into Store B while impersonating
--     Ali — the with check clause must reject this.
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    insert into public.products (store_id, name, slug, price)
    values ('b1111111-0000-0000-0000-000000000001', 'Injected Product', 'injected-product', 1.00);
    raise notice 'FAIL 15: cross-tenant INSERT succeeded — RLS isolation broken';
  exception when insufficient_privilege or others then
    raise notice 'PASS 15: cross-tenant INSERT rejected (%)' , sqlerrm;
  end;
end
$$;

-- ---------------------------------------------------------------------------
-- 16. Switch identity to Sana (Store B owner) and confirm symmetric
--     isolation — Sana cannot see Ali's store either. Guards against a
--     policy that accidentally only works in one direction.
-- ---------------------------------------------------------------------------
set app.current_user_id = '22222222-2222-2222-2222-222222222222'; -- Sana, Store B owner

select
  case when count(*) = 0 then 'PASS 16: Sana cannot see Store A'
       else 'FAIL 16: got ' || count(*) end
from public.stores where id = 'a1111111-0000-0000-0000-000000000001';

select
  case when count(*) = 1 then 'PASS 17: Sana sees her own store'
       else 'FAIL 17: got ' || count(*) end
from public.stores where id = 'b1111111-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 18. Unauthenticated (no app.current_user_id set at all) sees nothing.
-- ---------------------------------------------------------------------------
set app.current_user_id = '';

select
  case when count(*) = 0 then 'PASS 18: unauthenticated session sees zero stores'
       else 'FAIL 18: got ' || count(*) end
from public.stores;

-- ---------------------------------------------------------------------------
-- 19. PRIVILEGE ESCALATION: an authenticated seller must never be able to
--     change their own `role` column via a direct update — found during
--     the Phase 2 final audit (packages/database/policies/07_security_fixes.sql).
--     This is the single most important test in this file after the
--     multi-tenant isolation checks above: a broken version of this allows
--     any signed-up user to grant themselves super_admin.
-- ---------------------------------------------------------------------------
set role app_authenticated;
set app.current_user_id = '11111111-1111-1111-1111-111111111111'; -- Ali, an ordinary seller

do $$
begin
  begin
    update public.users set role = 'super_admin' where id = '11111111-1111-1111-1111-111111111111';
    raise notice 'FAIL 19: seller successfully escalated their own role — CRITICAL';
  exception when others then
    raise notice 'PASS 19: role self-escalation blocked (%)', sqlerrm;
  end;
end
$$;

select
  case when role = 'seller' then 'PASS 19b: role remained seller after blocked escalation attempt'
       else 'FAIL 19b: role is now ' || role end
from public.users where id = '11111111-1111-1111-1111-111111111111';

-- Sanity: the same seller CAN still update their own non-role fields.
update public.users set full_name = 'Ali (updated)' where id = '11111111-1111-1111-1111-111111111111';
select
  case when full_name = 'Ali (updated)' then 'PASS 19c: non-role self-update still works'
       else 'FAIL 19c: got ' || full_name end
from public.users where id = '11111111-1111-1111-1111-111111111111';

reset role;

-- ---------------------------------------------------------------------------
-- 20. A real super_admin CAN change another user's role (the legitimate
--     path the trigger in 07_security_fixes.sql is designed to still allow).
-- ---------------------------------------------------------------------------
-- `reset role` (end of test 19) restores the Postgres role but NOT custom
-- session variables — app.current_user_id was still Ali's id from test 19.
-- Bug caught here: this bootstrap step must run with NO simulated identity
-- (auth.uid() IS NULL), the same "trusted direct context" path proven in
-- the standalone audit. Without clearing it first, this INSERT/UPDATE would
-- itself be misread as an authenticated non-admin trying to grant a role.
set app.current_user_id = '';

insert into auth.users (id, email) values ('55555555-5555-5555-5555-555555555555', 'admin@example.com')
  on conflict (id) do nothing;
update public.users set role = 'super_admin' where id = '55555555-5555-5555-5555-555555555555';

set role app_authenticated;
set app.current_user_id = '55555555-5555-5555-5555-555555555555';

update public.users set role = 'staff' where id = '11111111-1111-1111-1111-111111111111';
select
  case when role = 'staff' then 'PASS 20: super_admin can change another users role'
       else 'FAIL 20: got ' || role end
from public.users where id = '11111111-1111-1111-1111-111111111111';

-- restore fixture state for repeatability
update public.users set role = 'seller' where id = '11111111-1111-1111-1111-111111111111';

reset role;
