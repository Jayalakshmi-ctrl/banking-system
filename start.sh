#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.yml"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

log()  { printf "${GREEN}[START]${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}[WARN]${RESET}  %s\n" "$1"; }
fail() { printf "${RED}[ERROR]${RESET} %s\n" "$1"; exit 1; }

MAX_WAIT_SECONDS=180
HEALTH_POLL_INTERVAL=5

wait_for_healthy() {
  local service_name="$1"
  local url="$2"
  local elapsed=0

  while [ "$elapsed" -lt "$MAX_WAIT_SECONDS" ]; do
    if curl -sf --max-time 3 "$url" > /dev/null 2>&1; then
      log "$service_name is healthy"
      return 0
    fi
    sleep "$HEALTH_POLL_INTERVAL"
    elapsed=$((elapsed + HEALTH_POLL_INTERVAL))
  done
  warn "$service_name did not become healthy within ${MAX_WAIT_SECONDS}s"
  return 1
}

if ! command -v docker &> /dev/null; then
  fail "Docker is not installed or not in PATH"
fi

if ! docker info > /dev/null 2>&1; then
  fail "Docker daemon is not running"
fi

log "Building and starting all services..."
docker-compose -f "$COMPOSE_FILE" up -d --build

log "Waiting for infrastructure to become healthy..."
echo ""

printf '%b%-25s %-40s %s%b\n' "$BOLD" "SERVICE" "URL" "STATUS" "$RESET"
printf '%-25s %-40s %s\n' "-------" "---" "------"

health_url_for() {
  case "$1" in
    "Customer Service") echo "http://localhost:8001/health" ;;
    "Account Service") echo "http://localhost:8002/health" ;;
    "Transaction Service") echo "http://localhost:8003/health" ;;
    "Notification Service") echo "http://localhost:8004/health" ;;
    "RabbitMQ Management") echo "http://localhost:15672" ;;
    "Prometheus") echo "http://localhost:9090/-/healthy" ;;
    "Grafana") echo "http://localhost:3000/api/health" ;;
    *) echo "" ;;
  esac
}

SERVICE_ORDER=(
  "Customer Service"
  "Account Service"
  "Transaction Service"
  "Notification Service"
  "RabbitMQ Management"
  "Prometheus"
  "Grafana"
)

ALL_HEALTHY=true
for name in "${SERVICE_ORDER[@]}"; do
  url="$(health_url_for "$name")"
  if wait_for_healthy "$name" "$url"; then
    printf "  %-23s %-40s ${GREEN}UP${RESET}\n" "$name" "$url"
  else
    printf "  %-23s %-40s ${RED}DOWN${RESET}\n" "$name" "$url"
    ALL_HEALTHY=false
  fi
done

echo ""

log "Running database migrations for Customer Service (Alembic)..."
docker-compose exec -T customer-service alembic upgrade head 2>/dev/null && \
  log "Customer Service migrations applied" || \
  warn "Customer Service migrations may have already been applied"

log "Running database migrations for Transaction Service (Prisma)..."
docker-compose exec -T transaction-service npx prisma migrate deploy 2>/dev/null && \
  log "Transaction Service migrations applied" || \
  warn "Transaction Service migrations may have already been applied"

echo ""
if [ "$ALL_HEALTHY" = true ]; then
  log "All services are up and running"
else
  warn "Some services failed to start. Run 'docker-compose logs <service>' to debug"
fi

echo ""
printf "${BOLD}Service URLs:${RESET}\n"
echo "  Customer Service     : http://localhost:8001        (Swagger: http://localhost:8001/docs)"
echo "  Account Service      : http://localhost:8002        (Swagger: http://localhost:8002/swagger-ui.html)"
echo "  Transaction Service  : http://localhost:8003        (Swagger: http://localhost:8003/api/docs/)"
echo "  Notification Service : http://localhost:8004        (Swagger: http://localhost:8004/apidocs/)"
echo ""
printf "${BOLD}Infrastructure URLs:${RESET}\n"
echo "  RabbitMQ Management  : http://localhost:15672       (guest / guest)"
echo "  Prometheus           : http://localhost:9090"
echo "  Grafana              : http://localhost:3000        (admin / admin)"
echo ""
