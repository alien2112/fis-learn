import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  position: { x: number; y: number };
  prerequisites: string[];
  unlockConditions: {
    projectsCompleted: number;
    testScore: number;
    timeSpent: number;
  };
  resources: {
    lessons: string[];
    projects: string[];
    assessments: string[];
  };
  metadata: {
    estimatedHours: number;
    difficulty: 1 | 2 | 3 | 4 | 5;
    category: string;
  };
}

export interface SkillTree {
  id: string;
  name: string;
  description: string;
  category: 'programming' | 'design' | 'trading';
  published: boolean;
  nodes: SkillNode[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SkillTreesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.skillTree.findMany({
      include: {
        nodes: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findByCategory(category: string) {
    return this.prisma.skillTree.findMany({
      where: { category },
      include: {
        nodes: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.skillTree.findUnique({
      where: { id },
      include: {
        nodes: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async create(data: Omit<SkillTree, 'id' | 'createdAt' | 'updatedAt'>, userId: string) {
    const { nodes, createdBy, ...treeData } = data;
    
    return this.prisma.skillTree.create({
      data: {
        ...treeData,
        createdById: userId,
        nodes: {
          create: nodes.map(node => ({
            id: node.id,
            name: node.name,
            description: node.description,
            icon: node.icon,
            positionX: node.position.x,
            positionY: node.position.y,
            prerequisites: JSON.stringify(node.prerequisites),
            unlockConditions: JSON.stringify(node.unlockConditions),
            resources: JSON.stringify(node.resources),
            metadata: JSON.stringify(node.metadata),
          })),
        },
      },
      include: {
        nodes: true,
      },
    });
  }

  async update(id: string, data: Partial<SkillTree>) {
    const { nodes, createdBy, ...treeData } = data;
    
    // Update tree data
    const updateData: any = { ...treeData };
    
    // Handle nodes update if provided
    if (nodes) {
      // Delete existing nodes and create new ones
      await this.prisma.skillNode.deleteMany({
        where: { skillTreeId: id },
      });
      
      updateData.nodes = {
        create: nodes.map(node => ({
          id: node.id,
          name: node.name,
          description: node.description,
          icon: node.icon,
          positionX: node.position.x,
          positionY: node.position.y,
          prerequisites: JSON.stringify(node.prerequisites),
          unlockConditions: JSON.stringify(node.unlockConditions),
          resources: JSON.stringify(node.resources),
          metadata: JSON.stringify(node.metadata),
        })),
      };
    }
    
    return this.prisma.skillTree.update({
      where: { id },
      data: updateData,
      include: {
        nodes: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.skillTree.delete({
      where: { id },
    });
  }

  async publish(id: string, published: boolean) {
    return this.prisma.skillTree.update({
      where: { id },
      data: { published },
    });
  }
}
