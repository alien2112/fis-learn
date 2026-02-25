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
import { AuditLogService } from '@/common/services/audit-log.service';
import { ProgressService } from './progress.service';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private progressService: ProgressService,
  ) {}

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

  async findOne(id: string, userId?: string, userRole?: string) {
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
        createdById: true,
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

    // Only admins, super admins, and course creator can see non-published courses
    if (course.status !== 'PUBLISHED') {
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
      const isCreator = userId && course.createdById === userId;
      if (!isAdmin && !isCreator) {
        throw new NotFoundException('Course not found');
      }
    }

    return course;
  }

  async findBySlug(slug: string, userId?: string, userRole?: string) {
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
        createdById: true,
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

    // Only admins, super admins, and course creator can see non-published courses
    if (course.status !== 'PUBLISHED') {
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
      const isCreator = userId && course.createdById === userId;
      if (!isAdmin && !isCreator) {
        throw new NotFoundException('Course not found');
      }
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

    // Whitelist fields - instructors can only update content fields
    const instructorFields: Partial<UpdateCourseDto> = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
      ...(dto.language !== undefined && { language: dto.language }),
      ...(dto.level !== undefined && { level: dto.level }),
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
    };

    // Admin-only fields
    const adminFields = isAdmin ? {
      ...(dto.pricingModel !== undefined && { pricingModel: dto.pricingModel }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
    } : {};

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: { ...instructorFields, ...adminFields },
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

  async delete(id: string, adminUserId: string) {
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

    // Log the deletion before executing
    await this.auditLog.logDataChange(
      adminUserId,
      'COURSE_DELETE',
      'COURSE',
      id,
      { old: { title: course.title, slug: course.slug } },
    );

    // Soft delete: update deletedAt and status instead of hard delete
    await this.prisma.course.update({
      where: { id },
      data: { deletedAt: new Date(), status: CourseStatus.ARCHIVED },
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

  async approve(id: string, adminUserId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== CourseStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending courses can be approved');
    }

    const now = new Date();
    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.PUBLISHED,
        approvedAt: now,
        publishedAt: now,
        reviewedById: adminUserId,
        reviewedAt: now,
        rejectionFeedback: null,
      },
    });

    // Log the approval
    await this.auditLog.logDataChange(
      adminUserId,
      'COURSE_APPROVE',
      'COURSE',
      id,
      { old: { status: 'PENDING_REVIEW' }, new: { status: 'PUBLISHED' } },
    );

    return updatedCourse;
  }

  async reject(id: string, dto: RejectCourseDto, adminUserId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== CourseStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending courses can be rejected');
    }

    // Move back to draft status and persist rejection feedback
    const now = new Date();
    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.DRAFT,
        rejectionFeedback: dto.feedback,
        reviewedById: adminUserId,
        reviewedAt: now,
      },
    });

    // Log the rejection
    await this.auditLog.logDataChange(
      adminUserId,
      'COURSE_REJECT',
      'COURSE',
      id,
      { old: { status: 'PENDING_REVIEW' }, new: { status: 'DRAFT', feedback: dto.feedback } },
    );

    return updatedCourse;
  }

  async archive(id: string, userId: string, userRole: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.verifyCourseOwnership(id, userId, userRole);

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException('Course is already archived');
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.ARCHIVED },
    });

    await this.auditLog.logDataChange(
      userId,
      'COURSE_ARCHIVE',
      'COURSE',
      id,
      { old: { status: course.status }, new: { status: 'ARCHIVED' } },
    );

    return updatedCourse;
  }

  async unpublish(id: string, userId: string, userRole: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.verifyCourseOwnership(id, userId, userRole);

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Only published courses can be unpublished');
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.DRAFT },
    });

    await this.auditLog.logDataChange(
      userId,
      'COURSE_UNPUBLISH',
      'COURSE',
      id,
      { old: { status: 'PUBLISHED' }, new: { status: 'DRAFT' } },
    );

    return updatedCourse;
  }

  // ============ SECTIONS ============

  async createSection(courseId: string, dto: CreateSectionDto, userId: string, userRole: string) {
    await this.verifyCourseOwnership(courseId, userId, userRole);

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

  async updateSection(sectionId: string, dto: UpdateSectionDto, userId: string, userRole: string) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    await this.verifyCourseOwnership(section.courseId, userId, userRole);

    const updatedSection = await this.prisma.courseSection.update({
      where: { id: sectionId },
      data: dto,
      include: {
        lessons: true,
      },
    });

    return updatedSection;
  }

  async deleteSection(sectionId: string, userId: string, userRole: string) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    await this.verifyCourseOwnership(section.courseId, userId, userRole);

    await this.prisma.courseSection.delete({
      where: { id: sectionId },
    });

    return { message: 'Section deleted successfully' };
  }

  // ============ LESSONS ============

  async createLesson(sectionId: string, dto: CreateLessonDto, userId: string, userRole: string) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    await this.verifyCourseOwnership(section.courseId, userId, userRole);

    // Get next sort order if not provided
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const maxOrder = await this.prisma.lesson.aggregate({
        where: { sectionId },
        _max: { sortOrder: true },
      });
      sortOrder = (maxOrder._max.sortOrder || 0) + 1;
    }

    // Handle YouTube URL - create Material if provided
    let materialId = dto.materialId;
    if (dto.youtubeUrl && !materialId) {
      const material = await this.prisma.material.create({
        data: {
          type: 'VIDEO',
          title: dto.title,
          description: dto.description,
          youtubeUrl: dto.youtubeUrl,
          youtubeEnabled: true,
          duration: dto.duration,
          uploadedById: userId,
        },
      });
      materialId = material.id;
    }

    const lesson = await this.prisma.lesson.create({
      data: {
        sectionId,
        title: dto.title,
        description: dto.description,
        contentType: dto.contentType,
        materialId,
        isFreePreview: dto.isFreePreview || false,
        sortOrder,
      },
      include: {
        material: true,
      },
    });

    return lesson;
  }

  async updateLesson(lessonId: string, dto: UpdateLessonDto, userId: string, userRole: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: { include: { course: true } },
        material: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.verifyCourseOwnership(lesson.section.courseId, userId, userRole);

    // Handle YouTube URL - create or update Material
    let materialId = dto.materialId;
    if (dto.youtubeUrl !== undefined) {
      if (lesson.material && lesson.materialId) {
        // Update existing material
        await this.prisma.material.update({
          where: { id: lesson.materialId },
          data: {
            youtubeUrl: dto.youtubeUrl || null,
            youtubeEnabled: !!dto.youtubeUrl,
            duration: dto.duration,
            title: dto.title || lesson.material.title,
            description: dto.description || lesson.material.description,
          },
        });
        materialId = lesson.materialId;
      } else if (dto.youtubeUrl) {
        // Create new material
        const material = await this.prisma.material.create({
          data: {
            type: 'VIDEO',
            title: dto.title || lesson.title,
            description: dto.description || lesson.description,
            youtubeUrl: dto.youtubeUrl,
            youtubeEnabled: true,
            duration: dto.duration,
            uploadedById: userId,
          },
        });
        materialId = material.id;
      }
    }

    // Remove youtubeUrl and duration from dto as they're not Lesson fields
    const { youtubeUrl, duration, ...lessonData } = dto;

    const updatedLesson = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...lessonData,
        ...(materialId !== undefined && { materialId }),
      },
      include: {
        material: true,
      },
    });

    return updatedLesson;
  }

  async deleteLesson(lessonId: string, userId: string, userRole: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.verifyCourseOwnership(lesson.section.courseId, userId, userRole);

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
      this.prisma.course.count({ where: { deletedAt: null } }),
      this.prisma.course.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
      }),
      this.prisma.course.groupBy({
        by: ['level'],
        where: { deletedAt: null },
        _count: true,
      }),
      this.prisma.course.count({
        where: {
          deletedAt: null,
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
        include: { plan: true },
      });

      if (!subscription) {
        throw new ForbiddenException('An active subscription is required to enroll in this course');
      }

      // Verify the subscription tier allows access to paid courses
      if (subscription.plan && subscription.plan.tier === 'FREE') {
        throw new ForbiddenException('Your subscription tier does not include access to paid courses. Please upgrade your plan.');
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
      throw new ForbiddenException(
        'You must be enrolled in this course to access this lesson. Please enroll first.'
      );
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

    // Use the unified ProgressService for lesson completion
    const result = await this.progressService.completeLesson(
      userId,
      lessonId,
      courseId,
      'MANUAL',
      false, // not auto-completed
    );

    if (!result.success) {
      throw new ForbiddenException('Failed to complete lesson');
    }

    return {
      message: result.alreadyCompleted ? 'Lesson already completed' : 'Lesson marked as completed',
      courseCompleted: result.courseCompleted,
    };
  }

  async getAllEnrollments(query: CourseQueryDto) {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { course: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImageUrl: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    // Batch: get lesson counts per course
    const courseIds = [...new Set(enrollments.map((e) => e.courseId))];
    const lessonsByCourse = await this.prisma.lesson.findMany({
      where: { section: { courseId: { in: courseIds } } },
      select: { id: true, section: { select: { courseId: true } } },
    });

    const courseLessonMap = new Map<string, string[]>();
    for (const lesson of lessonsByCourse) {
      const cid = lesson.section.courseId;
      if (!courseLessonMap.has(cid)) courseLessonMap.set(cid, []);
      courseLessonMap.get(cid)!.push(lesson.id);
    }

    // Batch: get completed lesson counts per user+course
    const allLessonIds = lessonsByCourse.map((l) => l.id);
    const userIds = [...new Set(enrollments.map((e) => e.userId))];
    const completedLessons = await this.prisma.lessonProgress.findMany({
      where: {
        userId: { in: userIds },
        lessonId: { in: allLessonIds },
      },
      select: { userId: true, lessonId: true },
    });

    // Build lookup: userId -> Set<lessonId>
    const completedMap = new Map<string, Set<string>>();
    for (const lp of completedLessons) {
      if (!completedMap.has(lp.userId)) completedMap.set(lp.userId, new Set());
      completedMap.get(lp.userId)!.add(lp.lessonId);
    }

    const enrollmentsWithProgress = enrollments.map((enrollment) => {
      const lessonIds = courseLessonMap.get(enrollment.courseId) || [];
      const userCompleted = completedMap.get(enrollment.userId) || new Set();
      const completedCount = lessonIds.filter((id) => userCompleted.has(id)).length;
      const totalLessons = lessonIds.length;
      const progress = totalLessons > 0
        ? Math.round((completedCount / totalLessons) * 100)
        : 0;

      return {
        ...enrollment,
        progress,
        totalLessons,
        completedLessons: completedCount,
      };
    });

    return {
      enrollments: enrollmentsWithProgress,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

    // Batch: collect all lesson IDs across all enrolled courses
    const allLessonIds = enrollments.flatMap((e) =>
      e.course.sections.flatMap((s) => s.lessons.map((l) => l.id)),
    );

    // Single query to get all completed lessons for this user
    const completedLessons = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        lessonId: { in: allLessonIds },
      },
      select: { lessonId: true, completedAt: true },
    });

    const completedSet = new Set(completedLessons.map((lp) => lp.lessonId));

    // Build a map of lessonId -> completedAt for finding last activity
    const lessonCompletedAt = new Map(
      completedLessons.map((lp) => [lp.lessonId, lp.completedAt]),
    );

    const enrollmentsWithProgress = enrollments.map((enrollment) => {
      const courseLessonIds = enrollment.course.sections.flatMap((s) =>
        s.lessons.map((l) => l.id),
      );
      const totalLessons = courseLessonIds.length;
      const completedCount = courseLessonIds.filter((id) => completedSet.has(id)).length;
      const calculatedProgress = totalLessons > 0
        ? Math.round((completedCount / totalLessons) * 100)
        : 0;

      // Find last activity for this course's lessons
      let lastActivityAt = enrollment.enrolledAt;
      let lastLessonId: string | null = null;
      for (const lid of courseLessonIds) {
        const completedAt = lessonCompletedAt.get(lid);
        if (completedAt && completedAt > lastActivityAt) {
          lastActivityAt = completedAt;
          lastLessonId = lid;
        }
      }

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
          lastActivityAt,
          lastLessonId,
        },
      };
    });

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

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async verifyCourseOwnership(courseId: string, userId: string, userRole: string): Promise<void> {
    // Admins and super admins can modify any course
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      return;
    }

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: {
        createdById: true,
        instructors: { select: { userId: true } },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const isCreator = course.createdById === userId;
    const isInstructor = course.instructors.some(i => i.userId === userId);

    if (!isCreator && !isInstructor) {
      throw new ForbiddenException('You do not have permission to modify this course');
    }
  }
}
