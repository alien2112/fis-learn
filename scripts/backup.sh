#!/bin/bash
# PostgreSQL Backup Script
# FREE - Run via cron on any server with Docker
# 
# Setup:
# 1. chmod +x backup.sh
# 2. Add to crontab: 0 2 * * * /path/to/backup.sh
# 3. Set AWS credentials for S3 upload (optional)

set -e

# Configuration
DB_NAME="${DB_NAME:-elearning}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting backup of $DB_NAME at $TIMESTAMP"

# Perform backup using Docker (no need to install pg_dump locally)
docker exec -i "fis-learn-db" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Backup completed: $BACKUP_FILE"
    
    # Upload to S3 (optional - free tier has 5GB storage)
    if [ -n "$S3_BUCKET" ]; then
        aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$S3_BUCKET/backups/"
        echo "Uploaded to S3: s3://$S3_BUCKET/backups/$BACKUP_FILE"
    fi
    
    # Cleanup old backups
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "Cleaned up backups older than $RETENTION_DAYS days"
else
    echo "Backup failed!"
    exit 1
fi

echo "Backup process completed successfully"
