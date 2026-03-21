#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${1:-.}"
APP_SERVICE="${APP_SERVICE:-app}"
DB_SERVICE="${DB_SERVICE:-postgres}"
LOG_SINCE="${LOG_SINCE:-2h}"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "ERROR: directory '$PROJECT_DIR' does not exist."
  exit 2
fi

cd "$PROJECT_DIR"

if docker compose version >/dev/null 2>&1; then
  compose() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() { docker-compose "$@"; }
else
  echo "ERROR: neither 'docker compose' nor 'docker-compose' is available."
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed or not in PATH."
  exit 2
fi

if command -v sha256sum >/dev/null 2>&1; then
  hash_sha256() { printf '%s' "$1" | sha256sum | awk '{print $1}'; }
elif command -v shasum >/dev/null 2>&1; then
  hash_sha256() { printf '%s' "$1" | shasum -a 256 | awk '{print $1}'; }
else
  echo "ERROR: need sha256sum or shasum for password hash comparison."
  exit 2
fi

get_container_id() {
  local service="$1"
  compose ps -q "$service"
}

get_env_value() {
  local cid="$1"
  local key="$2"
  docker inspect "$cid" --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | awk -v k="$key" '
        index($0, k "=") == 1 {
          sub("^[^=]+=", "", $0)
          print $0
          exit
        }
      '
}

print_env_snapshot() {
  local title="$1"
  local cid="$2"
  shift 2
  echo
  echo "[$title]"
  for key in "$@"; do
    value="$(get_env_value "$cid" "$key" || true)"
    if [ -z "${value:-}" ]; then
      value="<missing>"
    elif [ "$key" = "POSTGRES_PASSWORD" ]; then
      value="***hidden***"
    fi
    printf '  %s=%s\n' "$key" "$value"
  done
}

echo "== Compose Services =="
compose ps

APP_CID="$(get_container_id "$APP_SERVICE")"
DB_CID="$(get_container_id "$DB_SERVICE")"

if [ -z "${APP_CID:-}" ]; then
  echo "ERROR: app container for service '$APP_SERVICE' is not running."
  exit 1
fi

if [ -z "${DB_CID:-}" ]; then
  echo "ERROR: db container for service '$DB_SERVICE' is not running."
  exit 1
fi

echo
echo "APP_CID=$APP_CID"
echo "DB_CID=$DB_CID"

print_env_snapshot \
  "App Env (masked)" \
  "$APP_CID" \
  POSTGRES_HOST POSTGRES_PORT POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD

print_env_snapshot \
  "DB Env (masked)" \
  "$DB_CID" \
  POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD

APP_PW="$(get_env_value "$APP_CID" "POSTGRES_PASSWORD" || true)"
DB_PW="$(get_env_value "$DB_CID" "POSTGRES_PASSWORD" || true)"
APP_PW_SHA="<missing>"
DB_PW_SHA="<missing>"

if [ -n "${APP_PW:-}" ]; then
  APP_PW_SHA="$(hash_sha256 "$APP_PW")"
fi

if [ -n "${DB_PW:-}" ]; then
  DB_PW_SHA="$(hash_sha256 "$DB_PW")"
fi

echo
echo "[Password Hash Compare]"
echo "  APP_PW_SHA=$APP_PW_SHA"
echo "  DB_PW_SHA=$DB_PW_SHA"

APP_PG_HOST="$(get_env_value "$APP_CID" "POSTGRES_HOST" || true)"

echo
echo "[Connectivity Check From App]"
set +e
CONNECT_OUTPUT="$(
  docker exec -i "$APP_CID" node - <<'NODE'
const { Client } = require('pg');
const cfg = {
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  connectionTimeoutMillis: 5000
};

console.log(`CONNECT_TARGET=${cfg.host}:${cfg.port}`);
console.log(`CONNECT_DB=${cfg.database}`);
console.log(`CONNECT_USER=${cfg.user}`);

const c = new Client(cfg);
c.connect()
  .then(() => c.query('select inet_server_addr()::text as server_ip, inet_server_port() as server_port, current_user'))
  .then((r) => {
    const row = r.rows[0] || {};
    console.log(`CONNECTED_SERVER_IP=${row.server_ip || ''}`);
    console.log(`CONNECTED_SERVER_PORT=${row.server_port || ''}`);
    console.log(`CONNECTED_CURRENT_USER=${row.current_user || ''}`);
    return c.end();
  })
  .catch((e) => {
    console.error(`AUTH_OR_CONNECT_FAIL=${e.message}`);
    process.exit(1);
  });
