import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CodeExerciseService } from './code-exercise.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CreateExerciseDto,
  UpdateExerciseDto,
  AddTestCaseDto,
  UpdateTestCaseDto,
  SubmitCodeDto,
  GetSubmissionsQueryDto,
} from './dto';

interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

@ApiTags('Code Exercises')
@ApiBearerAuth()
@Controller('code-exercises')
export class CodeExerciseController {
  constructor(private readonly codeExerciseService: CodeExerciseService) {}

  // ============ EXERCISE CRUD ============

  @Post()
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a new code exercise' })
  @ApiResponse({ status: 201, description: 'Exercise created' })
  async createExercise(@Body() dto: CreateExerciseDto) {
    return this.codeExerciseService.createExercise(dto.lessonId, {
      title: dto.title,
      description: dto.description,
      instructions: dto.instructions,
      languageId: dto.languageId,
      starterCode: dto.starterCode,
      solutionCode: dto.solutionCode,
      hints: dto.hints,
      difficulty: dto.difficulty,
      points: dto.points,
      timeLimit: dto.timeLimit,
      memoryLimit: dto.memoryLimit,
      isRequired: dto.isRequired,
      testCases: dto.testCases,
    });
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Get all exercises for a lesson' })
  async getExercisesForLesson(
    @CurrentUser() user: AuthUser,
    @Param('lessonId') lessonId: string,
  ) {
    const isInstructor =
      user.role === Role.ADMIN ||
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.INSTRUCTOR;

    return this.codeExerciseService.getExercisesForLesson(lessonId, isInstructor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an exercise by ID' })
  @ApiResponse({ status: 200, description: 'Exercise found' })
  @ApiResponse({ status: 404, description: 'Exercise not found' })
  async getExercise(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const isInstructor =
      user.role === Role.ADMIN ||
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.INSTRUCTOR;

    const exercise = await this.codeExerciseService.getExercise(id, isInstructor);

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    // Hide solution code for students
    if (!isInstructor) {
      return {
        ...exercise,
        solutionCode: undefined,
      };
    }

    return exercise;
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Update an exercise' })
  async updateExercise(
    @Param('id') id: string,
    @Body() dto: UpdateExerciseDto,
  ) {
    return this.codeExerciseService.updateExercise(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an exercise' })
  async deleteExercise(@Param('id') id: string) {
    await this.codeExerciseService.deleteExercise(id);
  }

  // ============ TEST CASES ============

  @Post(':exerciseId/test-cases')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Add a test case to an exercise' })
  async addTestCase(
    @Param('exerciseId') exerciseId: string,
    @Body() dto: AddTestCaseDto,
  ) {
    return this.codeExerciseService.addTestCase(exerciseId, dto);
  }

  @Patch('test-cases/:testCaseId')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Update a test case' })
  async updateTestCase(
    @Param('testCaseId') testCaseId: string,
    @Body() dto: UpdateTestCaseDto,
  ) {
    return this.codeExerciseService.updateTestCase(testCaseId, dto);
  }

  @Delete('test-cases/:testCaseId')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a test case' })
  async deleteTestCase(@Param('testCaseId') testCaseId: string) {
    await this.codeExerciseService.deleteTestCase(testCaseId);
  }

  // ============ SUBMISSIONS ============

  @Post(':exerciseId/submit')
  @ApiOperation({ summary: 'Submit code for an exercise' })
  @ApiResponse({ status: 200, description: 'Submission result with test outcomes' })
  @ApiResponse({ status: 404, description: 'Exercise not found' })
  async submitCode(
    @CurrentUser() user: AuthUser,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: SubmitCodeDto,
  ) {
    return this.codeExerciseService.submitCode(user.id, exerciseId, dto.code);
  }

  @Get(':exerciseId/submissions')
  @ApiOperation({ summary: 'Get submissions for an exercise' })
  async getSubmissions(
    @CurrentUser() user: AuthUser,
    @Param('exerciseId') exerciseId: string,
    @Query() query: GetSubmissionsQueryDto,
  ) {
    const isInstructor =
      user.role === Role.ADMIN ||
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.INSTRUCTOR;

    if (isInstructor) {
      // Instructors can see all submissions
      return this.codeExerciseService.getExerciseSubmissions(exerciseId, {
        status: query.status,
        limit: query.limit,
        cursor: query.cursor,
      });
    }

    // Students can only see their own submissions
    const submissions = await this.codeExerciseService.getUserSubmissions(
      user.id,
      exerciseId,
      query.limit || 10,
    );

    return { submissions, hasMore: false };
  }

  @Get(':exerciseId/my-submissions')
  @ApiOperation({ summary: 'Get current user\'s submissions for an exercise' })
  async getMySubmissions(
    @CurrentUser() user: AuthUser,
    @Param('exerciseId') exerciseId: string,
    @Query('limit') limit?: number,
  ) {
    return this.codeExerciseService.getUserSubmissions(
      user.id,
      exerciseId,
      limit || 10,
    );
  }

  @Get(':exerciseId/best-submission')
  @ApiOperation({ summary: 'Get user\'s best submission for an exercise' })
  async getBestSubmission(
    @CurrentUser() user: AuthUser,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.codeExerciseService.getBestSubmission(user.id, exerciseId);
  }

  @Get('submissions/:submissionId')
  @ApiOperation({ summary: 'Get a specific submission by ID' })
  @ApiResponse({ status: 200, description: 'Submission details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async getSubmission(
    @CurrentUser() user: AuthUser,
    @Param('submissionId') submissionId: string,
  ) {
    const isInstructor =
      user.role === Role.ADMIN ||
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.INSTRUCTOR;

    const submission = await this.codeExerciseService.getSubmission(
      submissionId,
      user.id,
      isInstructor,
    );

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  // ============ PROGRESS ============

  @Get('lesson/:lessonId/progress')
  @ApiOperation({ summary: 'Get user\'s progress on all exercises in a lesson' })
  async getLessonProgress(
    @CurrentUser() user: AuthUser,
    @Param('lessonId') lessonId: string,
  ) {
    return this.codeExerciseService.getLessonProgress(user.id, lessonId);
  }
}
