#!/bin/sh
set -eu
cd /app
echo "Applying database migrations (Prisma)..."
npx prisma migrate deploy
echo "Starting application..."
exec "$@"
