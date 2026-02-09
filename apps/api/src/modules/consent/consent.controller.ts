import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { ConsentService } from './consent.service';

class RecordConsentDto {
  analytics: boolean;
  thirdParty: boolean;
  consentDate: string;
}

@ApiTags('Consent')
@Controller('consent')
export class ConsentController {
  constructor(private consentService: ConsentService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Record cookie consent preferences' })
  async recordConsent(@Body() dto: RecordConsentDto, @Req() req: any) {
    const userId = req.user?.userId || null;
    await this.consentService.recordConsent(userId, dto, req.ip);
    return { recorded: true };
  }
}
