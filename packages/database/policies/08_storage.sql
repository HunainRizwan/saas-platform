-- ============================================================================
-- Store asset storage (logo uploads) — Phase 3
-- ----------------------------------------------------------------------------
-- SUPABASE-ONLY. This file touches `storage.buckets` / `storage.objects`,
-- which are part of Supabase's Storage extension and do not exist on a
-- vanilla Postgres instance. It is NOT applied by
-- apps/web/tests/rls/run_rls_tests.sh (that suite tests our own tenant
-- tables' RLS, which this file is unrelated to) — apply this manually
-- against each real Supabase project (dev/staging/production), the same
-- way migrations/0001_auth_sync.sql's trigger target already requires a
-- real Supabase `auth.users` table.
--
-- Storage layout: store-assets/{store_id}/logo-{timestamp}.{ext}
-- Bucket is public (logos need to render on the public storefront without
-- a signed URL) but WRITE access is restricted to members of that store.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by default on every Supabase
-- project — no `alter table ... enable row level security` needed/allowed
-- here (Supabase manages that table's RLS toggle itself).

create policy "store_assets_insert_own_store" on storage.objects
  for insert
  with check (
    bucket_id = 'store-assets'
    and public.is_store_member(((storage.foldername(name))[1])::uuid)
  );

create policy "store_assets_update_own_store" on storage.objects
  for update
  using (
    bucket_id = 'store-assets'
    and public.is_store_member(((storage.foldername(name))[1])::uuid)
  );

create policy "store_assets_delete_own_store" on storage.objects
  for delete
  using (
    bucket_id = 'store-assets'
    and public.is_store_member(((storage.foldername(name))[1])::uuid)
  );

-- Public read — anyone can view a store's logo (it's meant to be public,
-- same trust level as the storefront itself, which Phase 5 will expose).
create policy "store_assets_public_read" on storage.objects
  for select
  using (bucket_id = 'store-assets');
