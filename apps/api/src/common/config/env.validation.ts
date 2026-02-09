import { Logger } from '@nestjs/common';

interface EnvRule {
  key: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
}

const ENV_RULES: EnvRule[] = [
  // Database
  { key: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },

  // Redis
  { key: 'REDIS_URL', required: true, description: 'Redis connection string' },

  // Authentication
  { key: 'JWT_SECRET', required: true, description: 'JWT signing secret',
    validator: (v) => v.length >= 32 && v !== 'your-super-secret-jwt-key-change-in-production' },
  { key: 'JWT_REFRESH_SECRET', required: true, description: 'JWT refresh token secret',
    validator: (v) => v.length >= 32 && v !== 'your-refresh-secret-key-change-in-production' },

  // MFA (required if MFA is enabled)
  { key: 'MFA_ENCRYPTION_KEY', required: false, description: 'AES-256-GCM key for MFA secrets' },

  // Application URLs
  { key: 'WEB_URL', required: true, description: 'Frontend web app URL' },
  { key: 'ADMIN_URL', required: true, description: 'Admin dashboard URL' },

  // Email
  { key: 'SMTP_HOST', required: false, description: 'SMTP server host' },
];

export function validateEnvironment(): void {
  const logger = new Logger('EnvValidation');
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of ENV_RULES) {
    const value = process.env[rule.key];

    if (rule.required && !value) {
      errors.push(`Missing required env var: ${rule.key} (${rule.description})`);
      continue;
    }

    if (value && rule.validator && !rule.validator(value)) {
      if (process.env.NODE_ENV === 'production') {
        errors.push(`Invalid value for ${rule.key}: ${rule.description}`);
      } else {
        warnings.push(`Weak value for ${rule.key}: consider using a stronger value in production`);
      }
    }
  }

  // Warn about default/placeholder values in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.STRIPE_WEBHOOK_SECRET && !process.env.PAYPAL_WEBHOOK_SECRET) {
      warnings.push('No payment webhook secret configured');
    }
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('connection_limit')) {
      warnings.push('DATABASE_URL has no explicit connection_limit. Default is 5 connections. Consider setting connection_limit based on your database plan.');
    }
  }

  warnings.forEach((w) => logger.warn(w));

  if (errors.length > 0 && process.env.NODE_ENV === 'production') {
    errors.forEach((e) => logger.error(e));
    throw new Error(`Environment validation failed with ${errors.length} error(s). Cannot start in production.`);
  } else if (errors.length > 0) {
    errors.forEach((e) => logger.warn(`[DEV MODE] ${e}`));
  }

  logger.log('Environment validation passed');
}
