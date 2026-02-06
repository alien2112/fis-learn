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
import {
  CreatePlanDto,
  UpdatePlanDto,
  CreateCheckoutDto,
  CancelSubscriptionDto,
  ChangePlanDto,
} from './dto';
import { CurrentUser, Public, Roles } from '../../common/decorators';
import { Role } from '@prisma/client';

@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ============ PUBLIC ENDPOINTS ============

  /**
   * Get all available subscription plans
   */
  @Public()
  @Get('plans')
  async getPlans() {
    const plans = await this.subscriptionsService.getPlans(true);
    return { data: plans };
  }

  /**
   * Get a specific plan
   */
  @Public()
  @Get('plans/:id')
  async getPlan(@Param('id') id: string) {
    const plan = await this.subscriptionsService.getPlanById(id);
    return { data: plan };
  }

  // ============ USER ENDPOINTS ============

  /**
   * Get current user's subscription
   */
  @Get('me')
  async getMySubscription(@CurrentUser('id') userId: string) {
    const subscription = await this.subscriptionsService.getUserSubscription(userId);
    return { data: subscription };
  }

  /**
   * Create a checkout session for subscription signup
   */
  @Post('checkout')
  async createCheckout(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    const session = await this.subscriptionsService.createCheckoutSession(userId, dto);
    return { data: session };
  }

  /**
   * Cancel current subscription
   */
  @Post('cancel')
  async cancelSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    const subscription = await this.subscriptionsService.cancelSubscription(userId, dto);
    return { data: subscription };
  }

  /**
   * Resume a cancelled subscription (if cancelled at period end)
   */
  @Post('resume')
  async resumeSubscription(@CurrentUser('id') userId: string) {
    const subscription = await this.subscriptionsService.resumeSubscription(userId);
    return { data: subscription };
  }

  /**
   * Change subscription plan
   */
  @Post('change-plan')
  async changePlan(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePlanDto,
  ) {
    const subscription = await this.subscriptionsService.changePlan(userId, dto);
    return { data: subscription };
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
    return { data: { url } };
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
    return { data: { hasAccess } };
  }

  // ============ ADMIN ENDPOINTS ============

  /**
   * Create a new subscription plan (admin only)
   */
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('plans')
  async createPlan(@Body() dto: CreatePlanDto) {
    const plan = await this.subscriptionsService.createPlan(dto);
    return { data: plan };
  }

  /**
   * Update a subscription plan (admin only)
   */
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('plans/:id')
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    const plan = await this.subscriptionsService.updatePlan(id, dto);
    return { data: plan };
  }

  /**
   * Get all plans including inactive (admin only)
   */
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/plans')
  async getAllPlans() {
    const plans = await this.subscriptionsService.getPlans(false);
    return { data: plans };
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
