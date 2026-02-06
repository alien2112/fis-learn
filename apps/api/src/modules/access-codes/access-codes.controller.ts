import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessCodesService } from './access-codes.service';
import {
  GenerateCodeDto,
  GenerateBulkCodesDto,
  RedeemCodeDto,
  CodeQueryDto,
} from './dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/jwt-payload.interface';

@ApiTags('Access Codes')
@ApiBearerAuth()
@Controller('access-codes')
export class AccessCodesController {
  constructor(private readonly accessCodesService: AccessCodesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all access codes' })
  @ApiResponse({ status: 200, description: 'Returns paginated access codes' })
  async findAll(@Query() query: CodeQueryDto) {
    return this.accessCodesService.findAll(query);
  }

  @Get('stats')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get access code statistics' })
  @ApiResponse({ status: 200, description: 'Returns code statistics' })
  async getStats() {
    return this.accessCodesService.getStats();
  }

  @Get('export')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Export access codes to CSV' })
  @ApiResponse({ status: 200, description: 'Returns CSV data' })
  async export(@Query() query: CodeQueryDto, @Res() res: Response) {
    const result = await this.accessCodesService.export(query);

    // Generate CSV content
    const headers = [
      'Code',
      'Type',
      'Target',
      'Status',
      'Max Redemptions',
      'Current Redemptions',
      'Expires At',
      'Created At',
    ];

    const csvRows = [
      headers.join(','),
      ...result.data.map((row) =>
        [
          row.code,
          row.type,
          `"${row.target}"`,
          row.status,
          row.maxRedemptions,
          row.currentRedemptions,
          row.expiresAt,
          row.createdAt,
        ].join(','),
      ),
    ];

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=access-codes-${new Date().toISOString().split('T')[0]}.csv`,
    );
    res.send(csvContent);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get access code by ID' })
  @ApiResponse({ status: 200, description: 'Returns access code details' })
  @ApiResponse({ status: 404, description: 'Access code not found' })
  async findOne(@Param('id') id: string) {
    return this.accessCodesService.findOne(id);
  }

  @Post('generate')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate a single access code' })
  @ApiResponse({ status: 201, description: 'Access code generated' })
  @ApiResponse({ status: 400, description: 'Invalid target' })
  async generate(
    @Body() dto: GenerateCodeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accessCodesService.generate(dto, user.id);
  }

  @Post('generate-bulk')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate multiple access codes' })
  @ApiResponse({ status: 201, description: 'Access codes generated' })
  @ApiResponse({ status: 400, description: 'Invalid target or quantity' })
  async generateBulk(
    @Body() dto: GenerateBulkCodesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accessCodesService.generateBulk(dto, user.id);
  }

  @Post('redeem')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem an access code' })
  @ApiResponse({ status: 200, description: 'Code redeemed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  @ApiResponse({ status: 404, description: 'Code not found' })
  @ApiResponse({ status: 409, description: 'Already redeemed' })
  async redeem(
    @Body() dto: RedeemCodeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accessCodesService.redeem(dto, user.id);
  }

  @Put(':id/revoke')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revoke an access code' })
  @ApiResponse({ status: 200, description: 'Access code revoked' })
  @ApiResponse({ status: 400, description: 'Code already revoked' })
  @ApiResponse({ status: 404, description: 'Code not found' })
  async revoke(@Param('id') id: string) {
    return this.accessCodesService.revoke(id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an access code' })
  @ApiResponse({ status: 204, description: 'Access code deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete used code' })
  @ApiResponse({ status: 404, description: 'Code not found' })
  async delete(@Param('id') id: string) {
    return this.accessCodesService.delete(id);
  }
}
