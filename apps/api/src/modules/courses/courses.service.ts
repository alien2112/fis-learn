import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CourseQueryDto,
  RejectCourseDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateLessonDto,
  UpdateLessonDto,
  AssignInstructorsDto,
} from './dto';
import { CourseStatus, Role, Prisma, PricingModel, EnrollmentStatus, PaymentStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  // ============ COURSE CRUD ============

  async findAll(query: CourseQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      level,
      pricingModel,
      categoryId,
      instructorId,
      isFeatured,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (level) where.level = level;
    if (pricingModel) where.pricingModel = pricingModel;
    if (categoryId) where.categoryId = categoryId;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;

    if (instructorId) {
      where.instructors = {
        some: { userId: instructorId },
      };
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          createdBy: {
            select: { id: true, name: true, avatarUrl: true },
          },
          instructors: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
          _count: {
            select: {
              sections: true,
              enrollments: true,
            },
          },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: courses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPublished(query: CourseQueryDto) {
    return this.findAll({ ...query, status: CourseStatus.PUBLISHED });
  }

  async findPending(query: CourseQueryDto) {
    return this.findAll({ ...query, status: CourseStatus.PENDING_REVIEW });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        coverImageUrl: true,
        level: true,
        pricingModel: true,
        price: true,
        status: true,
        language: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        instructors: {
          select: {
            isPrimary: true,
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
        sections: {
          select: {
            id: true,
            title: true,
            description: true,
            sortOrder: true,
            lessons: {
              select: {
                id: true,
                title: true,
                description: true,
                contentType: true,
                sortOrder: true,
                isFreePreview: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            enrollments: true,
            accessCodes: true,
            liveClasses: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async findBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        coverImageUrl: true,
        level: true,
        pricingModel: true,
        price: true,
        status: true,
        language: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        instructors: {
          select: {
            isPrimary: true,
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
        sections: {
          select: {
            id: true,
            title: true,
            description: true,
            sortOrder: true,
            lessons: {
              select: {
                id: true,
                title: true,
                description: true,
                contentType: true,
                sortOrder: true,
                isFreePreview: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async create(dto: CreateCourseDto, creatorId: string) {
    const slug = dto.slug || this.generateSlug(dto.title);

    // Check slug uniqueness
    const existing = await this.prisma.course.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException('Course with this slug already exists');
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    const course = await this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        slug,
        coverImageUrl: dto.coverImageUrl,
        language: dto.language || 'en',
        level: dto.level,
        pricingModel: dto.pricingModel,
        price: dto.price,
        categoryId: dto.categoryId,
        createdById: creatorId,
        status: CourseStatus.DRAFT,
        instructors: dto.instructorIds?.length
          ? {
              create: dto.instructorIds.map((userId, index) => ({
                userId,
                isPrimary: index === 0,
              })),
            }
          : {
              create: {
                userId: creatorId,
                isPrimary: true,
              },
            },
      },
      include: {
        category: true,
        instructors: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return course;
  }

  async update(id: string, dto: UpdateCourseDto, userId: string, userRole: Role) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { instructors: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check permissions
    const isInstructor = course.instructors.some((i) => i.userId === userId);
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;

    if (!isInstructor && !isAdmin) {
      throw new ForbiddenException('You do not have permission to update this course');
    }

    // Check slug uniqueness if updating
    if (dto.slug && dto.slug !== course.slug) {
      const existing = await this.prisma.course.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('Course with this slug already exists');
      }
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: dto,
      include: {
        category: true,
        instructors: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return updatedCourse;
  }

  async delete(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course._count.enrollments > 0) {
      throw new BadRequestException(
        'Cannot delete course with existing enrollments',
      );
    }

    await this.prisma.course.delete({
      where: { id },
    });

    return { message: 'Course deleted successfully' };
  }

  // ============ APPROVAL WORKFLOW ============

  async submitForReview(id: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { instructors: true, sections: { include: { lessons: true } } },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify user is an instructor of this course
    if (!course.instructors.some((i) => i.userId === userId)) {
      throw new ForbiddenException('Only course instructors can submit for review');
    }

    if (course.status !== CourseStatus.DRAFT) {
      throw new BadRequestException('Only draft courses can be submitted for review');
    }

    // Validate course has content
    if (course.sections.length === 0) {
      throw new BadRequestException('Course must have at least one section');
    }

    const hasLessons = course.sections.some((s) => s.lessons.length > 0);
    if (!hasLessons) {
      throw new BadRequestException('Course must have at least one lesson');
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.PENDING_REVIEW },
    });

    return updatedCourse;
  }

  async approve(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== CourseStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending courses can be approved');
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.PUBLISHED,
        approvedAt: new Date(),
        publishedAt: new Date(),
      },
    });

    return updatedCourse;
  }

  async reject(id: string, dto: RejectCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== CourseStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending courses can be rejected');
    }

    // Move back to draft status
    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.DRAFT },
    });

    // TODO: Send notification to instructor with feedback
    // For now, we just return the feedback in the response
    return {
      course: updatedCourse,
      feedback: dto.feedback,
    };
  }

  // ============ SECTIONS ============

  async createSection(courseId: string, dto: CreateSectionDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get next sort order if not provided
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const maxOrder = await this.prisma.courseSection.aggregate({
        where: { courseId },
        _max: { sortOrder: true },
      });
      sortOrder = (maxOrder._max.sortOrder || 0) + 1;
    }

    const section = await this.prisma.courseSection.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description,
        sortOrder,
      },
      include: {
        lessons: true,
      },
    });

    return section;
  }

  async updateSection(sectionId: string, dto: UpdateSectionDto) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const updatedSection = await this.prisma.courseSection.update({
      where: { id: sectionId },
      data: dto,
      include: {
        lessons: true,
      },
    });

    return updatedSection;
  }

  async deleteSection(sectionId: string) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    await this.prisma.courseSection.delete({
      where: { id: sectionId },
    });

    return { message: 'Section deleted successfully' };
  }

  // ============ LESSONS ============

  async createLesson(sectionId: string, dto: CreateLessonDto) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Get next sort order if not provided
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const maxOrder = await this.prisma.lesson.aggregate({
        where: { sectionId },
        _max: { sortOrder: true },
      });
      sortOrder = (maxOrder._max.sortOrder || 0) + 1;
    }

    const lesson = await this.prisma.lesson.create({
      data: {
        sectionId,
        title: dto.title,
        description: dto.description,
        contentType: dto.contentType,
        materialId: dto.materialId,
        isFreePreview: dto.isFreePreview || false,
        sortOrder,
      },
      include: {
        material: true,
      },
    });

    return lesson;
  }

  async updateLesson(lessonId: string, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const updatedLesson = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: dto,
      include: {
        material: true,
      },
    });

    return updatedLesson;
  }

  async deleteLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.prisma.lesson.delete({
      where: { id: lessonId },
    });

    return { message: 'Lesson deleted successfully' };
  }

  // ============ INSTRUCTORS ============

  async assignInstructors(courseId: string, dto: AssignInstructorsDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Remove existing instructors
    await this.prisma.courseInstructor.deleteMany({
      where: { courseId },
    });

    // Add new instructors
    const instructors = await this.prisma.courseInstructor.createMany({
      data: dto.instructorIds.map((userId) => ({
        courseId,
        userId,
        isPrimary: dto.primaryInstructorId
          ? userId === dto.primaryInstructorId
          : userId === dto.instructorIds[0],
      })),
    });

    return this.findOne(courseId);
  }

  // ============ STATS ============

  async getStats() {
    const [total, byStatus, byLevel, recentCourses] = await Promise.all([
      this.prisma.course.count(),
      this.prisma.course.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.course.groupBy({
        by: ['level'],
        _count: true,
      }),
      this.prisma.course.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byLevel: byLevel.reduce(
        (acc, item) => {
          acc[item.level] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      newCoursesLast30Days: recentCourses,
    };
  }

  // ============ ENROLLMENT & ACCESS ============

  async enrollStudent(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId, status: CourseStatus.PUBLISHED },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existing) {
      if (existing.status === EnrollmentStatus.DROPPED) {
        return this.prisma.enrollment.update({
          where: { id: existing.id },
          data: { status: EnrollmentStatus.ACTIVE, enrolledAt: new Date() },
        });
      }
      return existing;
    }

    let paymentStatus: PaymentStatus;
    if (course.pricingModel === PricingModel.FREE) {
      paymentStatus = PaymentStatus.FREE;
    } else {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          userId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
      });

      if (!subscription) {
        throw new ForbiddenException('An active subscription is required to enroll in this course');
      }
      paymentStatus = PaymentStatus.PAID;
    }

    return this.prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
        paymentStatus,
      },
    });
  }

  async getLessonContent(courseId: string, lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: { select: { courseId: true } },
        material: true,
        codeExercises: true,
      },
    });

    if (!lesson || lesson.section.courseId !== courseId) {
      throw new NotFoundException('Lesson not found');
    }

    // Free preview lessons are accessible to everyone
    if (lesson.isFreePreview) {
      return lesson;
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { pricingModel: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      // Auto-enroll subscribers for PAID courses
      if (course.pricingModel === PricingModel.PAID) {
        const subscription = await this.prisma.subscription.findFirst({
          where: {
            userId,
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
          },
        });

        if (subscription) {
          await this.prisma.enrollment.create({
            data: {
              userId,
              courseId,
              status: EnrollmentStatus.ACTIVE,
              paymentStatus: PaymentStatus.PAID,
            },
          });
        } else {
          throw new ForbiddenException('You must be enrolled to access this lesson');
        }
      } else if (course.pricingModel === PricingModel.FREE) {
        await this.prisma.enrollment.create({
          data: {
            userId,
            courseId,
            status: EnrollmentStatus.ACTIVE,
            paymentStatus: PaymentStatus.FREE,
          },
        });
      } else {
        throw new ForbiddenException('You must be enrolled to access this lesson');
      }
    }

    return lesson;
  }

  async completeLessonForUser(courseId: string, lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { select: { courseId: true } } },
    });

    if (!lesson || lesson.section.courseId !== courseId) {
      throw new NotFoundException('Lesson not found');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('You must be enrolled to complete this lesson');
    }

    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId },
      update: { completedAt: new Date() },
    });

    await this.updateEnrollmentProgress(courseId, userId);
    await this.checkCourseCompletion(courseId, userId);

    return { message: 'Lesson marked as completed' };
  }

  async getStudentEnrollments(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
            instructors: {
              include: {
                user: {
                  select: { id: true, name: true, avatarUrl: true },
                },
              },
            },
            sections: {
              include: { lessons: { select: { id: true } } },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    // Get completed lessons count for each enrollment
    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const allLessonIds = enrollment.course.sections.flatMap((s) =>
          s.lessons.map((l) => l.id),
        );

        const completedCount = await this.prisma.lessonProgress.count({
          where: {
            userId,
            lessonId: { in: allLessonIds },
          },
        });

        const totalLessons = allLessonIds.length;
        const calculatedProgress = totalLessons > 0
          ? Math.round((completedCount / totalLessons) * 100)
          : 0;

        // Find last accessed lesson (most recent progress)
        const lastProgress = await this.prisma.lessonProgress.findFirst({
          where: {
            userId,
            lessonId: { in: allLessonIds },
          },
          orderBy: { completedAt: 'desc' },
          select: { completedAt: true, lessonId: true },
        });

        return {
          id: enrollment.id,
          status: enrollment.status,
          progressPercent: calculatedProgress,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
          course: {
            id: enrollment.course.id,
            title: enrollment.course.title,
            slug: enrollment.course.slug,
            coverImageUrl: enrollment.course.coverImageUrl,
            level: enrollment.course.level,
            category: enrollment.course.category,
            instructors: enrollment.course.instructors.map((i) => ({
              id: i.user.id,
              name: i.user.name,
              avatarUrl: i.user.avatarUrl,
            })),
          },
          stats: {
            totalLessons,
            completedLessons: completedCount,
            lastActivityAt: lastProgress?.completedAt || enrollment.enrolledAt,
            lastLessonId: lastProgress?.lessonId || null,
          },
        };
      }),
    );

    return {
      data: enrollmentsWithProgress,
    };
  }

  async getStudentProgress(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: { lessons: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    const allLessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id));

    const completedLessons = await this.prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: allLessonIds } },
      select: { lessonId: true, completedAt: true },
    });

    const completedSet = new Set(completedLessons.map((lp) => lp.lessonId));

    return {
      enrollment: enrollment || null,
      sections: course.sections.map((section) => ({
        id: section.id,
        title: section.title,
        lessons: section.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          isFreePreview: lesson.isFreePreview,
          completed: completedSet.has(lesson.id),
        })),
      })),
      totalLessons: allLessonIds.length,
      completedLessons: completedLessons.length,
      progressPercent: allLessonIds.length > 0
        ? Math.round((completedLessons.length / allLessonIds.length) * 100)
        : 0,
    };
  }

  private async updateEnrollmentProgress(courseId: string, userId: string) {
    const totalLessons = await this.prisma.lesson.count({
      where: { section: { courseId } },
    });

    const completedLessons = await this.prisma.lessonProgress.count({
      where: {
        userId,
        lesson: { section: { courseId } },
      },
    });

    const progressPercent = totalLessons > 0
      ? (completedLessons / totalLessons) * 100
      : 0;

    await this.prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { progressPercent },
    });
  }

  private async checkCourseCompletion(courseId: string, userId: string) {
    const totalLessons = await this.prisma.lesson.count({
      where: { section: { courseId } },
    });

    const completedLessons = await this.prisma.lessonProgress.count({
      where: {
        userId,
        lesson: { section: { courseId } },
      },
    });

    if (completedLessons >= totalLessons && totalLessons > 0) {
      await this.prisma.enrollment.update({
        where: { userId_courseId: { userId, courseId } },
        data: {
          status: EnrollmentStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
