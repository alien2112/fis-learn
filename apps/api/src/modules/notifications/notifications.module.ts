import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { EMAIL_SERVICE } from '@/common/external-services';
import { createSmtpEmailServiceFromEnv } from '@/common/external-services/implementations/smtp-email.service';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [
    NotificationsService,
    NotificationsGateway,
    {
      provide: EMAIL_SERVICE,
      useFactory: () => createSmtpEmailServiceFromEnv(),
    },
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
