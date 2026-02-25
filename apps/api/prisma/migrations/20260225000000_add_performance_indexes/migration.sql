-- Performance optimization: add missing indexes identified during audit
-- These indexes accelerate the most frequent query patterns:
--   1. Lesson count by course (progress calculation on every lesson completion)
--   2. LessonProgress lookup by lessonId (progress join traversal)
--   3. Enrollment filtered by (userId, status) (active-enrollment checks)
--   4. Enrollment ordered by enrolledAt (trend queries, student enrollment list)

-- CourseSection: index courseId for fast course→section lookups
-- (used in every `lesson.count({ where: { section: { courseId } } })`)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "course_sections_course_id_idx"
  ON "course_sections"("course_id");

-- Lesson: index sectionId for fast section→lesson JOIN traversals
CREATE INDEX CONCURRENTLY IF NOT EXISTS "lessons_section_id_idx"
  ON "lessons"("section_id");

-- LessonProgress: index lessonId for reverse-join lookups
-- (used in progress counts that traverse lesson→section→course)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "lesson_progress_lesson_id_idx"
  ON "lesson_progress"("lesson_id");

-- Enrollment: composite (userId, status) for active-enrollment checks
-- (used in course access gates, community access, etc.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "enrollments_user_id_status_idx"
  ON "enrollments"("user_id", "status");

-- Enrollment: index enrolledAt for trend/ordering queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "enrollments_enrolled_at_idx"
  ON "enrollments"("enrolled_at");
