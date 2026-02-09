import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { EnrollmentExpiryService } from './enrollment-expiry.service';
import { ProgressService } from './progress.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [CoursesController],
  providers: [CoursesService, EnrollmentExpiryService, ProgressService],
  exports: [CoursesService, ProgressService],
})
export class CoursesModule {}
