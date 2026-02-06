import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AnalyticsEventType, Prisma } from '@prisma/client';
import { TrackEventDto } from './dto/track-event.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Batch insert events and update progress in real-time
  async trackEvents(events: TrackEventDto[], studentId: string, deviceInfo: any) {
    const now = new Date();

    // 1. Store raw events
    const eventData: Prisma.StudentActivityEventCreateManyInput[] = events.map((e) => ({
      studentId,
      courseId: e.courseId,
      lessonId: e.lessonId,
      eventType: e.eventType as AnalyticsEventType,
      eventTimestamp: new Date(e.timestamp),
      sessionId: e.sessionId,
      eventData: e.payload || {},
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ipAddress: deviceInfo.ipAddress,
    }));

    await this.prisma.studentActivityEvent.createMany({
      data: eventData,
      skipDuplicates: true,
    });

    // 2. Update progress for key events (real-time)
    for (const event of events) {
      await this.updateProgressFromEvent(studentId, event, now);
    }

    return { tracked: events.length };
  }

  private async updateProgressFromEvent(
    studentId: string,
    event: TrackEventDto,
    now: Date,
  ) {
    switch (event.eventType) {
      case 'LESSON_COMPLETE':
        await this.handleLessonComplete(studentId, event, now);
        break;
      case 'VIDEO_COMPLETE':
        await this.handleVideoComplete(studentId, event, now);
        break;
      case 'QUIZ_SUBMIT':
        await this.handleQuizSubmit(studentId, event, now);
        break;
      case 'COURSE_ENROLL':
        await this.handleCourseEnroll(studentId, event, now);
        break;
      case 'COURSE_COMPLETE':
        await this.handleCourseComplete(studentId, event, now);
        break;
      case 'LESSON_START':
      case 'VIDEO_PLAY':
        await this.updateLastActivity(studentId, event.courseId, now);
        break;
    }
  }

  private async handleLessonComplete(
    studentId: string,
    event: TrackEventDto,
    now: Date,
  ) {
    if (!event.courseId) return;

    const course = await this.prisma.course.findUnique({
      where: { id: event.courseId },
      include: {
        sections: {
          include: { lessons: true },
        },
      },
    });

    if (!course) return;

    const totalLessons = course.sections.reduce(
      (sum: number, s: { lessons: { length: number } }) => sum + s.lessons.length,
      0,
    );

    // Get current progress
    const existing = await this.prisma.studentProgress.findUnique({
      where: {
        studentId_courseId: { studentId, courseId: event.courseId },
      },
    });

    const lessonsCompleted = (existing?.lessonsCompleted || 0) + 1;
    const completionPct = Math.min(100, (lessonsCompleted / totalLessons) * 100);

    await this.prisma.studentProgress.upsert({
      where: {
        studentId_courseId: { studentId, courseId: event.courseId },
      },
      create: {
        studentId,
        courseId: event.courseId,
        lessonsCompleted: 1,
        totalLessons,
        completionPct,
        timeSpentSeconds: event.payload?.timeSpent || 0,
        lastActivityAt: now,
        lastStreakDate: now,
        currentStreakDays: 1,
        longestStreakDays: 1,
      },
      update: {
        lessonsCompleted,
        totalLessons,
        completionPct,
        timeSpentSeconds: {
          increment: event.payload?.timeSpent || 0,
        },
        lastActivityAt: now,
        ...this.calculateStreak(existing, now),
      },
    });
  }

  private async handleVideoComplete(
    studentId: string,
    event: TrackEventDto,
    now: Date,
  ) {
    if (!event.courseId || !event.lessonId || !event.payload?.videoId) return;

    await this.prisma.studentVideoProgress.upsert({
      where: {
        studentId_videoId: {
          studentId,
          videoId: event.payload.videoId,
        },
      },
      create: {
        studentId,
        videoId: event.payload.videoId,
        courseId: event.courseId,
        lessonId: event.lessonId,
        watchPct: event.payload.watchPct || 100,
        secondsWatched: event.payload.secondsWatched || 0,
        videoDuration: event.payload.duration || 0,
        completed: true,
        lastPosition: event.payload.duration || 0,
      },
      update: {
        watchPct: event.payload.watchPct || 100,
        secondsWatched: event.payload.secondsWatched || 0,
        completed: true,
        lastPosition: event.payload.duration || 0,
      },
    });
  }

  private async handleQuizSubmit(
    studentId: string,
    event: TrackEventDto,
    now: Date,
  ) {
    if (!event.courseId || !event.payload?.assessmentId) return;

    await this.prisma.assessmentAttempt.create({
      data: {
        studentId,
        assessmentId: event.payload.assessmentId,
        assessmentType: 'QUIZ',
        courseId: event.courseId,
        attemptNumber: event.payload.attemptNumber || 1,
        score: event.payload.score,
        maxScore: event.payload.maxScore,
        isPassed: event.payload.isPassed,
        timeSpentSeconds: event.payload.timeSpent,
        status: 'SUBMITTED',
        answers: event.payload.answers || {},
        submittedAt: now,
      },
    });
  }

  private async handleCourseEnroll(
    studentId: string,
    event: TrackEventDto,
    now: Date,
  ) {
    if (!event.courseId) return;

    const course = await this.prisma.course.findUnique({
      where: { id: event.courseId },
      include: {
        sections: { include: { lessons: true } },
      },
    });

    if (!course) return;

    const totalLessons = course.sections.reduce(
      (sum: number, s: { lessons: { length: number } }) => sum + s.lessons.length,
      0,
    );

    await this.prisma.studentProgress.upsert({
      where: {
        studentId_courseId: { studentId, courseId: event.courseId },
      },
      create: {
        studentId,
        courseId: event.courseId,
        totalLessons,
        startedAt: now,
        lastActivityAt: now,
        lastStreakDate: now,
        currentStreakDays: 1,
        longestStreakDays: 1,
      },
      update: {},
    });
  }

  private async handleCourseComplete(
    studentId: string,
    event: TrackEventDto,
    now: Date,
  ) {
    if (!event.courseId) return;

    await this.prisma.studentProgress.update({
      where: {
        studentId_courseId: { studentId, courseId: event.courseId },
      },
      data: {
        status: 'COMPLETED',
        completionPct: 100,
        completedAt: now,
      },
    });
  }

  private async updateLastActivity(
    studentId: string,
    courseId: string | undefined,
    now: Date,
  ) {
    if (!courseId) return;

    await this.prisma.studentProgress.updateMany({
      where: { studentId, courseId },
      data: { lastActivityAt: now },
    });
  }

  private calculateStreak(
    existing: any,
    now: Date,
  ): { currentStreakDays: number; longestStreakDays: number; lastStreakDate: Date } {
    if (!existing?.lastStreakDate) {
      return { currentStreakDays: 1, longestStreakDays: 1, lastStreakDate: now };
    }

    const lastStreak = new Date(existing.lastStreakDate);
    const today = new Date(now.toDateString());
    const lastStreakDay = new Date(lastStreak.toDateString());
    const diffDays = Math.floor(
      (today.getTime() - lastStreakDay.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      // Same day, no change
      return {
        currentStreakDays: existing.currentStreakDays,
        longestStreakDays: existing.longestStreakDays,
        lastStreakDate: existing.lastStreakDate,
      };
    } else if (diffDays === 1) {
      // Consecutive day
      const newStreak = existing.currentStreakDays + 1;
      return {
        currentStreakDays: newStreak,
        longestStreakDays: Math.max(newStreak, existing.longestStreakDays),
        lastStreakDate: now,
      };
    } else {
      // Streak broken
      return {
        currentStreakDays: 1,
        longestStreakDays: existing.longestStreakDays,
        lastStreakDate: now,
      };
    }
  }

  // Get student dashboard data
  async getStudentDashboard(studentId: string) {
    const [activeCourses, overallStats, recentActivity] = await Promise.all([
      this.prisma.studentProgress.findMany({
        where: {
          studentId,
          status: { in: ['ACTIVE', 'COMPLETED'] },
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImageUrl: true,
            },
          },
        },
        orderBy: { lastActivityAt: 'desc' },
        take: 5,
      }),

      this.prisma.studentProgress.aggregate({
        where: { studentId },
        _sum: {
          timeSpentSeconds: true,
          lessonsCompleted: true,
        },
        _count: {
          courseId: true,
        },
      }),

      this.prisma.studentDailyStat.findMany({
        where: {
          studentId,
          statDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { statDate: 'asc' },
      }),
    ]);

    // Calculate current streak
    const currentStreak = await this.getCurrentStreak(studentId);

    return {
      activeCourses,
      currentStreak,
      overallStats: {
        totalCourses: overallStats._count.courseId,
        completedCourses: activeCourses.filter((c: { status: string }) => c.status === 'COMPLETED')
          .length,
        totalTimeHours: Math.round(
          (overallStats._sum.timeSpentSeconds || 0) / 3600,
        ),
        totalLessons: overallStats._sum.lessonsCompleted || 0,
      },
      recentActivity,
    };
  }

  private async getCurrentStreak(studentId: string): Promise<number> {
    const progress = await this.prisma.studentProgress.findFirst({
      where: { studentId },
      orderBy: { currentStreakDays: 'desc' },
    });
    return progress?.currentStreakDays || 0;
  }

  // Get course analytics for instructor
  async getCourseAnalytics(courseId: string, instructorId: string) {
    // Verify instructor owns course
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, createdById: instructorId },
    });

    if (!course) {
      throw new Error('Course not found or access denied');
    }

    const [
      enrollmentStats,
      completionCount,
      atRiskCount,
      recentActivity,
      topStudents,
    ] = await Promise.all([
      this.prisma.studentProgress.aggregate({
        where: { courseId },
        _count: { studentId: true },
        _sum: {
          timeSpentSeconds: true,
          lessonsCompleted: true,
        },
        _avg: {
          completionPct: true,
        },
      }),

      this.prisma.studentProgress.count({
        where: { courseId, status: 'COMPLETED' },
      }),

      this.prisma.studentProgress.count({
        where: {
          courseId,
          lastActivityAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          status: 'ACTIVE',
        },
      }),

      this.prisma.$queryRaw`
        SELECT 
          DATE(last_activity_at) as date,
          COUNT(*) as active_students
        FROM student_progress
        WHERE course_id = ${courseId}
          AND last_activity_at > NOW() - INTERVAL '14 days'
        GROUP BY DATE(last_activity_at)
        ORDER BY date DESC
      `,

      this.prisma.studentProgress.findMany({
        where: { courseId },
        orderBy: { completionPct: 'desc' },
        take: 10,
        include: {
          student: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
    ]);

    const totalStudents = enrollmentStats._count.studentId;

    return {
      totalStudents,
      avgCompletion: Math.round((enrollmentStats._avg.completionPct || 0) * 100) / 100,
      completionRate: totalStudents > 0 ? (completionCount / totalStudents) * 100 : 0,
      avgTimePerStudent: totalStudents
        ? Math.round(
            (enrollmentStats._sum.timeSpentSeconds || 0) / totalStudents / 3600,
          )
        : 0,
      atRiskCount,
      recentActivity,
      topStudents,
    };
  }

  // Daily aggregation job (called by cron)
  async aggregateDailyStats(date: Date) {
    const dateStr = date.toISOString().split('T')[0];

    // Aggregate stats for the day
    await this.prisma.$executeRaw`
      INSERT INTO student_daily_stats (
        student_id, stat_date, sessions_count, total_time_seconds,
        lessons_completed, videos_watched, quizzes_attempted, was_active
      )
      SELECT 
        student_id,
        DATE(event_timestamp) as stat_date,
        COUNT(DISTINCT session_id) as sessions_count,
        COALESCE(SUM(CAST(event_data->>'timeSpent' AS INTEGER)), 0) as total_time_seconds,
        COUNT(*) FILTER (WHERE event_type = 'LESSON_COMPLETE') as lessons_completed,
        COUNT(*) FILTER (WHERE event_type = 'VIDEO_COMPLETE') as videos_watched,
        COUNT(*) FILTER (WHERE event_type = 'QUIZ_SUBMIT') as quizzes_attempted,
        TRUE as was_active
      FROM student_activity_events
      WHERE DATE(event_timestamp) = ${dateStr}
      GROUP BY student_id, DATE(event_timestamp)
      ON CONFLICT (student_id, stat_date) 
      DO UPDATE SET
        sessions_count = EXCLUDED.sessions_count,
        total_time_seconds = EXCLUDED.total_time_seconds,
        lessons_completed = EXCLUDED.lessons_completed,
        videos_watched = EXCLUDED.videos_watched,
        quizzes_attempted = EXCLUDED.quizzes_attempted,
        was_active = TRUE,
        updated_at = NOW()
    `;

    return { aggregated: dateStr };
  }

  // Cleanup old events (keep 90 days)
  async cleanupOldEvents() {
    const result = await this.prisma.studentActivityEvent.deleteMany({
      where: {
        eventTimestamp: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    });

    return { deleted: result.count };
  }
}
