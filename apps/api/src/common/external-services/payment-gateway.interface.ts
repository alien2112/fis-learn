/**
 * Payment Gateway Interface
 *
 * Provider-agnostic interface for payment processing.
 * Implement this interface for any payment provider (Stripe, PayPal, Paddle, etc.)
 *
 * To add a new provider:
 * 1. Create a new file: stripe.gateway.ts, paypal.gateway.ts, etc.
 * 2. Implement the PaymentGateway interface
 * 3. Register it in the PaymentModule with a provider token
 */

export interface CreateCustomerData {
  userId: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface CustomerResult {
  customerId: string;
  provider: string;
  metadata?: Record<string, any>;
}

export interface CreateCheckoutSessionData {
  customerId: string;
  priceId: string; // Your internal plan's external ID for this provider
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
  provider: string;
}

export interface CreateSubscriptionData {
  customerId: string;
  priceId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

export interface SubscriptionResult {
  subscriptionId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  provider: string;
  metadata?: Record<string, any>;
}

export interface CancelSubscriptionData {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean; // If true, cancel at end of billing period
}

export interface RefundData {
  transactionId: string;
  amount?: number; // If not provided, full refund
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  status: string;
  provider: string;
}

export interface WebhookEvent {
  type: string;
  provider: string;
  data: Record<string, any>;
  rawPayload: string | Buffer;
  signature?: string;
}

export interface WebhookVerificationData {
  payload: string | Buffer;
  signature: string;
  secret: string;
}

export interface BillingPortalData {
  customerId: string;
  returnUrl: string;
}

export interface BillingPortalResult {
  url: string;
}

/**
 * Payment Gateway Interface
 *
 * All payment providers must implement this interface.
 * The implementation handles provider-specific logic internally.
 */
export interface PaymentGateway {
  /**
   * Provider identifier (e.g., 'stripe', 'paypal', 'paddle')
   */
  readonly providerName: string;

  /**
   * Create a customer in the payment provider's system
   */
  createCustomer(data: CreateCustomerData): Promise<CustomerResult>;

  /**
   * Get customer from payment provider
   */
  getCustomer(customerId: string): Promise<CustomerResult | null>;

  /**
   * Delete customer from payment provider
   */
  deleteCustomer(customerId: string): Promise<void>;

  /**
   * Create a checkout session for subscription signup
   */
  createCheckoutSession(data: CreateCheckoutSessionData): Promise<CheckoutSessionResult>;

  /**
   * Create a subscription directly (for manual/API-based flows)
   */
  createSubscription(data: CreateSubscriptionData): Promise<SubscriptionResult>;

  /**
   * Get subscription details
   */
  getSubscription(subscriptionId: string): Promise<SubscriptionResult | null>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(data: CancelSubscriptionData): Promise<SubscriptionResult>;

  /**
   * Resume a cancelled subscription (if cancelled at period end)
   */
  resumeSubscription(subscriptionId: string): Promise<SubscriptionResult>;

  /**
   * Change subscription plan
   */
  changeSubscriptionPlan(subscriptionId: string, newPriceId: string): Promise<SubscriptionResult>;

  /**
   * Process a refund
   */
  refund(data: RefundData): Promise<RefundResult>;

  /**
   * Verify webhook signature and parse event
   */
  verifyWebhook(data: WebhookVerificationData): WebhookEvent;

  /**
   * Create a billing portal session (for customer self-service)
   */
  createBillingPortalSession(data: BillingPortalData): Promise<BillingPortalResult>;
}

/**
 * Injection token for the payment gateway
 */
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
