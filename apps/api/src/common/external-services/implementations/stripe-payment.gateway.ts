import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  PaymentGateway,
  CreateCustomerData,
  CustomerResult,
  CreateCheckoutSessionData,
  CheckoutSessionResult,
  CreateSubscriptionData,
  SubscriptionResult,
  CancelSubscriptionData,
  RefundData,
  RefundResult,
  WebhookEvent,
  WebhookVerificationData,
  BillingPortalData,
  BillingPortalResult,
} from '../payment-gateway.interface';

/**
 * Stripe Payment Gateway Configuration
 */
export interface StripeGatewayConfig {
  secretKey: string;
  webhookSecret: string;
  apiVersion?: Stripe.LatestApiVersion;
}

/**
 * Stripe Payment Gateway Implementation
 *
 * Full implementation of the PaymentGateway interface for Stripe.
 *
 * To add another provider (PayPal, Paddle, etc.):
 * 1. Create a new file: paypal-payment.gateway.ts
 * 2. Implement the PaymentGateway interface
 * 3. Register it in the PaymentModule
 */
@Injectable()
export class StripePaymentGateway implements PaymentGateway {
  readonly providerName = 'stripe';
  private readonly logger = new Logger(StripePaymentGateway.name);
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(private readonly config: StripeGatewayConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: (config.apiVersion as any) || '2023-10-16',
    });
    this.webhookSecret = config.webhookSecret;
  }

  async createCustomer(data: CreateCustomerData): Promise<CustomerResult> {
    try {
      const customer = await this.stripe.customers.create({
        email: data.email,
        name: data.name,
        metadata: {
          userId: data.userId,
          ...data.metadata,
        },
      });

      this.logger.log(`Created Stripe customer: ${customer.id} for user: ${data.userId}`);

      return {
        customerId: customer.id,
        provider: this.providerName,
        metadata: customer.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to create Stripe customer: ${error.message}`);
      throw error;
    }
  }

  async getCustomer(customerId: string): Promise<CustomerResult | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);

      if (customer.deleted) {
        return null;
      }

      return {
        customerId: customer.id,
        provider: this.providerName,
        metadata: customer.metadata,
      };
    } catch (error) {
      if (error.code === 'resource_missing') {
        return null;
      }
      throw error;
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      await this.stripe.customers.del(customerId);
      this.logger.log(`Deleted Stripe customer: ${customerId}`);
    } catch (error) {
      this.logger.error(`Failed to delete Stripe customer: ${error.message}`);
      throw error;
    }
  }

  async createCheckoutSession(data: CreateCheckoutSessionData): Promise<CheckoutSessionResult> {
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: data.customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: data.priceId,
            quantity: 1,
          },
        ],
        success_url: `${data.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: data.cancelUrl,
        metadata: data.metadata,
        allow_promotion_codes: true,
      };

      if (data.trialDays && data.trialDays > 0) {
        sessionParams.subscription_data = {
          trial_period_days: data.trialDays,
          metadata: data.metadata,
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      this.logger.log(`Created Stripe checkout session: ${session.id}`);

      return {
        sessionId: session.id,
        url: session.url!,
        provider: this.providerName,
      };
    } catch (error) {
      this.logger.error(`Failed to create Stripe checkout session: ${error.message}`);
      throw error;
    }
  }

  async createSubscription(data: CreateSubscriptionData): Promise<SubscriptionResult> {
    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: data.customerId,
        items: [{ price: data.priceId }],
        metadata: data.metadata,
      };

      if (data.trialDays && data.trialDays > 0) {
        subscriptionParams.trial_period_days = data.trialDays;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionParams);

      return this.mapSubscription(subscription);
    } catch (error) {
      this.logger.error(`Failed to create Stripe subscription: ${error.message}`);
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult | null> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return this.mapSubscription(subscription);
    } catch (error) {
      if (error.code === 'resource_missing') {
        return null;
      }
      throw error;
    }
  }

  async cancelSubscription(data: CancelSubscriptionData): Promise<SubscriptionResult> {
    try {
      let subscription: Stripe.Subscription;

      if (data.cancelAtPeriodEnd) {
        // Cancel at the end of the billing period
        subscription = await this.stripe.subscriptions.update(data.subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        // Cancel immediately
        subscription = await this.stripe.subscriptions.cancel(data.subscriptionId);
      }

      this.logger.log(
        `Cancelled Stripe subscription: ${data.subscriptionId}, immediate: ${!data.cancelAtPeriodEnd}`,
      );

      return this.mapSubscription(subscription);
    } catch (error) {
      this.logger.error(`Failed to cancel Stripe subscription: ${error.message}`);
      throw error;
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      this.logger.log(`Resumed Stripe subscription: ${subscriptionId}`);

      return this.mapSubscription(subscription);
    } catch (error) {
      this.logger.error(`Failed to resume Stripe subscription: ${error.message}`);
      throw error;
    }
  }

  async changeSubscriptionPlan(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<SubscriptionResult> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      const itemId = subscription.items.data[0].id;

      const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: itemId,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });

      this.logger.log(`Changed Stripe subscription plan: ${subscriptionId} to ${newPriceId}`);

      return this.mapSubscription(updatedSubscription);
    } catch (error) {
      this.logger.error(`Failed to change Stripe subscription plan: ${error.message}`);
      throw error;
    }
  }

  async refund(data: RefundData): Promise<RefundResult> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: data.transactionId,
        reason: (data.reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
      };

      if (data.amount) {
        refundParams.amount = data.amount;
      }

      const refund = await this.stripe.refunds.create(refundParams);

      this.logger.log(`Created Stripe refund: ${refund.id} for payment: ${data.transactionId}`);

      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status || 'pending',
        provider: this.providerName,
      };
    } catch (error) {
      this.logger.error(`Failed to create Stripe refund: ${error.message}`);
      throw error;
    }
  }

  verifyWebhook(data: WebhookVerificationData): WebhookEvent {
    try {
      const event = this.stripe.webhooks.constructEvent(
        data.payload,
        data.signature,
        data.secret || this.webhookSecret,
      );

      return {
        type: event.type,
        provider: this.providerName,
        data: event.data.object as Record<string, any>,
        rawPayload: data.payload,
        signature: data.signature,
      };
    } catch (error) {
      this.logger.error(`Stripe webhook verification failed: ${error.message}`);
      throw error;
    }
  }

  async createBillingPortalSession(data: BillingPortalData): Promise<BillingPortalResult> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: data.customerId,
        return_url: data.returnUrl,
      });

      return {
        url: session.url,
      };
    } catch (error) {
      this.logger.error(`Failed to create Stripe billing portal session: ${error.message}`);
      throw error;
    }
  }

  // ============ PRIVATE HELPERS ============

  private mapSubscription(subscription: Stripe.Subscription): SubscriptionResult {
    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      provider: this.providerName,
      metadata: subscription.metadata,
    };
  }
}

/**
 * Factory function to create Stripe gateway from environment variables
 */
export function createStripeGatewayFromEnv(): StripePaymentGateway {
  return new StripePaymentGateway({
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  });
}

/**
 * Stripe webhook event types we care about
 */
export const STRIPE_WEBHOOK_EVENTS = {
  // Checkout
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',

  // Subscriptions
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  SUBSCRIPTION_TRIAL_WILL_END: 'customer.subscription.trial_will_end',

  // Payments
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  PAYMENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_FAILED: 'payment_intent.payment_failed',
} as const;
