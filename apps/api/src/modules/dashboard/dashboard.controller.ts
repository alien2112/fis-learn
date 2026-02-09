import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/jwt-payload.interface';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all KPI metrics' })
  @ApiResponse({ status: 200, description: 'Returns KPI metrics' })
  async getKPIs() {
    return this.dashboardService.getKPIs();
  }

  @Get('enrollment-trend')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get monthly enrollment trend' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default: 6)' })
  @ApiResponse({ status: 200, description: 'Returns enrollment trend data' })
  async getEnrollmentTrend(@Query('months') months?: string) {
    const monthCount = months ? parseInt(months, 10) : 6;
    return this.dashboardService.getEnrollmentTrend(monthCount);
  }

  @Get('user-growth')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user growth trend' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default: 6)' })
  @ApiResponse({ status: 200, description: 'Returns user growth data' })
  async getUserGrowthTrend(@Query('months') months?: string) {
    const monthCount = months ? parseInt(months, 10) : 6;
    return this.dashboardService.getUserGrowthTrend(monthCount);
  }

  @Get('course-stats')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get course statistics' })
  @ApiResponse({ status: 200, description: 'Returns course statistics' })
  async getCourseStats() {
    return this.dashboardService.getCourseStats();
  }

  @Get('recent-activity')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get recent activity feed' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items (default: 10)' })
  @ApiResponse({ status: 200, description: 'Returns recent activity' })
  async getRecentActivity(@Query('limit') limit?: string) {
    const itemLimit = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getRecentActivity(itemLimit);
  }

  @Get('instructor-stats')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get instructor-specific statistics' })
  @ApiResponse({ status: 200, description: 'Returns instructor stats' })
  async getInstructorStats(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getInstructorStats(user.id);
  }

  @Get('student-stats')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get student-specific statistics' })
  @ApiResponse({ status: 200, description: 'Returns student stats' })
  async getStudentStats(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getStudentStats(user.id);
  }

  @Get('top-instructors')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get top instructors by student count' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of instructors (default: 5)' })
  @ApiResponse({ status: 200, description: 'Returns top instructors' })
  async getTopInstructors(@Query('limit') limit?: string) {
    const itemLimit = limit ? parseInt(limit, 10) : 5;
    return this.dashboardService.getTopInstructors(itemLimit);
  }
}
