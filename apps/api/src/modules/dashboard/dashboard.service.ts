import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UserStatus, CourseStatus, EnrollmentStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getKPIs() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      usersByRole,
      activeUsersThisMonth,
      totalCourses,
      coursesByStatus,
      totalEnrollments,
      activeEnrollments,
      pendingApprovals,
      newUsersThisWeek,
      newCoursesThisWeek,
      accessCodeStats,
    ] = await Promise.all([
      // Total users
      this.prisma.user.count(),

      // Users by role
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),

      // Active users this month (logged in within last 30 days)
      this.prisma.user.count({
        where: {
          lastLoginAt: { gte: thirtyDaysAgo },
          status: UserStatus.ACTIVE,
        },
      }),

      // Total courses
      this.prisma.course.count(),

      // Courses by status
      this.prisma.course.groupBy({
        by: ['status'],
        _count: true,
      }),

      // Total enrollments
      this.prisma.enrollment.count(),

      // Active enrollments
      this.prisma.enrollment.count({
        where: { status: EnrollmentStatus.ACTIVE },
      }),

      // Pending course approvals
      this.prisma.course.count({
        where: { status: CourseStatus.PENDING_REVIEW },
      }),

      // New users this week
      this.prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),

      // New courses this week
      this.prisma.course.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),

      // Access code stats
      this.prisma.accessCode.aggregate({
        _count: true,
        where: { status: 'ACTIVE' },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        byRole: usersByRole.reduce(
          (acc, item) => {
            acc[item.role.toLowerCase()] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        activeThisMonth: activeUsersThisMonth,
        newThisWeek: newUsersThisWeek,
      },
      courses: {
        total: totalCourses,
        byStatus: coursesByStatus.reduce(
          (acc, item) => {
            acc[item.status.toLowerCase()] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        pendingApproval: pendingApprovals,
        newThisWeek: newCoursesThisWeek,
      },
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
      },
      accessCodes: {
        activeCount: accessCodeStats._count,
      },
    };
  }

  async getEnrollmentTrend(months: number = 6) {
    const now = new Date();
    // First day of the window (N months ago)
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Single GROUP BY query instead of N separate COUNT queries.
    type TrendRow = { yr: number; mo: number; count: bigint };
    const rows = await this.prisma.$queryRaw<TrendRow[]>`
      SELECT
        EXTRACT(YEAR  FROM enrolled_at)::int AS yr,
        EXTRACT(MONTH FROM enrolled_at)::int AS mo,
        COUNT(*)::bigint                     AS count
      FROM enrollments
      WHERE enrolled_at >= ${cutoff}
      GROUP BY yr, mo
      ORDER BY yr ASC, mo ASC
    `;

    const resultMap = new Map(rows.map((r) => [`${r.yr}-${r.mo}`, Number(r.count)]));

    return Array.from({ length: months }, (_, idx) => {
      const i = months - 1 - idx;
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      return { month: label, enrollments: resultMap.get(key) ?? 0 };
    });
  }

  async getUserGrowthTrend(months: number = 6) {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Single GROUP BY query instead of N separate COUNT queries.
    type TrendRow = { yr: number; mo: number; count: bigint };
    const rows = await this.prisma.$queryRaw<TrendRow[]>`
      SELECT
        EXTRACT(YEAR  FROM created_at)::int AS yr,
        EXTRACT(MONTH FROM created_at)::int AS mo,
        COUNT(*)::bigint                    AS count
      FROM users
      WHERE created_at >= ${cutoff}
      GROUP BY yr, mo
      ORDER BY yr ASC, mo ASC
    `;

    const resultMap = new Map(rows.map((r) => [`${r.yr}-${r.mo}`, Number(r.count)]));

    return Array.from({ length: months }, (_, idx) => {
      const i = months - 1 - idx;
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      return { month: label, users: resultMap.get(key) ?? 0 };
    });
  }

  async getCourseStats() {
    const [
      byLevel,
      byCategory,
      completionRates,
      topEnrolled,
    ] = await Promise.all([
      // Courses by level
      this.prisma.course.groupBy({
        by: ['level'],
        _count: true,
        where: { status: CourseStatus.PUBLISHED },
      }),

      // Courses by category
      this.prisma.course.groupBy({
        by: ['categoryId'],
        _count: true,
        where: {
          status: CourseStatus.PUBLISHED,
          categoryId: { not: null },
        },
      }),

      // Average completion rate
      this.prisma.enrollment.aggregate({
        _avg: { progressPercent: true },
        where: { status: EnrollmentStatus.ACTIVE },
      }),

      // Top 5 enrolled courses
      this.prisma.course.findMany({
        where: { status: CourseStatus.PUBLISHED },
        select: {
          id: true,
          title: true,
          slug: true,
          _count: {
            select: { enrollments: true },
          },
        },
        orderBy: {
          enrollments: {
            _count: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // Get category names for the byCategory data
    const categoryIds = byCategory.map((c) => c.categoryId).filter(Boolean) as string[];
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return {
      byLevel: byLevel.map((item) => ({
        level: item.level,
        count: item._count,
      })),
      byCategory: byCategory.map((item) => ({
        category: categoryMap.get(item.categoryId!) || 'Unknown',
        count: item._count,
      })),
      averageCompletionRate: completionRates._avg.progressPercent || 0,
      topEnrolled: topEnrolled.map((course) => ({
        id: course.id,
        title: course.title,
        slug: course.slug,
        enrollments: course._count.enrollments,
      })),
    };
  }

  async getRecentActivity(limit: number = 10) {
    const [
      recentUsers,
      recentEnrollments,
      recentCourseSubmissions,
    ] = await Promise.all([
      // Recent user registrations
      this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),

      // Recent enrollments
      this.prisma.enrollment.findMany({
        select: {
          id: true,
          enrolledAt: true,
          user: {
            select: { id: true, name: true },
          },
          course: {
            select: { id: true, title: true },
          },
        },
        orderBy: { enrolledAt: 'desc' },
        take: limit,
      }),

      // Recent course submissions for approval
      this.prisma.course.findMany({
        where: { status: CourseStatus.PENDING_REVIEW },
        select: {
          id: true,
          title: true,
          createdBy: {
            select: { id: true, name: true },
          },
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
    ]);

    // Combine and sort all activities
    const activities = [
      ...recentUsers.map((user) => ({
        type: 'user_registered' as const,
        timestamp: user.createdAt,
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          role: user.role,
        },
      })),
      ...recentEnrollments.map((enrollment) => ({
        type: 'enrollment_created' as const,
        timestamp: enrollment.enrolledAt,
        data: {
          enrollmentId: enrollment.id,
          userId: enrollment.user.id,
          userName: enrollment.user.name,
          courseId: enrollment.course.id,
          courseTitle: enrollment.course.title,
        },
      })),
      ...recentCourseSubmissions.map((course) => ({
        type: 'course_submitted' as const,
        timestamp: course.updatedAt,
        data: {
          courseId: course.id,
          courseTitle: course.title,
          instructorId: course.createdBy.id,
          instructorName: course.createdBy.name,
        },
      })),
    ];

    // Sort by timestamp and return top items
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getStudentStats(studentId: string) {
    const [
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      droppedEnrollments,
      averageProgress,
      recentEnrollments,
    ] = await Promise.all([
      this.prisma.enrollment.count({
        where: { userId: studentId },
      }),
      this.prisma.enrollment.count({
        where: { userId: studentId, status: EnrollmentStatus.ACTIVE },
      }),
      this.prisma.enrollment.count({
        where: { userId: studentId, status: EnrollmentStatus.COMPLETED },
      }),
      this.prisma.enrollment.count({
        where: { userId: studentId, status: EnrollmentStatus.DROPPED },
      }),
      this.prisma.enrollment.aggregate({
        _avg: { progressPercent: true },
        where: { userId: studentId },
      }),
      this.prisma.enrollment.findMany({
        where: { userId: studentId },
        orderBy: { enrolledAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          progressPercent: true,
          enrolledAt: true,
          completedAt: true,
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImageUrl: true,
              level: true,
            },
          },
        },
      }),
    ]);

    return {
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
        completed: completedEnrollments,
        dropped: droppedEnrollments,
        averageProgress: averageProgress._avg.progressPercent || 0,
      },
      recentEnrollments: recentEnrollments.map((enrollment) => ({
        id: enrollment.id,
        status: enrollment.status,
        progressPercent: enrollment.progressPercent,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        course: enrollment.course,
      })),
    };
  }

  async getInstructorStats(instructorId: string) {
    const [
      courseCount,
      totalEnrollments,
      averageRating,
      recentEnrollments,
    ] = await Promise.all([
      // Total courses by instructor
      this.prisma.course.count({
        where: {
          OR: [
            { createdById: instructorId },
            { instructors: { some: { userId: instructorId } } },
          ],
        },
      }),

      // Total enrollments across all courses
      this.prisma.enrollment.count({
        where: {
          course: {
            OR: [
              { createdById: instructorId },
              { instructors: { some: { userId: instructorId } } },
            ],
          },
        },
      }),

      // Instructor profile rating
      this.prisma.instructorProfile.findUnique({
        where: { userId: instructorId },
        select: { rating: true, ratingCount: true },
      }),

      // Recent enrollments in instructor's courses
      this.prisma.enrollment.findMany({
        where: {
          course: {
            OR: [
              { createdById: instructorId },
              { instructors: { some: { userId: instructorId } } },
            ],
          },
        },
        select: {
          id: true,
          enrolledAt: true,
          user: {
            select: { name: true },
          },
          course: {
            select: { title: true },
          },
        },
        orderBy: { enrolledAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalCourses: courseCount,
      totalEnrollments,
      rating: averageRating?.rating || 0,
      ratingCount: averageRating?.ratingCount || 0,
      recentEnrollments: recentEnrollments.map((e) => ({
        studentName: e.user.name,
        courseTitle: e.course.title,
        enrolledAt: e.enrolledAt,
      })),
    };
  }

  async getTopInstructors(limit: number = 5) {
    // Single SQL aggregation instead of fetching all courses into memory,
    // grouping in JavaScript, then making a second DB round-trip.
    type TopRow = {
      user_id: string;
      name: string;
      avatar_url: string | null;
      course_count: bigint;
      student_count: bigint;
    };

    const rows = await this.prisma.$queryRaw<TopRow[]>`
      SELECT
        u.id          AS user_id,
        u.name,
        u.avatar_url,
        COUNT(DISTINCT ci.course_id)::bigint AS course_count,
        COUNT(DISTINCT e.id)::bigint         AS student_count
      FROM course_instructors ci
      JOIN courses     c  ON ci.course_id = c.id AND c.status = 'PUBLISHED' AND c.deleted_at IS NULL
      JOIN users       u  ON ci.user_id   = u.id
      LEFT JOIN enrollments e ON e.course_id = c.id
      GROUP BY u.id, u.name, u.avatar_url
      ORDER BY student_count DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id: r.user_id,
      name: r.name,
      avatarUrl: r.avatar_url,
      courses: Number(r.course_count),
      students: Number(r.student_count),
      rating: 0,
    }));
  }
}
