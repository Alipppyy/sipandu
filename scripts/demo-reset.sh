#!/usr/bin/env bash
# Reset basis data ke kondisi demo (data contoh realistis)
set -euo pipefail
cd "$(dirname "$0")/.."
npx prisma migrate reset --force --skip-seed
npm run db:seed
