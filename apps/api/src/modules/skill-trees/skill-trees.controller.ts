import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkillTreesService } from './skill-trees.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { GetUser } from '@/common/decorators/get-user.decorator';

@ApiTags('Admin - Skill Trees')
@Controller('admin/skill-trees')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SkillTreesController {
  constructor(private readonly skillTreesService: SkillTreesService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'Get all skill trees' })
  async findAll(@Query('category') category?: string) {
    if (category) {
      return this.skillTreesService.findByCategory(category);
    }
    return this.skillTreesService.findAll();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'Get skill tree by ID' })
  async findOne(@Param('id') id: string) {
    return this.skillTreesService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'Create new skill tree' })
  async create(@Body() data: any, @GetUser() user: any) {
    return this.skillTreesService.create(data, user.userId);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'Update skill tree' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.skillTreesService.update(id, data);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete skill tree' })
  async delete(@Param('id') id: string) {
    return this.skillTreesService.delete(id);
  }

  @Put(':id/publish')
  @Roles('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'Publish or unpublish skill tree' })
  async publish(@Param('id') id: string, @Body('published') published: boolean) {
    return this.skillTreesService.publish(id, published);
  }
}
