import {
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MfaModuleService } from './mfa.service';
import { VerifyMfaSetupDto, DisableMfaDto, VerifyMfaDto } from './dto';
import { CurrentUser } from '../../common/decorators';

@ApiTags('MFA')
@Controller({ path: 'mfa', version: '1' })
export class MfaController {
  constructor(private readonly mfaService: MfaModuleService) {}

  /**
   * Get MFA status for current user
   */
  @Get('status')
  async getMfaStatus(@CurrentUser('id') userId: string) {
    const status = await this.mfaService.getMfaStatus(userId);
    return { data: status };
  }

  /**
   * Initiate MFA setup - returns QR code and secret
   */
  @Post('setup')
  async initiateMfaSetup(@CurrentUser('id') userId: string) {
    const setup = await this.mfaService.initiateMfaSetup(userId);
    return { data: setup };
  }

  /**
   * Complete MFA setup by verifying the first code
   * Returns backup codes
   */
  @Post('setup/verify')
  async completeMfaSetup(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyMfaSetupDto,
  ) {
    const result = await this.mfaService.completeMfaSetup(userId, dto);
    return { data: result };
  }

  /**
   * Disable MFA (requires password and current MFA code)
   */
  @Post('disable')
  async disableMfa(
    @CurrentUser('id') userId: string,
    @Body() dto: DisableMfaDto,
  ) {
    const result = await this.mfaService.disableMfa(userId, dto);
    return { data: result };
  }

  /**
   * Regenerate backup codes (requires current MFA code)
   */
  @Post('backup-codes/regenerate')
  async regenerateBackupCodes(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyMfaDto,
  ) {
    const result = await this.mfaService.regenerateBackupCodes(userId, dto.code);
    return { data: result };
  }
}
