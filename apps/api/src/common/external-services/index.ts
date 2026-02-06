/**
 * External Services - Provider-Agnostic Interfaces
 *
 * This module provides abstraction layers for external services,
 * making it easy to swap providers by only changing the implementation.
 *
 * Available Services:
 * - PaymentGateway: For payment processing (Stripe, PayPal, Paddle, etc.)
 * - EmailService: For sending emails (SendGrid, Mailgun, AWS SES, SMTP, etc.)
 * - MfaService: For multi-factor authentication (TOTP, SMS, etc.)
 * - VideoProvider: For video hosting (Mux, Cloudflare Stream, AWS IVS, etc.)
 * - YouTubeProvider: For YouTube video embedding (secondary source)
 * - LiveStreamProvider: For live video streaming (Mux Live, AWS IVS, etc.)
 * - CodeExecutionProvider: For code execution (Judge0, Piston, etc.)
 *
 * Usage:
 * 1. Import the interface and token
 * 2. Inject using the token: @Inject(VIDEO_PROVIDER)
 * 3. Use the interface methods
 *
 * To change providers:
 * 1. Create/modify the provider implementation
 * 2. Update the module to use the new implementation
 * 3. No changes needed in the consuming services
 *
 * Example (switching video providers):
 * ```typescript
 * // In your module:
 * providers: [
 *   {
 *     provide: VIDEO_PROVIDER,
 *     useClass: MuxVideoProvider,  // Switch to: CloudflareVideoProvider
 *   },
 * ]
 *
 * // In your service (no changes needed):
 * constructor(@Inject(VIDEO_PROVIDER) private videoProvider: VideoProvider) {}
 * ```
 */

// Payment Gateway
export * from './payment-gateway.interface';

// Email Service
export * from './email-service.interface';

// MFA Service
export * from './mfa-service.interface';

// Video Provider (primary video hosting)
export * from './video-provider.interface';

// YouTube Provider (secondary video source)
export * from './youtube-provider.interface';

// Live Streaming Provider
export * from './live-stream-provider.interface';

// Code Execution Provider
export * from './code-execution-provider.interface';
