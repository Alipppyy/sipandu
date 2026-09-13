#!/usr/bin/env bash
# Satu perintah untuk menyiapkan & menjalankan SIPANDU RW dari awal:
#   bash scripts/bootstrap.sh
#
# Langkah: install dependensi → nyalakan PostgreSQL → migrasi → seed → build → start.
# Aman dijalankan berulang kali (setiap langkah dilewati bila sudah siap).
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf "\n\033[1m%s\033[0m\n" "$*"; }

say "1/6 · Environment"
[ -f .env ] || { cp .env.example .env; echo ".env dibuat dari .env.example"; }

say "2/6 · Dependensi"
if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  npm install
else
  echo "node_modules sudah ada — dilewati"
fi

say "3/6 · Basis data PostgreSQL"
bash scripts/start-db.sh

say "4/6 · Migrasi & Prisma client"
npx prisma migrate deploy
npx prisma generate

say "5/6 · Data demo"
if [ "${SKIP_SEED:-0}" = "1" ]; then
  echo "SKIP_SEED=1 — seeding dilewati"
else
  npx tsx prisma/seed.ts
fi

say "6/6 · Build produksi"
NODE_OPTIONS="--max-old-space-size=${BUILD_MEMORY:-1200}" npx next build

say "✅ Selesai — aplikasi berjalan di http://0.0.0.0:${PORT:-3000}"
exec npm start -- -H 0.0.0.0 -p "${PORT:-3000}"
