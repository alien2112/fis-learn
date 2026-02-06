/**
 * External Service Implementations
 *
 * This module contains concrete implementations of the external service interfaces.
 * Each implementation can be swapped by changing the module provider registration.
 *
 * To switch providers, update the module's providers array:
 * ```typescript
 * // In your module:
 * {
 *   provide: VIDEO_PROVIDER,
 *   useClass: MuxVideoProvider, // or CloudflareVideoProvider, etc.
 * }
 * ```
 */

// MFA Implementations
export * from './totp-mfa.service';

// Email Implementations
export * from './smtp-email.service';

// Payment Gateway Implementations
export * from './stripe-payment.gateway';

// Video Provider Implementations
export * from './mux-video.provider';

// YouTube Provider Implementation
export * from './youtube.provider';

// Code Execution Implementations
export * from './judge0-code-execution.provider';

// Future implementations:
// export * from './twilio-sms-mfa.service';
// export * from './sendgrid-email.service';
// export * from './ses-email.service';
// export * from './paypal-payment.gateway';
// export * from './paddle-payment.gateway';
// export * from './cloudflare-stream-video.provider';
// export * from './aws-ivs-video.provider';
// export * from './bunny-video.provider';
// export * from './mux-live-stream.provider';
// export * from './piston-code-execution.provider';
