import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/common/decorators';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto } from './dto/chat-message.dto';

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

  @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check chatbot health status' })
  health() {
    return this.chatbotService.getProviderInfo();
  }
}
