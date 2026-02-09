import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/common/decorators';
import { AuditLogService } from '@/common/services/audit-log.service';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Query audit logs (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit logs' })
  async queryLogs(@Query() query: AuditLogsQueryDto) {
    const { userId, entityType, entityId, action, startDate, endDate, page, limit } = query;

    return this.auditLogService.queryLogs({
      userId,
      entityType,
      entityId,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }
}
