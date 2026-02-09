#!/bin/bash
# Database backup script for FIS-Learn
# Usage: ./scripts/backup-db.sh [daily|weekly|monthly|manual]
#
# Environment variables:
#   DATABASE_URL  - PostgreSQL connection string (required)
#   BACKUP_DIR    - Directory for backups (default: ./backups)

set -euo pipefail

BACKUP_TYPE="${1:-daily}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is required"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting ${BACKUP_TYPE} backup..."

pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup saved: $BACKUP_FILE ($BACKUP_SIZE)"

# Retention policy - clean up old backups
case "$BACKUP_TYPE" in
  daily)   find "$BACKUP_DIR" -name "daily_*" -mtime +7 -delete 2>/dev/null && echo "Cleaned daily backups older than 7 days" ;;
  weekly)  find "$BACKUP_DIR" -name "weekly_*" -mtime +30 -delete 2>/dev/null && echo "Cleaned weekly backups older than 30 days" ;;
  monthly) find "$BACKUP_DIR" -name "monthly_*" -mtime +365 -delete 2>/dev/null && echo "Cleaned monthly backups older than 365 days" ;;
  manual)  echo "Manual backup - no automatic cleanup" ;;
esac

echo "[$(date -Iseconds)] Backup complete."
