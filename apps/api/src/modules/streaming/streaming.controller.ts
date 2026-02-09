import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { StreamingService } from './streaming.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CreateStreamDto,
  UpdateStreamDto,
  GenerateTokenDto,
} from './dto';

interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

@ApiTags('Streaming')
@ApiBearerAuth()
@Controller('streaming')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  // ============ STREAM CRUD ============

  @Post()
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a new stream' })
  @ApiResponse({ status: 201, description: 'Stream created successfully' })
  async createStream(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateStreamDto,
  ) {
    const stream = await this.streamingService.createStream(
      user.id,
      dto.courseId,
      dto.title,
      dto.scheduledAt,
    );
    return { success: true, data: stream };
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'List streams for a course' })
  async listStreams(@Param('courseId') courseId: string) {
    const streams = await this.streamingService.listStreams(courseId);
    return { success: true, data: streams };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stream details with token' })
  async getStream(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const isInstructor = user.role === Role.ADMIN || user.role === Role.INSTRUCTOR;
    const stream = await this.streamingService.getStream(id, user.id, isInstructor);
    return { success: true, data: stream };
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Update a stream' })
  async updateStream(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStreamDto,
  ) {
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    const stream = await this.streamingService.updateStream(
      id,
      user.id,
      dto,
    );
    return { success: true, data: stream };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Delete a stream' })
  async deleteStream(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    await this.streamingService.deleteStream(id, user.id, isAdmin);
    return { success: true };
  }

  // ============ TOKEN GENERATION ============

  @Post('token')
  @ApiOperation({ summary: 'Generate ZegoCloud token for joining stream' })
  async generateToken(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateTokenDto,
  ) {
    const token = this.streamingService.generateToken(
      dto.roomId,
      user.id,
      dto.role,
    );
    return {
      success: true,
      data: {
        token,
        appId: process.env.ZEGO_APP_ID,
        userId: user.id,
        userName: dto.userName,
        roomId: dto.roomId,
        role: dto.role,
      },
    };
  }

  // ============ VIEWER MANAGEMENT ============

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a stream as viewer' })
  async joinStream(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const viewer = await this.streamingService.joinStream(id, user.id);
    return { success: true, data: viewer };
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a stream' })
  async leaveStream(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    await this.streamingService.leaveStream(id, user.id);
    return { success: true };
  }

  @Get('course/:courseId/upcoming')
  @ApiOperation({ summary: 'Get upcoming scheduled streams for a course' })
  async getUpcomingStreams(@Param('courseId') courseId: string) {
    const streams = await this.streamingService.getUpcomingStreams(courseId);
    return { success: true, data: streams };
  }

  @Get('course/:courseId/recordings')
  @ApiOperation({ summary: 'Get recorded (ended) streams for a course' })
  async getRecordedStreams(@Param('courseId') courseId: string) {
    const streams = await this.streamingService.getRecordedStreams(courseId);
    return { success: true, data: streams };
  }

  @Post(':id/recording')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Save stream recording reference' })
  async saveRecording(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('videoAssetId') videoAssetId: string,
  ) {
    const result = await this.streamingService.saveRecording(id, user.id, videoAssetId);
    return { success: true, data: result };
  }

  // ============ ADMIN ============

  @Get('admin/all')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all streams (admin)' })
  async getAllStreamsAdmin(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.streamingService.getAllStreamsAdmin({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { success: true, ...result };
  }

  @Get('admin/stats')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get streaming statistics (admin)' })
  async getStreamingStats() {
    const stats = await this.streamingService.getStreamingStats();
    return { success: true, data: stats };
  }

  // ============ DISCOVERY ============

  @Get('active')
  @ApiOperation({ summary: 'Get all currently active (live) streams' })
  async getActiveStreams() {
    const streams = await this.streamingService.getActiveStreams();
    return { success: true, data: streams };
  }

  @Get('my-streams')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get streams created by current user' })
  async getMyStreams(@CurrentUser() user: AuthUser) {
    const streams = await this.streamingService.getUserStreams(user.id);
    return { success: true, data: streams };
  }
}
