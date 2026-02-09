import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as crypto from 'crypto';
import {
  GenerateCodeDto,
  GenerateBulkCodesDto,
  RedeemCodeDto,
  CodeQueryDto,
} from './dto';
import { AccessCodeType, AccessCodeStatus, PaymentStatus, Prisma } from '@prisma/client';

@Injectable()
export class AccessCodesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: CodeQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      courseId,
      materialId,
      expired,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AccessCodeWhereInput = {};

    if (search) {
      where.code = { contains: search, mode: 'insensitive' };
    }

    if (type) where.type = type;
    if (status) where.status = status;
    if (courseId) where.courseId = courseId;
    if (materialId) where.materialId = materialId;

    if (expired !== undefined) {
      if (expired) {
        where.expiresAt = { lt: new Date() };
      } else {
        where.OR = [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ];
      }
    }

    const [codes, total] = await Promise.all([
      this.prisma.accessCode.findMany({
        where,
        include: {
          course: {
            select: { id: true, title: true, slug: true },
          },
          material: {
            select: { id: true, title: true, type: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
          _count: {
            select: { usages: true },
          },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.accessCode.count({ where }),
    ]);

    return {
      data: codes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const code = await this.prisma.accessCode.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true, slug: true },
        },
        material: {
          select: { id: true, title: true, type: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        usages: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { redeemedAt: 'desc' },
        },
      },
    });

    if (!code) {
      throw new NotFoundException('Access code not found');
    }

    return code;
  }

  async findByCode(code: string) {
    const accessCode = await this.prisma.accessCode.findUnique({
      where: { code },
      include: {
        course: {
          select: { id: true, title: true, slug: true },
        },
        material: {
          select: { id: true, title: true, type: true },
        },
      },
    });

    if (!accessCode) {
      throw new NotFoundException('Access code not found');
    }

    return accessCode;
  }

  async generate(dto: GenerateCodeDto, creatorId: string) {
    // Validate target exists
    await this.validateTarget(dto.type, dto.courseId, dto.materialId);

    const code = this.generateUniqueCode();

    const accessCode = await this.prisma.accessCode.create({
      data: {
        code,
        type: dto.type,
        courseId: dto.courseId,
        materialId: dto.materialId,
        isSingleUse: dto.isSingleUse ?? true,
        maxRedemptions: dto.maxRedemptions ?? 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdById: creatorId,
      },
      include: {
        course: {
          select: { id: true, title: true },
        },
        material: {
          select: { id: true, title: true },
        },
      },
    });

    return accessCode;
  }

  async generateBulk(dto: GenerateBulkCodesDto, creatorId: string) {
    // Validate target exists
    await this.validateTarget(dto.type, dto.courseId, dto.materialId);

    const codes: string[] = [];
    const existingCodes = new Set<string>();

    // Generate unique codes
    while (codes.length < dto.quantity) {
      const code = this.generateUniqueCode();
      if (!existingCodes.has(code)) {
        existingCodes.add(code);
        codes.push(code);
      }
    }

    // Check none exist in database
    const existing = await this.prisma.accessCode.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    });

    if (existing.length > 0) {
      // Remove existing codes and generate new ones
      const existingSet = new Set(existing.map((e) => e.code));
      const validCodes = codes.filter((c) => !existingSet.has(c));

      while (validCodes.length < dto.quantity) {
        const code = this.generateUniqueCode();
        if (!existingCodes.has(code) && !existingSet.has(code)) {
          existingCodes.add(code);
          validCodes.push(code);
        }
      }
      codes.length = 0;
      codes.push(...validCodes.slice(0, dto.quantity));
    }

    // Bulk create
    await this.prisma.accessCode.createMany({
      data: codes.map((code) => ({
        code,
        type: dto.type,
        courseId: dto.courseId,
        materialId: dto.materialId,
        isSingleUse: dto.isSingleUse ?? true,
        maxRedemptions: dto.maxRedemptions ?? 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdById: creatorId,
      })),
    });

    // Fetch created codes
    const createdCodes = await this.prisma.accessCode.findMany({
      where: { code: { in: codes } },
      include: {
        course: {
          select: { id: true, title: true },
        },
        material: {
          select: { id: true, title: true },
        },
      },
    });

    return {
      count: createdCodes.length,
      codes: createdCodes,
    };
  }

  async redeem(dto: RedeemCodeDto, userId: string) {
    const code = dto.code.toUpperCase().trim();

    const accessCode = await this.prisma.accessCode.findUnique({
      where: { code },
      include: {
        course: true,
        material: true,
        usages: {
          where: { userId },
        },
      },
    });

    if (!accessCode) {
      throw new NotFoundException('Invalid access code');
    }

    // Check if already used by this user
    if (accessCode.usages.length > 0) {
      throw new ConflictException('You have already redeemed this code');
    }

    // Check status
    if (accessCode.status !== AccessCodeStatus.ACTIVE) {
      throw new BadRequestException(`Access code is ${accessCode.status.toLowerCase()}`);
    }

    // Check expiration
    if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
      // Update status to expired
      await this.prisma.accessCode.update({
        where: { id: accessCode.id },
        data: { status: AccessCodeStatus.EXPIRED },
      });
      throw new BadRequestException('Access code has expired');
    }

    // Check max redemptions
    if (accessCode.currentRedemptions >= accessCode.maxRedemptions) {
      throw new BadRequestException('Access code has reached maximum redemptions');
    }

    // Use interactive transaction for atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Re-fetch with lock to prevent race conditions
      const lockedCode = await tx.accessCode.findUnique({
        where: { id: accessCode.id },
      });

      if (!lockedCode) {
        throw new BadRequestException('Access code not found');
      }

      if (lockedCode.currentRedemptions >= lockedCode.maxRedemptions) {
        throw new BadRequestException('Access code has reached maximum redemptions');
      }

      // Process redemption based on type
      if (lockedCode.type === AccessCodeType.COURSE && accessCode.courseId) {
        const existingEnrollment = await tx.enrollment.findUnique({
          where: {
            userId_courseId: { userId, courseId: accessCode.courseId },
          },
        });

        if (existingEnrollment) {
          throw new ConflictException('You are already enrolled in this course');
        }

        await tx.enrollment.create({
          data: {
            userId,
            courseId: accessCode.courseId,
            paymentStatus: PaymentStatus.CODE_REDEEMED,
          },
        });
      }

      // Record usage and increment atomically
      const usage = await tx.accessCodeUsage.create({
        data: {
          codeId: lockedCode.id,
          userId,
        },
      });

      const shouldExpire =
        lockedCode.isSingleUse ||
        lockedCode.currentRedemptions + 1 >= lockedCode.maxRedemptions;

      await tx.accessCode.update({
        where: { id: lockedCode.id },
        data: {
          currentRedemptions: { increment: 1 },
          status: shouldExpire ? AccessCodeStatus.EXPIRED : AccessCodeStatus.ACTIVE,
        },
      });

      return usage;
    });

    return {
      message: 'Code redeemed successfully',
      type: accessCode.type,
      course: accessCode.course,
      material: accessCode.material,
    };
  }

  async revoke(id: string) {
    const accessCode = await this.prisma.accessCode.findUnique({
      where: { id },
    });

    if (!accessCode) {
      throw new NotFoundException('Access code not found');
    }

    if (accessCode.status === AccessCodeStatus.REVOKED) {
      throw new BadRequestException('Access code is already revoked');
    }

    const updatedCode = await this.prisma.accessCode.update({
      where: { id },
      data: { status: AccessCodeStatus.REVOKED },
    });

    return updatedCode;
  }

  async delete(id: string) {
    const accessCode = await this.prisma.accessCode.findUnique({
      where: { id },
      include: {
        _count: { select: { usages: true } },
      },
    });

    if (!accessCode) {
      throw new NotFoundException('Access code not found');
    }

    if (accessCode._count.usages > 0) {
      throw new BadRequestException(
        'Cannot delete access code that has been used. Revoke it instead.',
      );
    }

    await this.prisma.accessCode.delete({
      where: { id },
    });

    return { message: 'Access code deleted successfully' };
  }

  async export(query: CodeQueryDto) {
    // Get all codes matching the query (no pagination)
    const where: Prisma.AccessCodeWhereInput = {};

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.courseId) where.courseId = query.courseId;

    const codes = await this.prisma.accessCode.findMany({
      where,
      include: {
        course: {
          select: { title: true },
        },
        material: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format for CSV export with sanitization to prevent CSV injection
    const csvData = codes.map((code) => ({
      code: this.sanitizeCsvField(code.code),
      type: this.sanitizeCsvField(code.type),
      target: this.sanitizeCsvField(code.course?.title || code.material?.title || 'N/A'),
      status: this.sanitizeCsvField(code.status),
      maxRedemptions: code.maxRedemptions,
      currentRedemptions: code.currentRedemptions,
      expiresAt: code.expiresAt?.toISOString() || 'Never',
      createdAt: code.createdAt.toISOString(),
    }));

    return {
      count: csvData.length,
      data: csvData,
    };
  }

  async getStats() {
    const [total, byStatus, byType, recentUsages] = await Promise.all([
      this.prisma.accessCode.count(),
      this.prisma.accessCode.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.accessCode.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.accessCodeUsage.count({
        where: {
          redeemedAt: {
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
      byType: byType.reduce(
        (acc, item) => {
          acc[item.type] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      redemptionsLast30Days: recentUsages,
    };
  }

  private async validateTarget(
    type: AccessCodeType,
    courseId?: string,
    materialId?: string,
  ) {
    if (type === AccessCodeType.COURSE) {
      if (!courseId) {
        throw new BadRequestException('Course ID is required for course access codes');
      }
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course) {
        throw new BadRequestException('Course not found');
      }
    } else if (type === AccessCodeType.VIDEO) {
      if (!materialId) {
        throw new BadRequestException('Material ID is required for video access codes');
      }
      const material = await this.prisma.material.findUnique({
        where: { id: materialId },
      });
      if (!material) {
        throw new BadRequestException('Material not found');
      }
    }
  }

  private generateUniqueCode(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding ambiguous characters
    const randomBytes = crypto.randomBytes(length);
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(randomBytes[i] % chars.length);
    }
    return code;
  }

  private sanitizeCsvField(value: string | number): string | number {
    // Convert to string if number
    const str = String(value);
    // Escape cells that start with formula characters to prevent CSV injection
    // See: https://owasp.org/www-community/attacks/CSV_Injection
    if (/^[\+\-\=\@\t\r\n]/.test(str)) {
      return `'${str}`;
    }
    return value;
  }
}
