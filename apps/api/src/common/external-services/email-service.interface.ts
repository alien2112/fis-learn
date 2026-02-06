/**
 * Email Service Interface
 *
 * Provider-agnostic interface for sending emails.
 * Implement this interface for any email provider (SendGrid, Mailgun, AWS SES, SMTP, etc.)
 *
 * To add a new provider:
 * 1. Create a new file: sendgrid.email.ts, ses.email.ts, smtp.email.ts, etc.
 * 2. Implement the EmailService interface
 * 3. Register it in the EmailModule with the EMAIL_SERVICE token
 */

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: 'base64' | 'utf-8';
}

export interface SendEmailData {
  to: string | EmailAddress | (string | EmailAddress)[];
  subject: string;
  // At least one of text or html must be provided
  text?: string;
  html?: string;
  from?: string | EmailAddress; // Uses default if not provided
  replyTo?: string | EmailAddress;
  cc?: string | EmailAddress | (string | EmailAddress)[];
  bcc?: string | EmailAddress | (string | EmailAddress)[];
  attachments?: EmailAttachment[];
  // Optional tracking/categorization
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface SendTemplateEmailData {
  to: string | EmailAddress | (string | EmailAddress)[];
  templateId: string; // Provider's template ID or internal template name
  templateData: Record<string, any>; // Variables to inject into template
  from?: string | EmailAddress;
  replyTo?: string | EmailAddress;
  subject?: string; // Override template subject if needed
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface EmailResult {
  messageId: string;
  provider: string;
  accepted: string[];
  rejected?: string[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

/**
 * Email Service Interface
 *
 * All email providers must implement this interface.
 * The implementation handles provider-specific logic internally.
 */
export interface EmailService {
  /**
   * Provider identifier (e.g., 'sendgrid', 'mailgun', 'ses', 'smtp')
   */
  readonly providerName: string;

  /**
   * Send a plain email (custom content)
   */
  sendEmail(data: SendEmailData): Promise<EmailResult>;

  /**
   * Send an email using a template
   */
  sendTemplateEmail(data: SendTemplateEmailData): Promise<EmailResult>;

  /**
   * Verify email configuration is working
   */
  verifyConnection(): Promise<boolean>;
}

/**
 * Injection token for the email service
 */
export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

// ============ COMMON EMAIL TEMPLATES ============

/**
 * Standard email template types used across the application.
 * Each provider implementation should map these to their template system.
 */
export enum EmailTemplateType {
  // Authentication
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  LOGIN_FROM_NEW_DEVICE = 'login_from_new_device',

  // Subscription & Billing
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  TRIAL_ENDING = 'trial_ending',

  // Course & Learning
  COURSE_ENROLLED = 'course_enrolled',
  COURSE_COMPLETED = 'course_completed',
  LIVE_CLASS_REMINDER = 'live_class_reminder',

  // General
  WELCOME = 'welcome',
  ACCOUNT_SUSPENDED = 'account_suspended',
}

/**
 * Helper interface for building common email data
 */
export interface CommonEmailData {
  userName: string;
  userEmail: string;
  appName: string;
  appUrl: string;
  supportEmail: string;
}

export interface VerificationEmailData extends CommonEmailData {
  verificationUrl: string;
  expiresInHours: number;
}

export interface PasswordResetEmailData extends CommonEmailData {
  resetUrl: string;
  expiresInHours: number;
}

export interface SubscriptionEmailData extends CommonEmailData {
  planName: string;
  amount?: number;
  currency?: string;
  nextBillingDate?: Date;
  billingPortalUrl?: string;
}
