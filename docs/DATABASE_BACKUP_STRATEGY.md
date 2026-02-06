# Database Backup Strategy

## Overview

This document outlines the database backup strategy for the FIS Learn platform to ensure data integrity and disaster recovery capabilities.

## Backup Types

### 1. Automated Supabase Backups (Production)

Supabase provides automated backups for paid projects:

- **Daily backups**: Automated daily point-in-time recovery (PITR)
- **Retention**: 7 days for daily backups on Pro plan
- **WAL archiving**: Write-ahead log archiving for point-in-time recovery

**Configuration**:
1. Ensure your Supabase project is on Pro plan or higher
2. Enable Point-in-Time Recovery (PITR) in the dashboard
3. Set backup retention period according to compliance requirements

### 2. Manual Backups

For self-hosted or local development instances:

```bash
# Create backup directory
mkdir -p backups

# Full database backup
docker exec fis-postgres pg_dump -U postgres -d fis_learn > backups/fis_learn_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker exec fis-postgres pg_dump -U postgres -d fis_learn | gzip > backups/fis_learn_$(date +%Y%m%d_%H%M%S).sql.gz

# Schema-only backup
docker exec fis-postgres pg_dump -U postgres -d fis_learn --schema-only > backups/fis_learn_schema_$(date +%Y%m%d).sql
```

### 3. Automated Backup Script

Create `scripts/backup.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/fis-learn"
DB_NAME="fis_learn"
DB_USER="postgres"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/fis_learn_$TIMESTAMP.sql.gz"

# Create compressed backup
docker exec fis-postgres pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"

# Verify backup
if gzip -t "$BACKUP_FILE"; then
    echo "Backup created successfully: $BACKUP_FILE"
else
    echo "Backup failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Upload to S3 (optional)
if [ -n "$AWS_S3_BUCKET" ]; then
    aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/"
fi

# Clean old backups
find "$BACKUP_DIR" -name "fis_learn_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed at $(date)"
```

### 4. Docker Compose Backup Service

Add to `docker-compose.yml`:

```yaml
  backup:
    image: postgres:15-alpine
    container_name: fis-backup
    volumes:
      - ./backups:/backups
      - ./scripts/backup.sh:/backup.sh:ro
    environment:
      PGHOST: postgres
      PGUSER: postgres
      PGDATABASE: fis_learn
      PGPASSWORD: postgres
    command: >
      sh -c "chmod +x /backup.sh && 
             echo '0 2 * * * /backup.sh' | crontab - && 
             crond -f"
    depends_on:
      - postgres
    networks:
      - fis-network
```

## Backup Verification

### Restore Testing

Regularly test backup restoration:

```bash
# Create test database
docker exec fis-postgres psql -U postgres -c "CREATE DATABASE fis_learn_test;"

# Restore from backup
zcat backups/fis_learn_20240206_120000.sql.gz | docker exec -i fis-postgres psql -U postgres -d fis_learn_test

# Verify data integrity
docker exec fis-postgres psql -U postgres -d fis_learn_test -c "SELECT COUNT(*) FROM users;"

# Cleanup
docker exec fis-postgres psql -U postgres -c "DROP DATABASE fis_learn_test;"
```

### Backup Monitoring

Set up alerts for:
- Backup failures
- Backup file size anomalies
- Storage capacity limits

## Recovery Procedures

### Point-in-Time Recovery (Supabase)

1. Go to Supabase Dashboard > Database > Backups
2. Select desired restore point
3. Click "Restore" and confirm

### Manual Restore

```bash
# Stop the application
docker-compose stop api

# Restore database
docker exec -i fis-postgres psql -U postgres -d fis_learn < backups/fis_learn_20240206_120000.sql

# Restart the application
docker-compose start api
```

## Backup Security

- Backups are encrypted at rest when using Supabase
- For manual backups, encrypt with GPG:
  ```bash
  gpg --symmetric --cipher-algo AES256 backup.sql.gz
  ```
- Store backups in geographically separate locations
- Limit access to backup files

## Retention Policy

- **Daily backups**: 30 days
- **Weekly backups**: 12 weeks
- **Monthly backups**: 12 months
- **Annual backups**: 7 years (compliance requirement)

## Compliance

- **GDPR**: Include user data deletion procedures in backup policy
- **FERPA**: Maintain separate backups for student records
- **SOC 2**: Document backup procedures and test results

## Emergency Contacts

- Database Administrator: [email]
- DevOps Team: [email]
- Supabase Support: https://supabase.com/support
