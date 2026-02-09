import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogService } from '@/common/services/audit-log.service';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogService, PrismaService],
})
export class AuditLogsModule {}
