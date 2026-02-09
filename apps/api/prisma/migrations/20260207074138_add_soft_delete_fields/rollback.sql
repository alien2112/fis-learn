-- Rollback: 20260207074138_add_soft_delete_fields
-- Removes soft delete fields from users and courses tables
-- Run with: psql $DATABASE_URL < rollback.sql
-- WARNING: Review carefully before running in production

ALTER TABLE "users" DROP COLUMN IF EXISTS "deleted_at";
ALTER TABLE "courses" DROP COLUMN IF EXISTS "deleted_at";

DELETE FROM "_prisma_migrations" WHERE migration_name = '20260207074138_add_soft_delete_fields';
