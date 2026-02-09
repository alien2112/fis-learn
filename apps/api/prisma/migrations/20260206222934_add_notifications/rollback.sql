-- Rollback: 20260206222934_add_notifications
-- Removes notifications and notification_preferences tables and NotificationType enum
-- Run with: psql $DATABASE_URL < rollback.sql
-- WARNING: Review carefully before running in production

-- Drop foreign keys first
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_fkey";
ALTER TABLE "notification_preferences" DROP CONSTRAINT IF EXISTS "notification_preferences_user_id_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "notifications_user_id_is_read_idx";
DROP INDEX IF EXISTS "notifications_user_id_created_at_idx";
DROP INDEX IF EXISTS "notification_preferences_user_id_key";

-- Drop tables
DROP TABLE IF EXISTS "notification_preferences";
DROP TABLE IF EXISTS "notifications";

-- Drop enum
DROP TYPE IF EXISTS "NotificationType";

DELETE FROM "_prisma_migrations" WHERE migration_name = '20260206222934_add_notifications';
