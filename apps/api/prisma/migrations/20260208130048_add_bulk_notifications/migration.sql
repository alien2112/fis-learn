-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "rejection_feedback" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_id" TEXT;

-- CreateTable
CREATE TABLE "bulk_notifications" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipient_group" TEXT NOT NULL,
    "recipient_ids" TEXT[],
    "sent_by" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_for" TIMESTAMP(3),
    "recipient_count" INTEGER NOT NULL,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "bulk_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bulk_notifications_sent_by_idx" ON "bulk_notifications"("sent_by");

-- CreateIndex
CREATE INDEX "bulk_notifications_status_idx" ON "bulk_notifications"("status");

-- CreateIndex
CREATE INDEX "bulk_notifications_sent_at_idx" ON "bulk_notifications"("sent_at");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_notifications" ADD CONSTRAINT "bulk_notifications_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
