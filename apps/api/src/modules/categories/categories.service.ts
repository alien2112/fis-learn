import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  ReorderCategoriesDto,
} from './dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true };

    const categories = await this.prisma.category.findMany({
      where: {
        ...where,
        parentId: null, // Only get root categories
      },
      include: {
        children: {
          where,
          include: {
            children: {
              where,
              orderBy: { displayOrder: 'asc' },
            },
            _count: {
              select: { courses: true },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { courses: true },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return categories;
  }

  async findAllFlat(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true };

    return this.prisma.category.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            courses: true,
            children: true,
          },
        },
      },
      orderBy: [{ parentId: 'asc' }, { displayOrder: 'asc' }],
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          include: {
            _count: {
              select: { courses: true },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
        translations: true,
        _count: {
          select: {
            courses: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { courses: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    // Generate slug if not provided
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check if slug already exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this slug already exists');
    }

    // Validate parent exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }

      // Prevent deep nesting (max 2 levels)
      if (parent.parentId) {
        throw new BadRequestException('Categories can only be nested 2 levels deep');
      }
    }

    // Get next display order if not provided
    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await this.prisma.category.aggregate({
        where: { parentId: dto.parentId || null },
        _max: { displayOrder: true },
      });
      displayOrder = (maxOrder._max.displayOrder || 0) + 1;
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
        slug,
        parentId: dto.parentId,
        iconUrl: dto.iconUrl,
        displayOrder,
        isActive: dto.isActive ?? true,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check slug uniqueness if being updated
    if (dto.slug && dto.slug !== category.slug) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { slug: dto.slug },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this slug already exists');
      }
    }

    // Validate parent if being changed
    if (dto.parentId !== undefined && dto.parentId !== category.parentId) {
      if (dto.parentId) {
        // Cannot set self as parent
        if (dto.parentId === id) {
          throw new BadRequestException('Category cannot be its own parent');
        }

        const parent = await this.prisma.category.findUnique({
          where: { id: dto.parentId },
        });

        if (!parent) {
          throw new BadRequestException('Parent category not found');
        }

        // Prevent deep nesting
        if (parent.parentId) {
          throw new BadRequestException('Categories can only be nested 2 levels deep');
        }

        // Check if this category has children (can't move to subcategory if it has children)
        const hasChildren = await this.prisma.category.count({
          where: { parentId: id },
        });

        if (hasChildren > 0) {
          throw new BadRequestException(
            'Cannot move category with children to become a subcategory',
          );
        }
      }
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        slug: dto.slug,
        parentId: dto.parentId,
        iconUrl: dto.iconUrl,
        displayOrder: dto.displayOrder,
        isActive: dto.isActive,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            courses: true,
            children: true,
          },
        },
      },
    });

    return updatedCategory;
  }

  async reorder(dto: ReorderCategoriesDto) {
    const updates = dto.categories.map((item) =>
      this.prisma.category.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      }),
    );

    await this.prisma.$transaction(updates);

    return { message: 'Categories reordered successfully' };
  }

  async delete(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            courses: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has courses
    if (category._count.courses > 0) {
      throw new BadRequestException(
        'Cannot delete category with assigned courses. Remove or reassign courses first.',
      );
    }

    // Check if category has children
    if (category._count.children > 0) {
      throw new BadRequestException(
        'Cannot delete category with subcategories. Delete subcategories first.',
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }

  async getStats() {
    const [total, active, withCourses] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.category.count({ where: { isActive: true } }),
      this.prisma.category.count({
        where: {
          courses: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      withCourses,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
