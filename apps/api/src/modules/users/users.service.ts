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

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: UserQueryDto) {
    const { page = 1, limit = 10, search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

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
    const user = await this.prisma.user.findUnique({
      where: { id },
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
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
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
    const user = await this.prisma.user.findUnique({
      where: { id },
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

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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

    return updatedUser;
  }

  async updateRole(id: string, dto: UpdateRoleDto, updaterRole: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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

    return updatedUser;
  }

  async delete(id: string, deleterRole: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  async getStats() {
    const [totalUsers, byRole, byStatus, recentUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.user.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.user.count({
        where: {
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
