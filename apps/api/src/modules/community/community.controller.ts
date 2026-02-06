import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles, CurrentUser } from '@/common/decorators';
import { Role } from '@prisma/client';
import { CommunityService } from './community.service';
import { CommunityGateway } from './community.gateway';
import {
  CreateChannelDto,
  CreateMessageDto,
  ListMessagesDto,
  ReportMessageDto,
  ToggleMessageFlagDto,
} from './dto';
import { AuthUser } from '@/modules/auth/types/jwt-payload.interface';

@ApiTags('Community')
@ApiBearerAuth()
@Controller('community')
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly communityGateway: CommunityGateway,
  ) {}

  @Get('courses/:courseId/channels')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List community channels for a course' })
  @ApiResponse({ status: 200, description: 'Returns channel list' })
  async listChannels(
    @Param('courseId') courseId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communityService.listChannels(courseId, user);
  }

  @Post('courses/:courseId/channels')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new community channel' })
  @ApiResponse({ status: 201, description: 'Channel created' })
  async createChannel(
    @Param('courseId') courseId: string,
    @Body() dto: CreateChannelDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communityService.createChannel(courseId, user, dto.name, dto.type, dto.slug);
  }

  @Get('channels/:channelId/messages')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List messages for a channel' })
  @ApiResponse({ status: 200, description: 'Returns messages with cursor pagination' })
  async listMessages(
    @Param('channelId') channelId: string,
    @Query() query: ListMessagesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communityService.listMessages(channelId, user, query);
  }

  @Post('channels/:channelId/messages')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new message in a channel' })
  @ApiResponse({ status: 201, description: 'Message created' })
  async createMessage(
    @Param('channelId') channelId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    const message = await this.communityService.createMessage(channelId, user, dto);
    this.communityGateway.emitMessage(message);
    return message;
  }

  @Post('messages/:messageId/pin')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Pin or unpin a message' })
  async pinMessage(
    @Param('messageId') messageId: string,
    @Body() dto: ToggleMessageFlagDto,
    @CurrentUser() user: AuthUser,
  ) {
    const message = await this.communityService.pinMessage(messageId, user, dto.value);
    this.communityGateway.emitMessageUpdate(message);
    return message;
  }

  @Post('messages/:messageId/mark-answer')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mark or unmark a message as an answer' })
  async markAnswer(
    @Param('messageId') messageId: string,
    @Body() dto: ToggleMessageFlagDto,
    @CurrentUser() user: AuthUser,
  ) {
    const message = await this.communityService.markAnswer(messageId, user, dto.value);
    this.communityGateway.emitMessageUpdate(message);
    return message;
  }

  @Post('messages/:messageId/lock')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lock or unlock a thread' })
  async lockThread(
    @Param('messageId') messageId: string,
    @Body() dto: ToggleMessageFlagDto,
    @CurrentUser() user: AuthUser,
  ) {
    const message = await this.communityService.toggleThreadLock(messageId, user, dto.value);
    this.communityGateway.emitMessageUpdate(message);
    return message;
  }

  @Post('messages/:messageId/report')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Report a message' })
  async reportMessage(
    @Param('messageId') messageId: string,
    @Body() dto: ReportMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communityService.reportMessage(messageId, user, dto.reason);
  }

  @Delete('messages/:messageId')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Hide a message (soft delete)' })
  async removeMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const message = await this.communityService.removeMessage(messageId, user);
    this.communityGateway.emitMessageUpdate(message);
    return message;
  }

  @Post('messages/:messageId/restore')
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Restore a hidden message' })
  async restoreMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const message = await this.communityService.restoreMessage(messageId, user);
    this.communityGateway.emitMessageUpdate(message);
    return message;
  }
}
