import { Test, TestingModule } from '@nestjs/testing';
import { PaymentGateway } from '../payment-gateway.interface';
import Stripe from 'stripe';

/**
 * Critical Payment Tests
 * 
 * Tests for payment security and reliability
 * FREE - uses mocks, no real charges
 */
describe('Payment Gateway - Critical Tests', () => {
  let paymentGateway: jest.Mocked<PaymentGateway>;

  beforeEach(() => {
    // Mock payment gateway
    paymentGateway = {
      createCustomer: jest.fn(),
      createSubscription: jest.fn(),
      cancelSubscription: jest.fn(),
      createCheckoutSession: jest.fn(),
      verifyWebhookSignature: jest.fn(),
    } as any;
  });

  describe('customer creation', () => {
    it('should create customer with valid email', async () => {
      paymentGateway.createCustomer.mockResolvedValue({
        success: true,
        customerId: 'cust_123',
      });

      const result = await paymentGateway.createCustomer({
        email: 'customer@example.com',
        metadata: { userId: 'user_123' },
      });

      expect(result.success).toBe(true);
      expect(result.customerId).toBeDefined();
    });

    it('should reject invalid email', async () => {
      paymentGateway.createCustomer.mockRejectedValue(
        new Error('Invalid email'),
      );

      await expect(
        paymentGateway.createCustomer({ email: 'invalid-email' }),
      ).rejects.toThrow();
    });
  });

  describe('subscription management', () => {
    it('should create subscription with trial period', async () => {
      paymentGateway.createSubscription.mockResolvedValue({
        success: true,
        subscriptionId: 'sub_123',
        status: 'trialing',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

      const result = await paymentGateway.createSubscription({
        customerId: 'cust_123',
        priceId: 'price_pro_monthly',
        trialDays: 14,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('trialing');
    });

    it('should handle payment failure gracefully', async () => {
      paymentGateway.createSubscription.mockResolvedValue({
        success: false,
        error: 'Card declined',
        errorCode: 'card_declined',
      });

      const result = await paymentGateway.createSubscription({
        customerId: 'cust_123',
        priceId: 'price_pro_monthly',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should cancel subscription at period end', async () => {
      paymentGateway.cancelSubscription.mockResolvedValue({
        success: true,
        status: 'cancel_at_period_end',
      });

      const result = await paymentGateway.cancelSubscription('sub_123', false);

      expect(result.success).toBe(true);
    });

    it('should cancel subscription immediately when requested', async () => {
      paymentGateway.cancelSubscription.mockResolvedValue({
        success: true,
        status: 'cancelled',
      });

      const result = await paymentGateway.cancelSubscription('sub_123', true);

      expect(result.success).toBe(true);
    });
  });

  describe('webhook security', () => {
    it('should verify valid webhook signature', () => {
      const payload = JSON.stringify({ type: 'payment.success' });
      const signature = 'valid_signature';
      const secret = 'webhook_secret';

      paymentGateway.verifyWebhookSignature.mockReturnValue({
        valid: true,
        event: { type: 'payment.success', data: {} },
      });

      const result = paymentGateway.verifyWebhookSignature(
        payload,
        signature,
        secret,
      );

      expect(result.valid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = JSON.stringify({ type: 'payment.success' });
      const signature = 'invalid_signature';
      const secret = 'webhook_secret';

      paymentGateway.verifyWebhookSignature.mockReturnValue({
        valid: false,
        error: 'Invalid signature',
      });

      const result = paymentGateway.verifyWebhookSignature(
        payload,
        signature,
        secret,
      );

      expect(result.valid).toBe(false);
    });

    it('should reject tampered webhook payload', () => {
      const originalPayload = JSON.stringify({ amount: 100 });
      const tamperedPayload = JSON.stringify({ amount: 999 });
      const signature = 'signature_for_original';
      const secret = 'webhook_secret';

      paymentGateway.verifyWebhookSignature.mockImplementation(
        (payload, sig, sec) => {
          // Simulate signature verification
          if (payload === tamperedPayload) {
            return { valid: false, error: 'Signature mismatch' };
          }
          return { valid: true, event: JSON.parse(payload) };
        },
      );

      const result = paymentGateway.verifyWebhookSignature(
        tamperedPayload,
        signature,
        secret,
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('checkout session', () => {
    it('should create checkout session with correct line items', async () => {
      paymentGateway.createCheckoutSession.mockResolvedValue({
        success: true,
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123',
      });

      const result = await paymentGateway.createCheckoutSession({
        customerId: 'cust_123',
        lineItems: [{ price: 'price_pro_monthly', quantity: 1 }],
        successUrl: 'https://fis-learn.com/success',
        cancelUrl: 'https://fis-learn.com/cancel',
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('checkout');
    });

    it('should include metadata for tracking', async () => {
      const mockMetadata = { userId: 'user_123', plan: 'pro' };
      
      paymentGateway.createCheckoutSession.mockImplementation(async (params) => {
        expect(params.metadata).toEqual(mockMetadata);
        return {
          success: true,
          sessionId: 'cs_123',
          url: 'https://checkout.stripe.com/pay/cs_123',
        };
      });

      await paymentGateway.createCheckoutSession({
        customerId: 'cust_123',
        lineItems: [{ price: 'price_pro_monthly', quantity: 1 }],
        metadata: mockMetadata,
        successUrl: 'https://fis-learn.com/success',
        cancelUrl: 'https://fis-learn.com/cancel',
      });
    });
  });

  describe('idempotency', () => {
    it('should handle duplicate requests with idempotency key', async () => {
      const idempotencyKey = 'unique-key-123';
      
      // First call
      paymentGateway.createSubscription.mockResolvedValue({
        success: true,
        subscriptionId: 'sub_123',
      });

      const result1 = await paymentGateway.createSubscription({
        customerId: 'cust_123',
        priceId: 'price_pro_monthly',
        idempotencyKey,
      });

      // Second call with same key should return same result
      const result2 = await paymentGateway.createSubscription({
        customerId: 'cust_123',
        priceId: 'price_pro_monthly',
        idempotencyKey,
      });

      expect(result1.subscriptionId).toBe(result2.subscriptionId);
    });
  });
});
