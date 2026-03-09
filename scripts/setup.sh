#!/bin/bash
set -e

echo "Starting PostgreSQL..."
docker compose up db -d

echo "Waiting for PostgreSQL to be ready..."
until docker compose exec db pg_isready -U spending > /dev/null 2>&1; do
  sleep 1
done

echo "Running migrations..."
npx prisma migrate dev

echo "Seeding database..."
npx prisma db seed

echo ""
echo "Setup complete!"
echo "Run 'npm run dev' to start the app."
echo "Visit http://localhost:3000"
