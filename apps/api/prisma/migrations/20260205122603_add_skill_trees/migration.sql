-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('SESSION_START', 'SESSION_END', 'COURSE_ENROLL', 'COURSE_UNENROLL', 'COURSE_COMPLETE', 'LESSON_START', 'LESSON_COMPLETE', 'VIDEO_PLAY', 'VIDEO_PAUSE', 'VIDEO_SEEK', 'VIDEO_COMPLETE', 'QUIZ_START', 'QUIZ_ANSWER', 'QUIZ_SUBMIT', 'ASSIGNMENT_START', 'ASSIGNMENT_SUBMIT');

-- CreateEnum
CREATE TYPE "StudentProgressStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('QUIZ', 'ASSIGNMENT', 'EXAM');

-- CreateEnum
CREATE TYPE "AssessmentAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'LATE');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');

-- CreateTable
CREATE TABLE "student_activity_events" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT,
    "lesson_id" TEXT,
    "event_type" "AnalyticsEventType" NOT NULL,
    "event_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" TEXT NOT NULL,
    "event_data" JSONB,
    "device_type" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "completion_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lessons_completed" INTEGER NOT NULL DEFAULT 0,
    "total_lessons" INTEGER NOT NULL DEFAULT 0,
    "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMP(3),
    "current_streak_days" INTEGER NOT NULL DEFAULT 0,
    "longest_streak_days" INTEGER NOT NULL DEFAULT 0,
    "last_streak_date" TIMESTAMP(3),
    "status" "StudentProgressStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_video_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "watch_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "seconds_watched" INTEGER NOT NULL DEFAULT 0,
    "video_duration" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "last_position" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_video_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_attempts" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "assessment_type" "AssessmentType" NOT NULL,
    "course_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "score" DOUBLE PRECISION,
    "max_score" DOUBLE PRECISION,
    "is_passed" BOOLEAN,
    "time_spent_seconds" INTEGER,
    "status" "AssessmentAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB,
    "submitted_at" TIMESTAMP(3),
    "graded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_daily_stats" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "stat_date" DATE NOT NULL,
    "sessions_count" INTEGER NOT NULL DEFAULT 0,
    "total_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "lessons_completed" INTEGER NOT NULL DEFAULT 0,
    "videos_watched" INTEGER NOT NULL DEFAULT 0,
    "quizzes_attempted" INTEGER NOT NULL DEFAULT 0,
    "was_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_streams" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "StreamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "viewer_count" INTEGER NOT NULL DEFAULT 0,
    "stream_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_viewers" (
    "id" TEXT NOT NULL,
    "stream_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejoined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),

    CONSTRAINT "stream_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_trees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_trees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_nodes" (
    "id" TEXT NOT NULL,
    "skill_tree_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "position_x" DOUBLE PRECISION NOT NULL,
    "position_y" DOUBLE PRECISION NOT NULL,
    "prerequisites" TEXT NOT NULL,
    "unlock_conditions" TEXT NOT NULL,
    "resources" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,

    CONSTRAINT "skill_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_activity_events_student_id_event_timestamp_idx" ON "student_activity_events"("student_id", "event_timestamp");

-- CreateIndex
CREATE INDEX "student_activity_events_course_id_event_timestamp_idx" ON "student_activity_events"("course_id", "event_timestamp");

-- CreateIndex
CREATE INDEX "student_activity_events_event_type_event_timestamp_idx" ON "student_activity_events"("event_type", "event_timestamp");

-- CreateIndex
CREATE INDEX "student_activity_events_event_timestamp_idx" ON "student_activity_events"("event_timestamp");

-- CreateIndex
CREATE INDEX "student_progress_student_id_status_idx" ON "student_progress"("student_id", "status");

-- CreateIndex
CREATE INDEX "student_progress_course_id_status_idx" ON "student_progress"("course_id", "status");

-- CreateIndex
CREATE INDEX "student_progress_last_activity_at_idx" ON "student_progress"("last_activity_at");

-- CreateIndex
CREATE UNIQUE INDEX "student_progress_student_id_course_id_key" ON "student_progress"("student_id", "course_id");

-- CreateIndex
CREATE INDEX "student_video_progress_student_id_course_id_idx" ON "student_video_progress"("student_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_video_progress_student_id_video_id_key" ON "student_video_progress"("student_id", "video_id");

-- CreateIndex
CREATE INDEX "assessment_attempts_student_id_assessment_type_idx" ON "assessment_attempts"("student_id", "assessment_type");

-- CreateIndex
CREATE INDEX "assessment_attempts_course_id_submitted_at_idx" ON "assessment_attempts"("course_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_student_id_assessment_id_attempt_number_key" ON "assessment_attempts"("student_id", "assessment_id", "attempt_number");

-- CreateIndex
CREATE INDEX "student_daily_stats_student_id_stat_date_idx" ON "student_daily_stats"("student_id", "stat_date");

-- CreateIndex
CREATE INDEX "student_daily_stats_stat_date_idx" ON "student_daily_stats"("stat_date");

-- CreateIndex
CREATE UNIQUE INDEX "student_daily_stats_student_id_stat_date_key" ON "student_daily_stats"("student_id", "stat_date");

-- CreateIndex
CREATE UNIQUE INDEX "course_streams_room_id_key" ON "course_streams"("room_id");

-- CreateIndex
CREATE INDEX "course_streams_course_id_status_idx" ON "course_streams"("course_id", "status");

-- CreateIndex
CREATE INDEX "course_streams_status_idx" ON "course_streams"("status");

-- CreateIndex
CREATE INDEX "stream_viewers_stream_id_user_id_idx" ON "stream_viewers"("stream_id", "user_id");

-- CreateIndex
CREATE INDEX "stream_viewers_user_id_idx" ON "stream_viewers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "stream_viewers_stream_id_user_id_key" ON "stream_viewers"("stream_id", "user_id");

-- CreateIndex
CREATE INDEX "skill_trees_category_idx" ON "skill_trees"("category");

-- CreateIndex
CREATE INDEX "skill_trees_published_idx" ON "skill_trees"("published");

-- CreateIndex
CREATE INDEX "skill_nodes_skill_tree_id_idx" ON "skill_nodes"("skill_tree_id");

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_streams" ADD CONSTRAINT "course_streams_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_streams" ADD CONSTRAINT "course_streams_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_viewers" ADD CONSTRAINT "stream_viewers_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "course_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_viewers" ADD CONSTRAINT "stream_viewers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_trees" ADD CONSTRAINT "skill_trees_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_nodes" ADD CONSTRAINT "skill_nodes_skill_tree_id_fkey" FOREIGN KEY ("skill_tree_id") REFERENCES "skill_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
