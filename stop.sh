#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.yml"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

GREEN="\033[0;32m"
RED="\033[0;31m"
RESET="\033[0m"

log() { printf "${GREEN}[STOP]${RESET}  %s\n" "$1"; }

if ! command -v docker &> /dev/null; then
  printf "${RED}[ERROR]${RESET} Docker is not installed or not in PATH\n"
  exit 1
fi

log "Stopping all containers..."
docker-compose -f "$COMPOSE_FILE" down --timeout 30 --remove-orphans

echo ""
log "All services and dependencies stopped"
log "Volume data (databases, RabbitMQ, Prometheus, Grafana) preserved"
echo ""
log "To restart, run: ./start.sh"
