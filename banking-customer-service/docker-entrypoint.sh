#!/bin/sh
set -eu
cd /app
echo "Applying database migrations (Alembic)..."
alembic upgrade head
SEED_CSV="${CUSTOMER_SEED_CSV:-/app/seed/data/bank_customers.csv}"
if [ -f "$SEED_CSV" ]; then
  echo "Seeding customers from ${SEED_CSV}..."
  python /app/seed/seed.py "$SEED_CSV"
else
  echo "WARN: Customer seed CSV not found at ${SEED_CSV}; skipping seed."
fi
echo "Starting application..."
exec "$@"
