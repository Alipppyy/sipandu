#!/usr/bin/env bash
# Menjalankan PostgreSQL untuk SIPANDU RW.
#
# Klaster basis data disimpan di dalam workspace (~/pgdata) dan dijalankan
# sebagai pengguna workspace (bukan sistem user "postgres") supaya berkasnya
# ikut tersimpan bersama proyek dan dapat dinyalakan kembali kapan saja.
set -euo pipefail

PGDATA="${PGDATA:-$HOME/pgdata}"
SOCK="${PGSOCK:-/tmp/pgsock}"
PORT="${PGPORT:-5432}"
DB="${PGDATABASE:-sipandu}"
USERDB="${PGUSER:-sipandu}"

say() { printf "%s\n" "$*"; }

# 1. Pastikan binary PostgreSQL tersedia (butuh sudo hanya untuk instalasi)
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
if [ -z "$PGBIN" ]; then
  say "📦 PostgreSQL belum terpasang — memasang lewat apt …"
  sudo -n apt-get update -qq
  sudo -n apt-get install -y -qq postgresql postgresql-contrib >/dev/null
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
fi

mkdir -p "$SOCK" "$PGDATA"
chmod 700 "$PGDATA"

# 2. Inisialisasi klaster bila belum ada (berjalan sebagai pengguna workspace)
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  say "⛏  Membuat klaster PostgreSQL baru di $PGDATA …"
  "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust --encoding=UTF8 --locale=C.UTF-8 >/dev/null
fi

# 2b. Direktori runtime yang kosong (pg_notify, pg_stat, …) bisa hilang saat
#     workspace dipulihkan dari snapshot — pastikan selalu ada sebelum start.
for d in pg_notify pg_stat pg_stat_tmp pg_snapshots pg_tblspc pg_twophase \
         pg_commit_ts pg_dynshmem pg_replslot pg_serial \
         pg_wal/archive_status pg_logical/snapshots pg_logical/mappings \
         pg_multixact/members pg_multixact/offsets; do
  [ -d "$PGDATA/$d" ] || mkdir -p "$PGDATA/$d"
done
chmod 700 "$PGDATA"

# 3. Nyalakan server
if "$PGBIN/pg_isready" -h "$SOCK" -p "$PORT" -q 2>/dev/null; then
  say "✅ PostgreSQL sudah berjalan pada 127.0.0.1:$PORT"
else
  say "▶  Menjalankan PostgreSQL ($PGDATA) …"
  "$PGBIN/pg_ctl" -D "$PGDATA" \
    -o "-c unix_socket_directories=$SOCK -p $PORT -c listen_addresses=127.0.0.1" \
    -l "$PGDATA/server.log" start >/dev/null
  sleep 2
fi

# 4. Pastikan role & database aplikasi ada
"$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -d postgres -tAc \
  "SELECT 1 FROM pg_roles WHERE rolname='$USERDB'" | grep -q 1 || \
  "$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -d postgres -c \
    "CREATE ROLE $USERDB LOGIN PASSWORD '$USERDB' SUPERUSER;" >/dev/null

"$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1 || \
  "$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -d postgres -c \
    "CREATE DATABASE $DB OWNER $USERDB;" >/dev/null

say "✅ Basis data siap: postgresql://$USERDB@127.0.0.1:$PORT/$DB"
