#!/usr/bin/env bash
# Runs the schema and row-level security checks against a throwaway Postgres database.
# Usage: PGHOST=localhost PGPORT=5432 PGUSER=postgres scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DB="satchel_rls_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB" >/dev/null 2>&1 || true' EXIT

run() { psql -q -t -v ON_ERROR_STOP=1 -d "$DB" -f "$1" >/dev/null; }
run supabase/tests/shim.sql
run supabase/migrations/20261012000000_init.sql
run supabase/migrations/20261014000000_grants.sql
run supabase/migrations/20261014100000_listening.sql
run supabase/seed.sql
# Clear the seed so the checks start from a known state.
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "truncate public.articles, public.photos, public.collections, public.films, public.film_lists, public.journal_entries, public.listens, public.playlists, public.messages cascade; insert into public.site_settings (id) values (1) on conflict do nothing;"
psql -q -t -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/rls.test.sql 2>&1 | grep -E "ok |FAIL|ERROR|passed" | sed "s/^.*NOTICE:  //"
exit "${PIPESTATUS[0]}"
