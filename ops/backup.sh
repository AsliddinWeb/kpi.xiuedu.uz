#!/usr/bin/env bash
# Postgres backup: dumps the kpi database via `docker compose exec` and
# rotates old backups. Intended to run from cron.
#
# Usage:   ./ops/backup.sh
# Cron:    0 3 * * *  cd /path/to/kpi_project && ./ops/backup.sh >> ops/backup.log 2>&1
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# shellcheck disable=SC1091
set -a; source .env; set +a

BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="$BACKUP_DIR/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip > "$OUT_FILE"

echo "Backup yaratildi: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"

find "$BACKUP_DIR" -name "${POSTGRES_DB}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete
