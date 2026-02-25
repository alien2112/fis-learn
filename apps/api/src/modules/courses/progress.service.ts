import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EnrollmentStatus } from '@prisma/client';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { NotificationType } from '@/modules/notifications/dto';

/**
 * Unified Progress Service
 * 
 * This service provides a single source of truth for lesson completion.
 * ALL completion events (video watch, code exercise, quiz submit) must funnel through
 * the completeLesson() method to ensure progress tracking consistency.
 * 
 * This fixes the fragmented progress system where:
 * - LessonProgress was only updated by explicit completeLessonForUser() endpoint
 * - StudentProgress was updated by analytics events but not used for enrollment progress
 * - Enrollment.progressPercent was calculated separately
 */
@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Unified lesson completion method
   * This is the ONLY method that should create/update LessonProgress records
   * and trigger enrollment progress updates.
   *
   * @param userId - The student completing the lesson
   * @param lessonId - The lesson being completed
   * @param courseId - The course containing the lesson
   * @param completionSource - What triggered the completion (for analytics)
   * @param autoCompleted - Whether this was auto-completed (vs manual click)
   */
  async completeLesson(
    userId: string,
    lessonId: string,
    courseId: string,
    completionSource: 'VIDEO_COMPLETE' | 'CODE_EXERCISE' | 'QUIZ_PASS' | 'MANUAL' | 'ASSIGNMENT',
    autoCompleted: boolean = false,
  ): Promise<{ success: boolean; alreadyCompleted: boolean; courseCompleted?: boolean }> {
    // Run enrollment check and existing-progress lookup in parallel (2 → 1 round-trip)
    const [enrollment, existingProgress] = await Promise.all([
      this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      }),
      this.prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId } },
      }),
    ]);

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      this.logger.warn(
        `Cannot complete lesson ${lessonId} for user ${userId}: not actively enrolled in course ${courseId}`,
      );
      return { success: false, alreadyCompleted: false };
    }

    const alreadyCompleted = !!existingProgress;

    // Create or update lesson progress
    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, completedAt: new Date() },
      update: {
        // Keep original completion date if already completed
        completedAt: existingProgress?.completedAt ?? new Date(),
      },
    });

    // Fetch total and completed lesson counts in parallel — shared by both
    // progress-percent update AND course-completion check (was 4 serial queries before).
    const [totalLessons, completedLessons] = await Promise.all([
      this.prisma.lesson.count({ where: { section: { courseId } } }),
      this.prisma.lessonProgress.count({
        where: { userId, lesson: { section: { courseId } } },
      }),
    ]);

    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const isCourseComplete = totalLessons > 0 && completedLessons >= totalLessons;

    // Single enrollment update covering both progress and (conditional) completion
    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        progressPercent,
        ...(isCourseComplete && {
          status: EnrollmentStatus.COMPLETED,
          completedAt: new Date(),
          progressPercent: 100,
        }),
      },
    });

    this.logger.log(
      `Updated enrollment progress for user ${userId} in course ${courseId}: ${progressPercent}%`,
    );

    let courseCompleted = false;
    if (isCourseComplete) {
      courseCompleted = true;
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true },
      });
      if (course) {
        await this.notificationsService.create(
          userId,
          NotificationType.COURSE_COMPLETED,
          'Course Completed!',
          `Congratulations! You've completed "${course.title}".`,
          { courseId, completedAt: updatedEnrollment.completedAt },
        );
      }
      this.logger.log(`Course ${courseId} completed by user ${userId}`);
    }

    this.logger.log(
      `Lesson ${lessonId} completed by user ${userId} via ${completionSource}${autoCompleted ? ' (auto)' : ''}`,
    );

    return { success: true, alreadyCompleted, courseCompleted };
  }

  /**
   * Check if all required exercises for a lesson are completed
   */
  async areRequiredExercisesCompleted(
    userId: string,
    lessonId: string,
  ): Promise<{ allCompleted: boolean; totalRequired: number; completedRequired: number }> {
    const requiredExercises = await this.prisma.codeExercise.findMany({
      where: { lessonId, isRequired: true },
      select: { id: true },
    });

    if (requiredExercises.length === 0) {
      return { allCompleted: true, totalRequired: 0, completedRequired: 0 };
    }

    const exerciseIds = requiredExercises.map((e) => e.id);

    // Count how many have ACCEPTED submissions from this user
    const acceptedSubmissions = await this.prisma.codeSubmission.groupBy({
      by: ['exerciseId'],
      where: {
        userId,
        exerciseId: { in: exerciseIds },
        status: 'ACCEPTED',
      },
      _count: { exerciseId: true },
    });

    return {
      allCompleted: acceptedSubmissions.length >= exerciseIds.length,
      totalRequired: exerciseIds.length,
      completedRequired: acceptedSubmissions.length,
    };
  }

  /**
   * Get lesson completion status for a user
   */
  async getLessonCompletionStatus(
    userId: string,
    lessonId: string,
  ): Promise<{ completed: boolean; completedAt?: Date; autoCompleted?: boolean }> {
    const progress = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    return {
      completed: !!progress,
      completedAt: progress?.completedAt || undefined,
    };
  }
}
