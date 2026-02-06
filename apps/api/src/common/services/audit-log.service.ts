import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface AuditLogData {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit Logging Service
 *
 * Logs all important actions for compliance and security monitoring.
 * The AuditLog model stores: user actions, data changes, access events.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          oldValues: data.oldValues as Prisma.InputJsonValue,
          newValues: data.newValues as Prisma.InputJsonValue,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      // Log to console if database logging fails
      this.logger.error('Failed to write audit log', {
        error: error instanceof Error ? error.message : String(error),
        data,
      });
    }
  }

  /**
   * Log user authentication events
   */
  async logAuth(
    userId: string,
    action: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      userId,
      action,
      entityType: 'USER',
      entityId: userId,
      ipAddress,
      userAgent,
      newValues: metadata,
    });
  }

  /**
   * Log data changes (CRUD operations)
   */
  async logDataChange(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes?: { old?: Record<string, unknown>; new?: Record<string, unknown> },
    ipAddress?: string,
  ): Promise<void> {
    await this.log({
      userId,
      action,
      entityType,
      entityId,
      ipAddress,
      oldValues: changes?.old,
      newValues: changes?.new,
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    action: string,
    details: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.log({
      userId: details.userId,
      action,
      entityType: 'SECURITY',
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      newValues: {
        reason: details.reason,
        ...details.metadata,
      },
    });
  }

  /**
   * Query audit logs with pagination
   */
  async queryLogs(options: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...filters } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.action) where.action = filters.action;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
