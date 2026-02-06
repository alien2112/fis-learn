import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  EmailService,
  SendEmailData,
  SendTemplateEmailData,
  EmailResult,
  EmailAddress,
  EmailTemplateType,
} from '../email-service.interface';

/**
 * SMTP Email Service Configuration
 */
export interface SmtpEmailConfig {
  host: string;
  port: number;
  secure?: boolean; // true for 465, false for other ports
  auth?: {
    user: string;
    pass: string;
  };
  from: EmailAddress;
  // Optional: template directory or template function
  templateRenderer?: (templateId: string, data: Record<string, any>) => { html: string; text?: string };
}

/**
 * SMTP Email Service Implementation
 *
 * Works with any SMTP server:
 * - Gmail SMTP
 * - AWS SES SMTP
 * - SendGrid SMTP
 * - Mailgun SMTP
 * - Custom SMTP server
 * - etc.
 *
 * To use a specific provider's API instead, create a new implementation
 * (e.g., sendgrid-api.email.ts) and register it in the module.
 */
@Injectable()
export class SmtpEmailService implements EmailService {
  readonly providerName = 'smtp';
  private readonly logger = new Logger(SmtpEmailService.name);
  private transporter: nodemailer.Transporter;
  private defaultFrom: EmailAddress;
  private templateRenderer?: (templateId: string, data: Record<string, any>) => { html: string; text?: string };

