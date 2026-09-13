#!/usr/bin/env bash
# Jalankan basis data lalu aplikasi (development)
set -euo pipefail
cd "$(dirname "$0")/.."
./scripts/start-db.sh
[ -f .env ] || cp .env.example .env
npm run dev -- -H 0.0.0.0 -p "${PORT:-3000}"
