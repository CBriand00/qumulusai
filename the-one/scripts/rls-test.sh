#!/usr/bin/env bash
# ============================================================================
#  RLS integration test runner.
#  Stands up a throwaway Postgres, applies the Supabase emulation bootstrap +
#  the app migrations (0001, 0002), then runs the RLS test suite against it.
#
#  Prefers a local Postgres cluster (pg binaries) and falls back to Docker.
#  Usage:  npm run test:rls
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${RLS_TEST_PORT:-55432}"
DB_URL="postgres://postgres@127.0.0.1:${PORT}/postgres"

apply_and_test() {
  local psql_base="psql -h 127.0.0.1 -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
  echo "▶ Applying bootstrap + migrations…"
  $psql_base -f "$ROOT/src/test/rls/bootstrap.sql"
  $psql_base -f "$ROOT/supabase/migrations/0001_init.sql"
  $psql_base -f "$ROOT/supabase/migrations/0002_rls.sql"
  echo "▶ Running RLS tests…"
  RLS_TEST_DB="$DB_URL" npx vitest run src/lib/__tests__/rls.integration.test.ts
}

PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1 || true)"

if [ -n "$PGBIN" ] && command -v sudo >/dev/null 2>&1 && id postgres >/dev/null 2>&1; then
  # ---- Local cluster (no network) -----------------------------------------
  DATADIR="$(mktemp -d)"
  chown postgres "$DATADIR"
  cleanup() {
    sudo -u postgres "$PGBIN/pg_ctl" -D "$DATADIR" stop -m immediate >/dev/null 2>&1 || true
    rm -rf "$DATADIR" || true
  }
  trap cleanup EXIT

  echo "▶ initdb (local cluster)…"
  sudo -u postgres "$PGBIN/initdb" -D "$DATADIR" -U postgres --auth=trust >/dev/null
  echo "▶ Starting Postgres on port $PORT…"
  sudo -u postgres "$PGBIN/pg_ctl" -D "$DATADIR" \
    -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" \
    -l "$DATADIR/server.log" -w start >/dev/null
  apply_and_test
else
  # ---- Docker fallback ----------------------------------------------------
  CONTAINER="theone-rls-pg"
  export PGPASSWORD="postgres"
  DB_URL="postgres://postgres:postgres@127.0.0.1:${PORT}/postgres"
  cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
  trap cleanup EXIT
  cleanup
  echo "▶ Starting Postgres ($CONTAINER) via Docker…"
  docker run -d --rm --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres -p "$PORT:5432" postgres:16 >/dev/null
  for _ in $(seq 1 30); do docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
  apply_and_test
fi
