#!/usr/bin/env bash
# Starts/stops the local Supabase stand-in and the Next.js server for end-to-end tests.
# Usage: scripts/e2e-services.sh start|stop|restart [dev|prod]
# Test harness only.
set -uo pipefail
cd "$(dirname "$0")/.."
# Logs and test uploads live outside the project, so the dev server's file
# watcher doesn't see them change and reload the page in a loop.
RUN="${E2E_RUN_DIR:-${TMPDIR:-/tmp}/satchel-e2e-run}"
mkdir -p "$RUN"
MODE="${2:-dev}"
: "${PGHOST:=/tmp}" "${PGPORT:=54329}" "${PGUSER:=postgres}"

stop() {
  for f in "$RUN"/*.pid; do
    [ -f "$f" ] || continue
    kill "$(cat "$f")" 2>/dev/null
    rm -f "$f"
  done
  # next dev/start spawn children; free the port too
  fuser -k 3000/tcp >/dev/null 2>&1 || true
  fuser -k 54321/tcp >/dev/null 2>&1 || true
}

start() {
  SHIM_DATABASE_URL="postgres://${PGUSER}@/${E2E_DB:-satchel_e2e}?host=${PGHOST}&port=${PGPORT}" \
    SHIM_STORAGE_DIR="$RUN/storage" nohup node e2e/supabase-shim.mjs >"$RUN/shim.log" 2>&1 &
  echo $! >"$RUN/shim.pid"
  for _ in $(seq 1 30); do grep -q SERVICE_KEY "$RUN/shim.log" 2>/dev/null && break; sleep 0.2; done
  ANON=$(grep ANON_KEY "$RUN/shim.log" | cut -d= -f2)
  SVC=$(grep SERVICE_KEY "$RUN/shim.log" | cut -d= -f2)
  cat >.env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON
SUPABASE_SECRET_KEY=$SVC
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_IMAGE_UNOPTIMIZED=1
RATE_LIMIT_SALT=e2e-salt
EOF
  if [ "$MODE" = "prod" ]; then
    nohup npx next start -p 3000 >"$RUN/next.log" 2>&1 &
  else
    nohup npx next dev -p 3000 >"$RUN/next.log" 2>&1 &
  fi
  echo $! >"$RUN/next.pid"
  for _ in $(seq 1 60); do curl -s -o /dev/null http://localhost:3000/robots.txt && break; sleep 0.5; done
  echo "services up ($MODE)"
}

case "${1:-}" in
  start) start ;;
  stop) stop; echo "stopped" ;;
  restart) stop; sleep 1; start ;;
  *) echo "usage: $0 start|stop|restart [dev|prod]"; exit 1 ;;
esac
