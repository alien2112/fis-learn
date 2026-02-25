import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePlanDto,
  UpdatePlanDto,
  CreateCheckoutDto,
  CancelSubscriptionDto,
  ChangePlanDto,
} from './dto';
import { CurrentUser, Public, Roles } from '../../common/decorators';
import { Role, SubscriptionStatus } from '@prisma/client';

@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly prisma: PrismaService,
  ) {}

  // ============ PUBLIC ENDPOINTS ============

  /**
   * Get all available subscription plans
   */
  @Public()
  @Get('plans')
  async getPlans() {
    return this.subscriptionsService.getPlans(true);
  }

  /**
   * Get a specific plan
   */
  @Public()
  @Get('plans/:id')
  async getPlan(@Param('id') id: string) {
    return this.subscriptionsService.getPlanById(id);
  }

  // ============ USER ENDPOINTS ============

  /**
   * Get current user's subscription
   */
  @Get('me')
  async getMySubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getUserSubscription(userId);
  }

  /**
   * Create a checkout session for subscription signup
   */
  @Post('checkout')
  async createCheckout(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.subscriptionsService.createCheckoutSession(userId, dto);
  }

  /**
   * Cancel current subscription
   */
  @Post('cancel')
  async cancelSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionsService.cancelSubscription(userId, dto);
  }

  /**
   * Resume a cancelled subscription (if cancelled at period end)
   */
  @Post('resume')
  async resumeSubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.resumeSubscription(userId);
  }

  /**
   * Change subscription plan
   */
  @Post('change-plan')
  async changePlan(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.subscriptionsService.changePlan(userId, dto);
  }

  /**
   * Get billing portal URL
   */
  @Get('billing-portal')
  async getBillingPortal(
    @CurrentUser('id') userId: string,
    @Query('returnUrl') returnUrl: string,
  ) {
    const url = await this.subscriptionsService.getBillingPortalUrl(
      userId,
      returnUrl || process.env.APP_URL + '/settings/billing',
    );
    return { url };
  }

  /**
   * Check if user has access to a feature
   */
  @Get('features/:feature')
  async checkFeature(
    @CurrentUser('id') userId: string,
    @Param('feature') feature: string,
  ) {
    const hasAccess = await this.subscriptionsService.checkFeatureAccess(userId, feature);
    return { hasAccess };
  }

  // ============ ADMIN ENDPOINTS ============

  /**
   * Create a new subscription plan (admin only)
   */
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('plans')
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  /**
   * Update a subscription plan (admin only)
   */
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('plans/:id')
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  /**
   * Get all plans including inactive (admin only)
   */
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/plans')
  async getAllPlans() {
    return this.subscriptionsService.getPlans(false);
  }

  /**
   * Get subscription statistics (admin only)
   */
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/stats')
  async getAdminStats() {
    const [totalPlans, activePlans, totalSubscribers] = await Promise.all([
      this.prisma.subscriptionPlan.count(),
      this.prisma.subscriptionPlan.count({ where: { isActive: true } }),
      this.prisma.subscription.count({
        where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } },
      }),
    ]);
    return { totalPlans, activePlans, totalSubscribers, monthlyRevenue: 0 };
  }

  // ============ WEBHOOK ENDPOINT ============

  /**
   * Handle payment provider webhooks
   * This endpoint needs raw body for signature verification
   */
  @Public()
  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Headers('stripe-signature') stripeSignature: string,
    @Headers('x-paypal-signature') paypalSignature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Get the appropriate signature based on provider
    const signature = stripeSignature || paypalSignature || req.headers['x-signature'] as string;

    if (!req.rawBody) {
      throw new Error('Raw body not available');
    }

    await this.subscriptionsService.handleWebhookEvent(
      req.rawBody,
      signature,
    );

    return { received: true };
  }
}
