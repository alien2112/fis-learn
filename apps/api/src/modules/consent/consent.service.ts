import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

interface ConsentPreferences {
  analytics: boolean;
  thirdParty: boolean;
  consentDate: string;
}

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(private prisma: PrismaService) {}

  async recordConsent(
    userId: string | null,
    preferences: ConsentPreferences,
    ipAddress: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'COOKIE_CONSENT',
        entityType: 'CONSENT',
        newValues: {
          analytics: preferences.analytics,
          thirdParty: preferences.thirdParty,
          consentDate: preferences.consentDate,
          ipAddress,
        },
      },
    });

    this.logger.log(
      `Consent recorded for ${userId || 'anonymous'}: analytics=${preferences.analytics}, thirdParty=${preferences.thirdParty}`,
    );
  }
}
