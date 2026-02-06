import { Module } from '@nestjs/common';
import { MfaController } from './mfa.controller';
import { MfaModuleService } from './mfa.service';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  MFA_SERVICE,
  EMAIL_SERVICE,
} from '../../common/external-services';
import { TotpMfaService } from '../../common/external-services/implementations/totp-mfa.service';
import {
  SmtpEmailService,
  createSmtpEmailServiceFromEnv,
} from '../../common/external-services/implementations/smtp-email.service';

/**
 * MFA Module
 *
 * Provider-agnostic multi-factor authentication.
 *
 * To change MFA provider:
 * 1. Create a new MFA service implementation (e.g., TwilioSmsMfaService)
 * 2. Update the MFA_SERVICE provider below
 *
 * Supported methods:
 * - TOTP (current): Works with Google Authenticator, Authy, etc.
 * - SMS (future): Twilio, Vonage, etc.
 * - Email OTP (future): Any email provider
 */
@Module({
  imports: [PrismaModule],
  controllers: [MfaController],
  providers: [
    MfaModuleService,

    // ============ MFA SERVICE ============
    // Change this provider to use a different MFA method
    {
      provide: MFA_SERVICE,
      useFactory: () => {
        const method = process.env.MFA_METHOD || 'totp';

        switch (method) {
          case 'totp':
            return new TotpMfaService({
              issuer: process.env.APP_NAME || 'FIS Learn',
            });
          // Add more methods here:
          // case 'sms':
          //   return createTwilioMfaServiceFromEnv();
          default:
            return new TotpMfaService();
        }
      },
    },

    // ============ EMAIL SERVICE ============
    {
      provide: EMAIL_SERVICE,
      useFactory: () => createSmtpEmailServiceFromEnv(),
    },
  ],
  exports: [MfaModuleService, MFA_SERVICE],
})
export class MfaModule {}
