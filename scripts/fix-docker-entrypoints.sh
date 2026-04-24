#!/usr/bin/env bash
# Normalizes CRLF/CR in Docker entrypoint scripts (fixes
# "exec /docker-entrypoint.sh: no such file or directory" on Linux when CRLF
# is present), then rebuilds images that COPY those files.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
PROJECT_FLAG=()
if [ "${#}" -ge 1 ] && [ -n "${1}" ]; then
  PROJECT_FLAG=(-p "${1}")
elif [ -n "${COMPOSE_PROJECT_NAME:-}" ]; then
  PROJECT_FLAG=(-p "${COMPOSE_PROJECT_NAME}")
fi

export ROOT
export RELS_LINES="$(printf '%s\n' \
  "banking-customer-service/docker-entrypoint.sh" \
  "banking-transaction-service/docker-entrypoint.sh")"

echo "Repository root: ${ROOT}"
echo "Stripping CR/CRLF from entrypoint scripts..."

python3 <<'PY'
import os
import pathlib
import stat

root = pathlib.Path(os.environ["ROOT"])
for rel in os.environ["RELS_LINES"].splitlines():
    rel = rel.strip()
    if not rel:
        continue
    path = root / rel
    if not path.is_file():
        print(f"skip (missing): {path}")
        continue
    data = path.read_bytes()
    before = len(data)
    normalized = data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    if normalized != data:
        path.write_bytes(normalized)
        print(f"normalized: {path} ({before} -> {len(normalized)} bytes)")
    else:
        print(f"already LF: {path}")
    path.chmod(path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
PY

echo ""
echo "Rebuilding Docker images that embed these scripts (no cache)..."
docker compose "${PROJECT_FLAG[@]}" -f "${COMPOSE_FILE}" build --no-cache customer-service transaction-service

echo ""
echo "Done. Example:"
if [ "${#PROJECT_FLAG[@]}" -gt 0 ]; then
  echo "  docker compose ${PROJECT_FLAG[*]} -f ${COMPOSE_FILE} up -d --build"
else
  echo "  docker compose -f ${COMPOSE_FILE} up -d --build"
fi
