import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  PAYMENT_GATEWAY,
  EMAIL_SERVICE,
} from '../../common/external-services';
import {
  StripePaymentGateway,
  createStripeGatewayFromEnv,
} from '../../common/external-services/implementations/stripe-payment.gateway';
import {
  SmtpEmailService,
  createSmtpEmailServiceFromEnv,
} from '../../common/external-services/implementations/smtp-email.service';

/**
 * Subscriptions Module
 *
 * Provider-agnostic subscription management.
 *
 * To change payment provider:
 * 1. Create a new gateway implementation (e.g., PayPalPaymentGateway)
 * 2. Update the PAYMENT_GATEWAY provider below
 *
 * To change email provider:
 * 1. Create a new email service implementation (e.g., SendGridEmailService)
 * 2. Update the EMAIL_SERVICE provider below
 */
@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,

    // ============ PAYMENT GATEWAY ============
    // Change this provider to use a different payment processor
    {
      provide: PAYMENT_GATEWAY,
      useFactory: () => {
        // You can use environment variables to switch providers
        const provider = process.env.PAYMENT_PROVIDER || 'stripe';

        switch (provider) {
          case 'stripe':
            return createStripeGatewayFromEnv();
          // Add more providers here:
          // case 'paypal':
          //   return createPayPalGatewayFromEnv();
          // case 'paddle':
          //   return createPaddleGatewayFromEnv();
          default:
            return createStripeGatewayFromEnv();
        }
      },
    },

    // ============ EMAIL SERVICE ============
    // Change this provider to use a different email service
    {
      provide: EMAIL_SERVICE,
      useFactory: () => {
        const provider = process.env.EMAIL_PROVIDER || 'smtp';

        switch (provider) {
          case 'smtp':
            return createSmtpEmailServiceFromEnv();
          // Add more providers here:
          // case 'sendgrid':
          //   return createSendGridEmailServiceFromEnv();
          // case 'ses':
          //   return createSesEmailServiceFromEnv();
          default:
            return createSmtpEmailServiceFromEnv();
        }
      },
    },
  ],
  exports: [SubscriptionsService, PAYMENT_GATEWAY, EMAIL_SERVICE],
})
export class SubscriptionsModule {}