  constructor(private readonly config: SmtpEmailConfig) {
    this.defaultFrom = config.from;
    this.templateRenderer = config.templateRenderer;

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: config.auth,
    });
  }

  async sendEmail(data: SendEmailData): Promise<EmailResult> {
    const from = this.formatAddress(data.from || this.defaultFrom);
    const to = this.formatAddresses(data.to);

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to,
      subject: data.subject,
      text: data.text,
      html: data.html,
    };

    if (data.cc) {
      mailOptions.cc = this.formatAddresses(data.cc);
    }

    if (data.bcc) {
      mailOptions.bcc = this.formatAddresses(data.bcc);
    }

    if (data.replyTo) {
      mailOptions.replyTo = this.formatAddress(data.replyTo);
    }

    if (data.attachments) {
      mailOptions.attachments = data.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
        encoding: att.encoding,
      }));
    }

    try {
      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email sent successfully: ${result.messageId}`);

      return {
        messageId: result.messageId,
        provider: this.providerName,
        accepted: Array.isArray(result.accepted)
          ? result.accepted.map(String)
          : [String(result.accepted)],
        rejected: result.rejected
          ? Array.isArray(result.rejected)
            ? result.rejected.map(String)
            : [String(result.rejected)]
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendTemplateEmail(data: SendTemplateEmailData): Promise<EmailResult> {
    // Render the template
    let html: string;
    let text: string | undefined;

    if (this.templateRenderer) {
      const rendered = this.templateRenderer(data.templateId, data.templateData);
      html = rendered.html;
      text = rendered.text;
    } else {
      // Use built-in templates
      const rendered = this.renderBuiltInTemplate(data.templateId, data.templateData);
      html = rendered.html;
      text = rendered.text;
    }

    return this.sendEmail({
      to: data.to,
      subject: data.subject || this.getTemplateSubject(data.templateId, data.templateData),
      html,
      text,
      from: data.from,
      replyTo: data.replyTo,
      tags: data.tags,
      metadata: data.metadata,
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error(`SMTP connection failed: ${error.message}`);
      return false;
    }
  }

  // ============ PRIVATE HELPERS ============

  private formatAddress(address: string | EmailAddress): string {
    if (typeof address === 'string') {
      return address;
    }
    return address.name ? `"${address.name}" <${address.email}>` : address.email;
  }

  private formatAddresses(addresses: string | EmailAddress | (string | EmailAddress)[]): string {
    if (Array.isArray(addresses)) {
      return addresses.map((a) => this.formatAddress(a)).join(', ');
    }
    return this.formatAddress(addresses);
  }

  private getTemplateSubject(templateId: string, data: Record<string, any>): string {
    const appName = data.appName || 'FIS Learn';

    const subjects: Record<string, string> = {
      [EmailTemplateType.EMAIL_VERIFICATION]: `Verify your email - ${appName}`,
      [EmailTemplateType.PASSWORD_RESET]: `Reset your password - ${appName}`,
      [EmailTemplateType.PASSWORD_CHANGED]: `Password changed - ${appName}`,
      [EmailTemplateType.MFA_ENABLED]: `Two-factor authentication enabled - ${appName}`,
      [EmailTemplateType.MFA_DISABLED]: `Two-factor authentication disabled - ${appName}`,
      [EmailTemplateType.LOGIN_FROM_NEW_DEVICE]: `New login detected - ${appName}`,
      [EmailTemplateType.SUBSCRIPTION_CREATED]: `Welcome to ${data.planName || 'Premium'} - ${appName}`,
      [EmailTemplateType.SUBSCRIPTION_RENEWED]: `Subscription renewed - ${appName}`,
      [EmailTemplateType.SUBSCRIPTION_CANCELLED]: `Subscription cancelled - ${appName}`,
      [EmailTemplateType.SUBSCRIPTION_EXPIRED]: `Subscription expired - ${appName}`,
      [EmailTemplateType.PAYMENT_FAILED]: `Payment failed - ${appName}`,
      [EmailTemplateType.PAYMENT_SUCCEEDED]: `Payment received - ${appName}`,
      [EmailTemplateType.TRIAL_ENDING]: `Your trial is ending soon - ${appName}`,
      [EmailTemplateType.WELCOME]: `Welcome to ${appName}!`,
    };

    return subjects[templateId] || `Notification from ${appName}`;
  }

  private renderBuiltInTemplate(
    templateId: string,
    data: Record<string, any>,
  ): { html: string; text: string } {
    // Simple built-in templates - replace with your own template engine
    const templates: Record<string, (data: Record<string, any>) => { html: string; text: string }> = {
      [EmailTemplateType.EMAIL_VERIFICATION]: (d) => ({
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verify your email</h2>
            <p>Hi ${d.userName},</p>
            <p>Please click the button below to verify your email address:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${d.verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email
              </a>
            </p>
            <p>This link will expire in ${d.expiresInHours} hours.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              ${d.appName} - ${d.appUrl}
            </p>
          </div>
        `,
        text: `
Hi ${d.userName},

Please verify your email by clicking this link:
${d.verificationUrl}

This link will expire in ${d.expiresInHours} hours.

If you didn't create an account, you can safely ignore this email.

${d.appName} - ${d.appUrl}
        `.trim(),
      }),

      [EmailTemplateType.PASSWORD_RESET]: (d) => ({
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset your password</h2>
            <p>Hi ${d.userName},</p>
            <p>We received a request to reset your password. Click the button below to choose a new password:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${d.resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </p>
            <p>This link will expire in ${d.expiresInHours} hours.</p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              ${d.appName} - ${d.appUrl}
            </p>
          </div>
        `,
        text: `
Hi ${d.userName},

We received a request to reset your password. Click the link below to choose a new password:
${d.resetUrl}

This link will expire in ${d.expiresInHours} hours.

If you didn't request a password reset, you can safely ignore this email.

${d.appName} - ${d.appUrl}
        `.trim(),
      }),

      [EmailTemplateType.PAYMENT_FAILED]: (d) => ({
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Payment failed</h2>
            <p>Hi ${d.userName},</p>
            <p>We were unable to process your payment for ${d.planName}.</p>
            <p>Please update your payment method to continue your subscription:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${d.billingPortalUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Update Payment Method
              </a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              ${d.appName} - ${d.appUrl}
            </p>
          </div>
        `,
        text: `
Hi ${d.userName},

We were unable to process your payment for ${d.planName}.

Please update your payment method to continue your subscription:
${d.billingPortalUrl}

${d.appName} - ${d.appUrl}
        `.trim(),
      }),
    };

    const templateFn = templates[templateId];
    if (templateFn) {
      return templateFn(data);
    }

    // Default template for unknown types
    return {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Hi ${data.userName || 'there'},</p>
          <p>${data.message || 'You have a new notification.'}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            ${data.appName || 'FIS Learn'}
          </p>
        </div>
      `,
      text: `Hi ${data.userName || 'there'},\n\n${data.message || 'You have a new notification.'}`,
    };
  }
}

/**
 * Factory function to create SMTP email service from environment variables
 */
export function createSmtpEmailServiceFromEnv(): SmtpEmailService {
  return new SmtpEmailService({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: {
      email: process.env.SMTP_FROM_EMAIL || 'noreply@example.com',
      name: process.env.SMTP_FROM_NAME || 'FIS Learn',
    },
  });
}
