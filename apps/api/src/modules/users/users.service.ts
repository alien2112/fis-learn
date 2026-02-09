import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UpdateRoleDto,
  UserQueryDto,
} from './dto';
import { Role, UserStatus, Prisma } from '@prisma/client';
import { ChangePasswordDto } from '@/modules/auth/dto/reset-password.dto';
import { AuditLogService } from '@/common/services/audit-log.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async findAll(query: UserQueryDto) {
    const { page = 1, limit = 10, search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          status: true,
          locale: true,
          timezone: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              enrollments: true,
              coursesCreated: true,
            },
          },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findStudents(query: UserQueryDto) {
    return this.findAll({ ...query, role: Role.STUDENT });
  }

  async findInstructors(query: UserQueryDto) {
    const result = await this.findAll({ ...query, role: Role.INSTRUCTOR });

    // Enhance with instructor profile data
    const userIds = result.data.map((u) => u.id);
    const profiles = await this.prisma.instructorProfile.findMany({
      where: { userId: { in: userIds } },
    });

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    result.data = result.data.map((user) => ({
      ...user,
      instructorProfile: profileMap.get(user.id) || null,
    }));

    return result;
  }

  async findAdmins(query: UserQueryDto) {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      role: { in: [Role.ADMIN, Role.SUPER_ADMIN] },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        status: true,
        locale: true,
        timezone: true,
        mfaEnabled: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        instructorProfile: true,
        _count: {
          select: {
            enrollments: true,
            coursesCreated: true,
            coursesAsInstructor: true,
            blogPosts: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(dto: CreateUserDto, creatorRole: Role) {
    // Check if email already exists (exclude soft-deleted)
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate role assignment permissions
    if (dto.role) {
      this.validateRoleAssignment(creatorRole, dto.role);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        role: dto.role || Role.STUDENT,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(), // Auto-verify when created by admin
        avatarUrl: dto.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // If creating an instructor, create empty profile
    if (user.role === Role.INSTRUCTOR) {
      await this.prisma.instructorProfile.create({
        data: { userId: user.id },
      });
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        status: true,
        locale: true,
        timezone: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, adminUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cannot change status of super admin
    if (user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot change status of Super Admin');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    // If user is suspended or banned, invalidate their refresh tokens
    if (dto.status === UserStatus.SUSPENDED || dto.status === UserStatus.BANNED) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: id },
      });
    }

    // Log the status change
    await this.auditLog.logDataChange(
      adminUserId,
      'USER_STATUS_CHANGE',
      'USER',
      id,
      { old: { status: user.status }, new: { status: dto.status } },
    );

    return updatedUser;
  }

  async updateRole(id: string, dto: UpdateRoleDto, updaterRole: Role, adminUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate role change permissions
    this.validateRoleAssignment(updaterRole, dto.role);

    // Cannot demote a super admin
    if (user.role === Role.SUPER_ADMIN && dto.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot demote a Super Admin');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    // Invalidate all refresh tokens to force re-authentication with new role
    await this.prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    // Create instructor profile if promoting to instructor
    if (dto.role === Role.INSTRUCTOR && user.role !== Role.INSTRUCTOR) {
      const existingProfile = await this.prisma.instructorProfile.findUnique({
        where: { userId: id },
      });

      if (!existingProfile) {
        await this.prisma.instructorProfile.create({
          data: { userId: id },
        });
      }
    }

    // Log the role change
    await this.auditLog.logDataChange(
      adminUserId,
      'USER_ROLE_CHANGE',
      'USER',
      id,
      { old: { role: user.role }, new: { role: dto.role } },
    );

    return updatedUser;
  }

  async delete(id: string, deleterRole: Role, adminUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cannot delete super admin
    if (user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot delete Super Admin');
    }

    // Only super admin can delete admins
    if (user.role === Role.ADMIN && deleterRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can delete Admin users');
    }

    // Log the deletion before executing
    await this.auditLog.logDataChange(
      adminUserId,
      'USER_DELETE',
      'USER',
      id,
      { old: { email: user.email, role: user.role, name: user.name } },
    );

    // Soft delete: update deletedAt and status instead of hard delete
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.BANNED },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    return { message: 'User deleted successfully' };
  }

  async getStats() {
    const [totalUsers, byRole, byStatus, recentUsers] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: { deletedAt: null },
        _count: true,
      }),
      this.prisma.user.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    return {
      total: totalUsers,
      byRole: byRole.reduce(
        (acc, item) => {
          acc[item.role] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      newUsersLast30Days: recentUsers,
    };
  }

  private validateRoleAssignment(assignerRole: Role, targetRole: Role) {
    // Only Super Admin can create/assign Super Admin or Admin roles
    if (
      (targetRole === Role.SUPER_ADMIN || targetRole === Role.ADMIN) &&
      assignerRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only Super Admin can assign Admin or Super Admin roles',
      );
    }
  }

  async findMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        status: true,
        locale: true,
        timezone: true,
        subscriptionTier: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        status: true,
        locale: true,
        timezone: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password changed successfully' };
  }
}