NODE
)"
CONNECT_RC=$?
set -e
printf '%s\n' "$CONNECT_OUTPUT"

PG_CONTAINER_IP="$(docker inspect "$DB_CID" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')"
echo
echo "[Postgres Container IP]"
echo "  DB_CONTAINER_IP=$PG_CONTAINER_IP"

echo
echo "[POSTGRES_HOST Resolution In App]"
set +e
RESOLVE_OUTPUT="$(
  docker exec -i "$APP_CID" sh -lc '
echo "POSTGRES_HOST=$POSTGRES_HOST"
if command -v getent >/dev/null 2>&1; then
  getent ahostsv4 "$POSTGRES_HOST" | awk "{print \$1}" | sort -u
elif command -v nslookup >/dev/null 2>&1; then
  nslookup "$POSTGRES_HOST" 2>/dev/null | awk "/^Address: /{print \$2}" | sort -u
else
  echo "<no-getent-or-nslookup>"
fi
'
)"
RESOLVE_RC=$?
set -e
printf '%s\n' "$RESOLVE_OUTPUT"

RESOLVED_IPS="$(printf '%s\n' "$RESOLVE_OUTPUT" | awk 'NR>1 && $1 ~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/ {print $1}')"

echo
echo "[App Logs Matches: $LOG_SINCE]"
APP_LOG_MATCHES="$(docker logs "$APP_CID" --since "$LOG_SINCE" 2>&1 | grep -E 'P1000|28P01|request errored|Outbox publish cycle failed' || true)"
if [ -n "$APP_LOG_MATCHES" ]; then
  printf '%s\n' "$APP_LOG_MATCHES" | tail -n 100
else
  echo "<no matches>"
fi

echo
echo "[DB Logs Matches: $LOG_SINCE]"
DB_LOG_MATCHES="$(docker logs "$DB_CID" --since "$LOG_SINCE" 2>&1 | grep -E 'password authentication failed|28P01|FATAL' || true)"
if [ -n "$DB_LOG_MATCHES" ]; then
  printf '%s\n' "$DB_LOG_MATCHES" | tail -n 100
else
  echo "<no matches>"
fi

echo
echo "== Result =="
STATUS=0

if [ "$APP_PW_SHA" = "<missing>" ] || [ "$DB_PW_SHA" = "<missing>" ]; then
  echo "WARN: POSTGRES_PASSWORD missing in app or db env."
  STATUS=1
elif [ "$APP_PW_SHA" != "$DB_PW_SHA" ]; then
  echo "WARN: app and db POSTGRES_PASSWORD hashes differ."
  STATUS=1
else
  echo "OK: app and db POSTGRES_PASSWORD hashes match."
fi

if [ "$CONNECT_RC" -ne 0 ]; then
  echo "WARN: app -> db connectivity/auth check failed."
  STATUS=1
else
  echo "OK: app can connect to db with current env."
fi

if [ "${APP_PG_HOST:-}" = "localhost" ] || [ "${APP_PG_HOST:-}" = "127.0.0.1" ]; then
  echo "WARN: app POSTGRES_HOST is '$APP_PG_HOST' (inside container this is usually wrong)."
  STATUS=1
fi

if [ -n "${PG_CONTAINER_IP:-}" ] && [ -n "${RESOLVED_IPS:-}" ]; then
  if ! printf '%s\n' "$RESOLVED_IPS" | grep -qx "$PG_CONTAINER_IP"; then
    echo "WARN: POSTGRES_HOST does not resolve to current db container IP ($PG_CONTAINER_IP)."
    STATUS=1
  else
    echo "OK: POSTGRES_HOST resolves to db container IP."
  fi
elif [ "$RESOLVE_RC" -ne 0 ]; then
  echo "WARN: failed to resolve POSTGRES_HOST from app container."
  STATUS=1
fi

if [ "$STATUS" -eq 0 ]; then
  echo "No obvious auth/routing mismatch found by this script."
else
  echo "Potential mismatch detected. Review WARN lines above."
fi

exit "$STATUS"
