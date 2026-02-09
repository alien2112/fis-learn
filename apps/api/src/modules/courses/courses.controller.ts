import {
  CacheInterceptor,
  CacheTTL,
} from '@nestjs/cache-manager';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CoursesService } from './courses.service';
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
import { Roles, CurrentUser, Public } from '@/common/decorators';
import { AuthUser } from '@/modules/auth/types/jwt-payload.interface';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  // ============ COURSE ENDPOINTS ============

  @Public()
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // 1 minute for list (frequently changes)
  @ApiOperation({ summary: 'Get published courses (public)' })
  @ApiResponse({ status: 200, description: 'List of published courses' })
  async findPublished(@Query() query: CourseQueryDto) {
    return this.coursesService.findPublished(query);
  }

  @Get('all')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all courses (any status) - Admin only' })
  @ApiResponse({ status: 200, description: 'List of all courses' })
  async findAll(@Query() query: CourseQueryDto) {
    return this.coursesService.findAll(query);
  }

  @Get('pending')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get courses pending approval - Admin only' })
  @ApiResponse({ status: 200, description: 'List of pending courses' })
  async findPending(@Query() query: CourseQueryDto) {
    return this.coursesService.findPending(query);
  }

  @Get('my-courses')
  @Roles(Role.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get courses where user is instructor' })
  @ApiResponse({ status: 200, description: 'List of instructor courses' })
  async findMyCourses(
    @Query() query: CourseQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.findAll({ ...query, instructorId: user.id });
  }

  @Get('stats')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get course statistics' })
  @ApiResponse({ status: 200, description: 'Course statistics' })
  async getStats() {
    return this.coursesService.getStats();
  }

  @Public()
  @Get('slug/:slug')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes for single course (rarely changes)
  @ApiOperation({ summary: 'Get course by slug' })
  @ApiResponse({ status: 200, description: 'Course details' })
  async findBySlug(@Param('slug') slug: string, @CurrentUser() user?: AuthUser) {
    return this.coursesService.findBySlug(slug, user?.id, user?.role);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({ status: 200, description: 'Course details' })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.findOne(id, user.id, user.role);
  }

  @Post()
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created' })
  async create(@Body() dto: CreateCourseDto, @CurrentUser() user: AuthUser) {
    return this.coursesService.create(dto, user.id);
  }

  @Put(':id')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a course' })
  @ApiResponse({ status: 200, description: 'Course updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a course - Admin only' })
  @ApiResponse({ status: 200, description: 'Course deleted' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.delete(id, user.id);
  }

  // ============ APPROVAL WORKFLOW ============

  @Post(':id/submit')
  @Roles(Role.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit course for review' })
  @ApiResponse({ status: 200, description: 'Course submitted for review' })
  async submitForReview(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.submitForReview(id, user.id);
  }

  @Put(':id/approve')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a course' })
  @ApiResponse({ status: 200, description: 'Course approved' })
  async approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.approve(id, user.id);
  }

  @Put(':id/reject')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a course with feedback' })
  @ApiResponse({ status: 200, description: 'Course rejected' })
  async reject(@Param('id') id: string, @Body() dto: RejectCourseDto, @CurrentUser() user: AuthUser) {
    return this.coursesService.reject(id, dto, user.id);
  }

  @Put(':id/archive')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a course (hides from catalog, preserves enrollments)' })
  @ApiResponse({ status: 200, description: 'Course archived' })
  async archive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.archive(id, user.id, user.role);
  }

  @Put(':id/unpublish')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish a course (moves back to draft)' })
  @ApiResponse({ status: 200, description: 'Course unpublished' })
  async unpublish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.unpublish(id, user.id, user.role);
  }

  // ============ SECTIONS ============

  @Post(':id/sections')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a section to course' })
  @ApiResponse({ status: 201, description: 'Section created' })
  async createSection(
    @Param('id') id: string,
    @Body() dto: CreateSectionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.createSection(id, dto, user.id, user.role);
  }

  @Put('sections/:sectionId')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a section' })
  @ApiResponse({ status: 200, description: 'Section updated' })
  async updateSection(
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.updateSection(sectionId, dto, user.id, user.role);
  }

  @Delete('sections/:sectionId')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a section' })
  @ApiResponse({ status: 200, description: 'Section deleted' })
  async deleteSection(@Param('sectionId') sectionId: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.deleteSection(sectionId, user.id, user.role);
  }

  // ============ LESSONS ============

  @Post('sections/:sectionId/lessons')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a lesson to section' })
  @ApiResponse({ status: 201, description: 'Lesson created' })
  async createLesson(
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.createLesson(sectionId, dto, user.id, user.role);
  }

  @Put('lessons/:lessonId')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a lesson' })
  @ApiResponse({ status: 200, description: 'Lesson updated' })
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.updateLesson(lessonId, dto, user.id, user.role);
  }

  @Delete('lessons/:lessonId')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a lesson' })
  @ApiResponse({ status: 200, description: 'Lesson deleted' })
  async deleteLesson(@Param('lessonId') lessonId: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.deleteLesson(lessonId, user.id, user.role);
  }

  // ============ INSTRUCTORS ============

  @Put(':id/instructors')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign instructors to course' })
  @ApiResponse({ status: 200, description: 'Instructors assigned' })
  async assignInstructors(
    @Param('id') id: string,
    @Body() dto: AssignInstructorsDto,
  ) {
    return this.coursesService.assignInstructors(id, dto);
  }

  // ============ ENROLLMENT & PROGRESS ============

  @Post(':id/enroll')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiResponse({ status: 200, description: 'Enrollment created or returned' })
  @ApiResponse({ status: 403, description: 'Subscription required for paid courses' })
  async enrollStudent(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.enrollStudent(id, user.id);
  }

  @Get('enrollments/all')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all enrollments (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all enrollments' })
  async getAllEnrollments(@Query() query: CourseQueryDto) {
    return this.coursesService.getAllEnrollments(query);
  }

  @Get('enrollments/my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all enrollments for current student' })
  @ApiResponse({ status: 200, description: 'List of student enrollments' })
  async getMyEnrollments(@CurrentUser() user: AuthUser) {
    return this.coursesService.getStudentEnrollments(user.id);
  }

  @Get(':id/lessons/:lessonId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lesson content (enrollment-gated)' })
  @ApiResponse({ status: 200, description: 'Lesson content with material' })
  @ApiResponse({ status: 403, description: 'Not enrolled and subscription required' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async getLessonContent(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.getLessonContent(id, lessonId, user.id);
  }

  @Post(':id/lessons/:lessonId/complete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a lesson as completed' })
  @ApiResponse({ status: 200, description: 'Lesson marked as completed' })
  @ApiResponse({ status: 403, description: 'Not enrolled' })
  async completeLessonForUser(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.completeLessonForUser(id, lessonId, user.id);
  }

  @Get(':id/progress')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student progress for a course' })
  @ApiResponse({ status: 200, description: 'Progress with per-section lesson status' })
  async getStudentProgress(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.getStudentProgress(id, user.id);
  }
}
