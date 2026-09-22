#!/usr/bin/env bash
# Restores a Postgres backup created by ops/backup.sh.
# WARNING: this drops and recreates all data in the target database.
#
# Usage: ./ops/restore.sh backups/kpi_20260716_030000.sql.gz
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

if [ $# -ne 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Fayl topilmadi: $BACKUP_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

read -r -p "Bu $POSTGRES_DB bazasidagi barcha mavjud ma'lumotlarni o'chirib, $BACKUP_FILE bilan almashtiradi. Davom etasizmi? [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Bekor qilindi."
  exit 0
fi

gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "Tiklandi: $BACKUP_FILE"
