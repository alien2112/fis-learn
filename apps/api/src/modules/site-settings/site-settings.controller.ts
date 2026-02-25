import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SiteSettingsService } from './site-settings.service';
import { UpdateSiteSettingDto, BulkUpdateSiteSettingsDto } from './dto/update-site-setting.dto';

@ApiTags('Site Settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  /** Public endpoint — returns flat { key: value } map. Cached by Next.js ISR. */
  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Get public site settings (no auth)' })
  @ApiResponse({ status: 200, description: 'Flat key-value map of public settings' })
  async getPublicSettings() {
    return this.siteSettingsService.getPublicSettings();
  }

  /** Admin: list all settings with labels/categories for the UI */
  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all site settings (admin)' })
  @ApiResponse({ status: 200, description: 'All settings with labels/categories' })
  async findAll() {
    return this.siteSettingsService.findAll();
  }

  /** Admin: update a single setting */
  @Patch(':key')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a single setting by key' })
  @ApiResponse({ status: 200, description: 'Setting updated' })
  async upsert(@Param('key') key: string, @Body() dto: UpdateSiteSettingDto) {
    return this.siteSettingsService.upsert(key, dto);
  }

  /** Admin: bulk update multiple settings at once */
  @Post('bulk')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk update site settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async bulkUpsert(@Body() dto: BulkUpdateSiteSettingsDto) {
    return this.siteSettingsService.bulkUpsert(dto);
  }
}
