#!/usr/bin/env bash
#
# Resets the banking-system Docker Compose stack to a clean slate: stops all
# project containers, removes named volumes (all DB and broker data), removes
# locally built images for this compose project, and drops orphans.
#
# After this, ./start.sh should bring up a fresh stack (empty DBs re-seeded via
# Flyway/compose init, RabbitMQ empty, etc.).
#
# This script is NOT run automatically. Invoke only when you intend to wipe data.
#
# Usage:
#   ./cleanup-fresh.sh --yes
#   ./cleanup-fresh.sh -y
#
set -euo pipefail

COMPOSE_FILE="docker-compose.yml"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

log() { printf "${GREEN}[CLEAN]${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}[CLEAN]${RESET} %s\n" "$1"; }
fail() { printf "${RED}[CLEAN]${RESET} %s\n" "$1"; exit 1; }

usage() {
  printf "%bBanking system – full Docker reset%b\n" "$BOLD" "$RESET"
  echo ""
  echo "Removes all compose containers, named volumes (PostgreSQL, MongoDB,"
  echo "RabbitMQ, Prometheus, Grafana data), orphans, and locally built images"
  echo "for this project."
  echo ""
  echo "Usage: $0 --yes   (or -y)"
  echo ""
  echo "Then run: ./start.sh"
}

if [[ "${1:-}" != "--yes" && "${1:-}" != "-y" ]]; then
  usage
  exit 1
fi

if ! command -v docker &> /dev/null; then
  fail "Docker is not installed or not in PATH"
fi

if ! docker info > /dev/null 2>&1; then
  fail "Docker daemon is not running"
fi

compose_down() {
  if command -v docker-compose &> /dev/null; then
    docker-compose -f "$COMPOSE_FILE" down "$@"
  elif docker compose version &> /dev/null; then
    docker compose -f "$COMPOSE_FILE" down "$@"
  else
    fail "Neither 'docker-compose' nor 'docker compose' is available"
  fi
}

log "Stopping stack and removing volumes, orphans, and locally built images..."
# -v            remove named volumes declared in the compose file
# --rmi local   remove images built for this compose project (not registry pulls)
compose_down --remove-orphans -v --rmi local --timeout 60

echo ""
log "Cleanup finished. State is fresh for ./start.sh"
warn "All persisted data for this compose project was removed."
echo ""
