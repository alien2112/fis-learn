import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post('events')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute
  async trackEvents(
    @Body() body: { events: TrackEventDto[] },
    @Req() req: any,
  ) {
    // Check cookie consent for analytics before tracking
    const consentCookie = req.cookies?.['fis-cookie-consent'];
    if (consentCookie) {
      try {
        const consent = JSON.parse(decodeURIComponent(consentCookie));
        if (!consent.analytics) {
          return { tracked: 0, reason: 'Analytics consent not granted' };
        }
      } catch {
        // Invalid cookie, allow tracking (consent banner will re-appear)
      }
    }

    const deviceInfo = {
      deviceType: this.getDeviceType(req.headers['user-agent']),
      browser: this.getBrowser(req.headers['user-agent']),
      os: this.getOS(req.headers['user-agent']),
      ipAddress: req.ip,
    };

    return this.analyticsService.trackEvents(
      body.events,
      req.user.userId,
      deviceInfo,
    );
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async getMyDashboard(@Req() req: any) {
    return this.analyticsService.getStudentDashboard(req.user.userId);
  }

  @Get('course/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  async getCourseAnalytics(
    @Param('courseId') courseId: string,
    @Req() req: any,
  ) {
    return this.analyticsService.getCourseAnalytics(
      courseId,
      req.user.userId,
    );
  }

  private getDeviceType(userAgent: string): string {
    if (!userAgent) return 'unknown';
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private getBrowser(userAgent: string): string {
    if (!userAgent) return 'unknown';
    if (/chrome/i.test(userAgent)) return 'chrome';
    if (/firefox/i.test(userAgent)) return 'firefox';
    if (/safari/i.test(userAgent)) return 'safari';
    if (/edge/i.test(userAgent)) return 'edge';
    return 'other';
  }

  private getOS(userAgent: string): string {
    if (!userAgent) return 'unknown';
    if (/windows/i.test(userAgent)) return 'windows';
    if (/mac/i.test(userAgent)) return 'mac';
    if (/linux/i.test(userAgent)) return 'linux';
    if (/android/i.test(userAgent)) return 'android';
    if (/ios/i.test(userAgent)) return 'ios';
    return 'other';
  }
}
