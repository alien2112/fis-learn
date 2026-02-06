import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PAYMENT_GATEWAY,
  PaymentGateway,
  EMAIL_SERVICE,
  EmailService,
  EmailTemplateType,
} from '../../common/external-services';
import {
  SubscriptionTier,
  SubscriptionStatus,
  TransactionStatus,
  Subscription,
  SubscriptionPlan,
  User,
} from '@prisma/client';
import {
  CreatePlanDto,
  UpdatePlanDto,
  CreateCheckoutDto,
  CancelSubscriptionDto,
  ChangePlanDto,
} from './dto';

/**
 * Subscription Service
 *
 * Handles all subscription-related operations using the provider-agnostic
 * PaymentGateway interface. To change payment providers, just swap the
 * implementation in the module - no changes needed here.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
  ) {}

  // ============ PLAN MANAGEMENT ============

  async getPlans(activeOnly = true): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async getPlanById(planId: string): Promise<SubscriptionPlan> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  async createPlan(dto: CreatePlanDto): Promise<SubscriptionPlan> {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        tier: dto.tier,
        billingCycle: dto.billingCycle,
        price: dto.price,
        currency: dto.currency || 'USD',
        features: dto.features || [],
        limits: dto.limits || {},
        trialDays: dto.trialDays || 0,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async updatePlan(planId: string, dto: UpdatePlanDto): Promise<SubscriptionPlan> {
    await this.getPlanById(planId); // Verify exists

    return this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: dto,
    });
  }

  // ============ SUBSCRIPTION MANAGEMENT ============

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.PAST_DUE,
          ],
        },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutDto,
  ): Promise<{ sessionId: string; url: string }> {
    const [user, plan] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.getPlanById(dto.planId),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.getUserSubscription(userId);
    if (existingSubscription) {
      throw new BadRequestException(
        'User already has an active subscription. Use change plan instead.',
      );
    }

    // Get or create payment customer
    const paymentCustomer = await this.getOrCreatePaymentCustomer(user);

    // Get the plan's external ID for the current payment provider
    const externalIds = (plan.externalIds as Record<string, string>) || {};
    const priceId = externalIds[this.paymentGateway.providerName];

    if (!priceId) {
      throw new BadRequestException(
        `Plan not configured for ${this.paymentGateway.providerName}`,
      );
    }

    // Create checkout session
    const session = await this.paymentGateway.createCheckoutSession({
      customerId: paymentCustomer.externalId,
      priceId,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      trialDays: plan.trialDays,
      metadata: {
        userId,
        planId: plan.id,
      },
    });

    this.logger.log(
      `Created checkout session for user ${userId}, plan ${plan.id}`,
    );

    return {
      sessionId: session.sessionId,
      url: session.url,
    };
  }

  async cancelSubscription(
    userId: string,
    dto: CancelSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription || !subscription.externalId) {
      throw new NotFoundException('No active subscription found');
    }

    // Cancel in payment provider
    await this.paymentGateway.cancelSubscription({
      subscriptionId: subscription.externalId,
      cancelAtPeriodEnd: dto.cancelAtPeriodEnd ?? true,
    });

    // Update local record
    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: dto.cancelAtPeriodEnd ?? true,
        cancelledAt: dto.cancelAtPeriodEnd ? null : new Date(),
        status: dto.cancelAtPeriodEnd
          ? subscription.status
          : SubscriptionStatus.CANCELLED,
      },
      include: { plan: true },
    });

    // Update user's tier if immediately cancelled
    if (!dto.cancelAtPeriodEnd) {
      await this.updateUserTier(userId, SubscriptionTier.FREE);
    }

    // Send cancellation email
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.emailService.sendTemplateEmail({
        to: user.email,
        templateId: EmailTemplateType.SUBSCRIPTION_CANCELLED,
        templateData: {
          userName: user.name,
          userEmail: user.email,
          planName: (subscription as any).plan?.name,
          appName: process.env.APP_NAME || 'FIS Learn',
          appUrl: process.env.APP_URL || '',
        },
      }).catch((err) => this.logger.error('Failed to send cancellation email', err));
    }

    this.logger.log(
      `Cancelled subscription for user ${userId}, at period end: ${dto.cancelAtPeriodEnd}`,
    );

    return updated;
  }

  async resumeSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription || !subscription.externalId) {
      throw new NotFoundException('No subscription found');
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is not scheduled for cancellation');
    }

    // Resume in payment provider
    await this.paymentGateway.resumeSubscription(subscription.externalId);

    // Update local record
    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
      include: { plan: true },
    });

    this.logger.log(`Resumed subscription for user ${userId}`);

    return updated;
  }

  async changePlan(userId: string, dto: ChangePlanDto): Promise<Subscription> {
    const [subscription, newPlan] = await Promise.all([
      this.getUserSubscription(userId),
      this.getPlanById(dto.newPlanId),
    ]);

    if (!subscription || !subscription.externalId) {
      throw new NotFoundException('No active subscription found');
    }

    // Get the new plan's external ID
    const externalIds = (newPlan.externalIds as Record<string, string>) || {};
    const newPriceId = externalIds[this.paymentGateway.providerName];

    if (!newPriceId) {
      throw new BadRequestException(
        `New plan not configured for ${this.paymentGateway.providerName}`,
      );
    }

    // Change plan in payment provider
    await this.paymentGateway.changeSubscriptionPlan(
      subscription.externalId,
      newPriceId,
    );

    // Update local record
    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: newPlan.id,
        cancelAtPeriodEnd: false,
      },
      include: { plan: true },
    });

    // Update user's tier
    await this.updateUserTier(userId, newPlan.tier);

    this.logger.log(`Changed plan for user ${userId} to ${newPlan.name}`);

    return updated;
  }

  async getBillingPortalUrl(userId: string, returnUrl: string): Promise<string> {
    const paymentCustomer = await this.prisma.paymentCustomer.findFirst({
      where: {
        userId,
        provider: this.paymentGateway.providerName,
      },
    });

    if (!paymentCustomer) {
      throw new NotFoundException('No billing information found');
    }

    const portal = await this.paymentGateway.createBillingPortalSession({
      customerId: paymentCustomer.externalId,
      returnUrl,
    });

    return portal.url;
  }

  // ============ WEBHOOK HANDLING ============

  async handleWebhookEvent(
    payload: string | Buffer,
    signature: string,
  ): Promise<void> {
    const event = this.paymentGateway.verifyWebhook({
      payload,
      signature,
      secret: process.env[`${this.paymentGateway.providerName.toUpperCase()}_WEBHOOK_SECRET`] || '',
    });

    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data);
        break;

      default:
        this.logger.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(data: Record<string, any>): Promise<void> {
    const userId = data.metadata?.userId;
    const planId = data.metadata?.planId;

    if (!userId || !planId) {
      this.logger.warn('Checkout completed without userId or planId');
      return;
    }

    const plan = await this.getPlanById(planId);

    // The subscription will be created via the subscription.created webhook
    // Just log for now
    this.logger.log(`Checkout completed for user ${userId}, plan ${planId}`);
  }

  private async handleSubscriptionUpdated(data: Record<string, any>): Promise<void> {
    const externalId = data.id;
    const customerId = data.customer;

    // Find the user by payment customer
    const paymentCustomer = await this.prisma.paymentCustomer.findFirst({
      where: {
        externalId: customerId,
        provider: this.paymentGateway.providerName,
      },
    });

    if (!paymentCustomer) {
      this.logger.warn(`Payment customer not found: ${customerId}`);
      return;
    }

    const userId = paymentCustomer.userId;

    // Map status
    const status = this.mapSubscriptionStatus(data.status);

    // Find or create subscription
    let subscription = await this.prisma.subscription.findFirst({
      where: { externalId },
    });

    if (!subscription) {
      // Find plan by external price ID
      const priceId = data.items?.data?.[0]?.price?.id;
      const plan = await this.findPlanByExternalId(priceId);

      if (!plan) {
        this.logger.warn(`Plan not found for price: ${priceId}`);
        return;
      }

      subscription = await this.prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          provider: this.paymentGateway.providerName,
          externalId,
          status,
          currentPeriodStart: new Date(data.current_period_start * 1000),
          currentPeriodEnd: new Date(data.current_period_end * 1000),
          cancelAtPeriodEnd: data.cancel_at_period_end || false,
          trialEndsAt: data.trial_end ? new Date(data.trial_end * 1000) : null,
        },
      });

      // Update user's tier
      await this.updateUserTier(userId, plan.tier);
    } else {
      subscription = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status,
          currentPeriodStart: new Date(data.current_period_start * 1000),
          currentPeriodEnd: new Date(data.current_period_end * 1000),
          cancelAtPeriodEnd: data.cancel_at_period_end || false,
        },
      });
    }

    this.logger.log(`Updated subscription ${subscription.id} to status ${status}`);
  }

  private async handleSubscriptionDeleted(data: Record<string, any>): Promise<void> {
    const externalId = data.id;

    const subscription = await this.prisma.subscription.findFirst({
      where: { externalId },
    });

    if (!subscription) {
      return;
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    // Downgrade user to free tier
    await this.updateUserTier(subscription.userId, SubscriptionTier.FREE);

    this.logger.log(`Subscription ${subscription.id} deleted/cancelled`);
  }

  private async handleInvoicePaid(data: Record<string, any>): Promise<void> {
    const customerId = data.customer;

    const paymentCustomer = await this.prisma.paymentCustomer.findFirst({
      where: {
        externalId: customerId,
        provider: this.paymentGateway.providerName,
      },
    });

    if (!paymentCustomer) {
      return;
    }

    // Record transaction
    await this.prisma.paymentTransaction.create({
      data: {
        userId: paymentCustomer.userId,
        amount: data.amount_paid,
        currency: data.currency?.toUpperCase() || 'USD',
        status: TransactionStatus.COMPLETED,
        provider: this.paymentGateway.providerName,
        externalId: data.id,
        description: `Invoice ${data.number || data.id}`,
        metadata: {
          invoiceUrl: data.hosted_invoice_url,
          receiptUrl: data.receipt_url,
        },
      },
    });

    this.logger.log(`Recorded payment for user ${paymentCustomer.userId}`);
  }

  private async handlePaymentFailed(data: Record<string, any>): Promise<void> {
    const customerId = data.customer;

    const paymentCustomer = await this.prisma.paymentCustomer.findFirst({
      where: {
        externalId: customerId,
        provider: this.paymentGateway.providerName,
      },
      include: { user: true },
    });

    if (!paymentCustomer) {
      return;
    }

    // Send payment failed email
    const user = paymentCustomer.user;
    await this.emailService.sendTemplateEmail({
      to: user.email,
      templateId: EmailTemplateType.PAYMENT_FAILED,
      templateData: {
        userName: user.name,
        userEmail: user.email,
        appName: process.env.APP_NAME || 'FIS Learn',
        appUrl: process.env.APP_URL || '',
        billingPortalUrl: `${process.env.APP_URL}/settings/billing`,
      },
    }).catch((err) => this.logger.error('Failed to send payment failed email', err));

    this.logger.log(`Payment failed for user ${user.id}`);
  }

  // ============ ENTITLEMENT CHECKS ============

  async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    if (!user) {
      return false;
    }

    // Get the plan for this tier
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { tier: user.subscriptionTier, isActive: true },
    });

    if (!plan) {
      return user.subscriptionTier !== SubscriptionTier.FREE;
    }

    const features = plan.features as string[];
    return features.includes(feature);
  }

  async checkUsageLimit(
    userId: string,
    limitKey: string,
    currentUsage: number,
  ): Promise<{ allowed: boolean; limit: number; remaining: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    if (!user) {
      return { allowed: false, limit: 0, remaining: 0 };
    }

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { tier: user.subscriptionTier, isActive: true },
    });

    const limits = (plan?.limits as Record<string, number>) || {};
    const limit = limits[limitKey] ?? 0;

    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, limit: -1, remaining: -1 };
    }

    const remaining = Math.max(0, limit - currentUsage);
    return {
      allowed: currentUsage < limit,
      limit,
      remaining,
    };
  }

  // ============ HELPERS ============

  private async getOrCreatePaymentCustomer(user: User) {
    let paymentCustomer = await this.prisma.paymentCustomer.findFirst({
      where: {
        userId: user.id,
        provider: this.paymentGateway.providerName,
      },
    });

    if (!paymentCustomer) {
      const customer = await this.paymentGateway.createCustomer({
        userId: user.id,
        email: user.email,
        name: user.name,
      });

      paymentCustomer = await this.prisma.paymentCustomer.create({
        data: {
          userId: user.id,
          provider: this.paymentGateway.providerName,
          externalId: customer.customerId,
        },
      });
    }

    return paymentCustomer;
  }

  private async updateUserTier(userId: string, tier: SubscriptionTier): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: tier },
    });
  }

  private async findPlanByExternalId(externalPriceId: string): Promise<SubscriptionPlan | null> {
    // Search for a plan that has this external ID for the current provider
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
    });

    for (const plan of plans) {
      const externalIds = (plan.externalIds as Record<string, string>) || {};
      if (externalIds[this.paymentGateway.providerName] === externalPriceId) {
        return plan;
      }
    }

    return null;
  }

  private mapSubscriptionStatus(providerStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      trialing: SubscriptionStatus.TRIALING,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELLED,
      cancelled: SubscriptionStatus.CANCELLED,
      unpaid: SubscriptionStatus.PAST_DUE,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.EXPIRED,
      paused: SubscriptionStatus.PAUSED,
    };

    return statusMap[providerStatus.toLowerCase()] || SubscriptionStatus.ACTIVE;
  }
}
