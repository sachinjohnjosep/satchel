#!/usr/bin/env bash
# Sets up a throwaway database for the end-to-end tests: schema, seed, and one admin.
# Requires a local Postgres (PGHOST/PGPORT/PGUSER). Test harness only.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${E2E_DB:-satchel_e2e}"
dropdb --if-exists "$DB" >/dev/null 2>&1 || true
createdb "$DB"
run() { psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1" >/dev/null; }
run supabase/tests/shim.sql
run supabase/migrations/20261012000000_init.sql
run supabase/migrations/20261014000000_grants.sql
run supabase/seed.sql
HASH=$(printf '%s' "${E2E_ADMIN_PASSWORD:-correct horse battery}" | sha256sum | cut -d' ' -f1)
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
insert into auth.users (id, email, password_hash) values
  ('11111111-1111-4111-8111-111111111111', 'admin@example.test', '$HASH'),
  ('22222222-2222-4222-8222-222222222222', 'visitor@example.test', '$HASH');
insert into public.admins (user_id) values ('11111111-1111-4111-8111-111111111111');
SQL
echo "e2e database ready: $DB"
