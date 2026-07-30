#!/usr/bin/env bash
# ============================================================================
# RLS Isolation Test Runner
# ----------------------------------------------------------------------------
# Rebuilds a throwaway test database from the real migrations + real policy
# files (not a hand-copied approximation), seeds the two-store fixture, runs
# the isolation suite, and fails (non-zero exit) if any assertion prints FAIL
# or if any step errors. This is the script CI calls — see
# .github/workflows/ci.yml "rls-isolation" job.
#
# Requires: a reachable Postgres instance via $DATABASE_URL (or defaults to
# local settings below, matching the sandbox this was developed against).
# ============================================================================
set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres}"
export PGPASSWORD
TEST_DB="rls_test_ci"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
DB_DIR="$ROOT_DIR/packages/database"
RLS_DIR="$ROOT_DIR/apps/web/tests/rls"

psql_cmd() {
  psql -h "$PGHOST" -U "$PGUSER" -v ON_ERROR_STOP=1 "$@"
}

echo "==> Dropping/recreating $TEST_DB"
dropdb -h "$PGHOST" -U "$PGUSER" --if-exists "$TEST_DB"
createdb -h "$PGHOST" -U "$PGUSER" "$TEST_DB"

echo "==> Applying base schema migration"
psql_cmd -d "$TEST_DB" -f "$DB_DIR/migrations/0000_initial_schema.sql" >/dev/null

echo "==> Applying Phase 3 schema additions (store setup wizard fields)"
psql_cmd -d "$TEST_DB" -f "$DB_DIR/migrations/0002_store_setup_fields.sql" >/dev/null

echo "==> Applying Phase 3c schema additions (Pixel tracking fields)"
psql_cmd -d "$TEST_DB" -f "$DB_DIR/migrations/0003_pixel_tracking_fields.sql" >/dev/null

echo "==> Applying API role grants (fixes 'permission denied for table' bug)"
psql_cmd -d "$TEST_DB" -f "$DB_DIR/migrations/0004_grant_api_roles.sql" >/dev/null

echo "==> Applying local auth stub (test-only — real envs use live Supabase auth)"
psql_cmd -d "$TEST_DB" -f "$RLS_DIR/00_local_auth_stub.sql" >/dev/null

echo "==> Applying auth-sync trigger"
psql_cmd -d "$TEST_DB" -f "$DB_DIR/migrations/0001_auth_sync.sql" >/dev/null

echo "==> Applying RLS policies"
for f in "$DB_DIR"/policies/*.sql; do
  # 08_storage.sql targets Supabase's storage schema (storage.buckets /
  # storage.objects), which doesn't exist on vanilla local Postgres — it's
  # documented Supabase-only in its own header comment and is applied
  # manually against real Supabase projects instead (see README.md).
  if [[ "$(basename "$f")" == "08_storage.sql" ]]; then
    echo "    (skipping $(basename "$f") — Supabase-only, not applicable to local Postgres)"
    continue
  fi
  psql_cmd -d "$TEST_DB" -f "$f" >/dev/null
done

echo "==> Seeding two-store fixture"
psql_cmd -d "$TEST_DB" -f "$RLS_DIR/01_seed_fixture.sql" >/dev/null

echo "==> Running isolation suite"
OUTPUT=$(psql -h "$PGHOST" -U "$PGUSER" -d "$TEST_DB" -v ON_ERROR_STOP=1 -f "$RLS_DIR/02_isolation_suite.sql" 2>&1)
echo "$OUTPUT" | grep -E "PASS|FAIL" || true

FAIL_COUNT=$(echo "$OUTPUT" | grep -c "FAIL" || true)
PASS_COUNT=$(echo "$OUTPUT" | grep -c "PASS" || true)

echo "----------------------------------------"
echo "RLS isolation suite: $PASS_COUNT passed, $FAIL_COUNT failed"

echo "==> Cleaning up $TEST_DB"
dropdb -h "$PGHOST" -U "$PGUSER" --if-exists "$TEST_DB"

if [ "$FAIL_COUNT" -ne 0 ]; then
  echo "RLS ISOLATION SUITE FAILED — blocking merge/deploy."
  exit 1
fi

echo "RLS isolation suite: ALL CHECKS PASSED."
exit 0
