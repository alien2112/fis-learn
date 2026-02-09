import { Controller, Get, Post, Body, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/common/decorators';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto, AuthenticatedChatMessageDto } from './dto/chat-message.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('Chatbot')
@Controller({ path: 'chatbot', version: '1' })
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Public()
  @Post('public')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Max 10 requests per minute per IP
  @ApiOperation({ summary: 'Chat with public AI assistant (no auth required)' })
  async publicChat(@Body() dto: ChatMessageDto) {
    const reply = await this.chatbotService.chatPublic(dto.messages);
    return { reply };
  }

  @Post('authenticated')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // Higher limit for authenticated users
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chat with context-aware AI assistant (requires auth)' })
  async authenticatedChat(
    @Body() dto: AuthenticatedChatMessageDto,
    @Req() req: any,
  ) {
    const reply = await this.chatbotService.chatAuthenticated(
      req.user.userId,
      dto.messages,
      dto.courseId,
      dto.lessonId,
      dto.exerciseId,
    );
    return { reply };
  }

  @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check chatbot health status' })
  health() {
    return this.chatbotService.getProviderInfo();
  }
}
