import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { SubscriptionTier } from '@prisma/client';

/**
 * Subscription-based rate limit configuration
 */
const TIER_RATE_LIMITS: Record<SubscriptionTier, { ttl: number; limit: number }> = {
  [SubscriptionTier.FREE]: { ttl: 60000, limit: 30 }, // 30 requests per minute
  [SubscriptionTier.BASIC]: { ttl: 60000, limit: 60 }, // 60 requests per minute
  [SubscriptionTier.PRO]: { ttl: 60000, limit: 120 }, // 120 requests per minute
  [SubscriptionTier.ENTERPRISE]: { ttl: 60000, limit: 300 }, // 300 requests per minute
};

/**
 * Subscription-Aware Throttle Guard
 *
 * Applies different rate limits based on the user's subscription tier.
 * Falls back to FREE tier limits for unauthenticated requests.
 */
@Injectable()
export class SubscriptionThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use user ID if authenticated, otherwise use IP
    const user = req.user;
    if (user?.id) {
      return user.id;
    }
    return req.ip;
  }

  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: any,
    getTracker: any,
    generateKey: any,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Get tier-specific limits
    const tier: SubscriptionTier = user?.subscriptionTier || SubscriptionTier.FREE;
    const tierLimits = TIER_RATE_LIMITS[tier] || TIER_RATE_LIMITS[SubscriptionTier.FREE];

    // Override with tier-specific limits
    const effectiveLimit = tierLimits.limit;
    const effectiveTtl = tierLimits.ttl;

    // Call parent handler with adjusted limits
    return super.handleRequest(context, effectiveLimit, effectiveTtl, throttler, getTracker, generateKey);
  }

  protected throwThrottlingException(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const user = request.user;
    const tier: SubscriptionTier = user?.subscriptionTier || SubscriptionTier.FREE;
    const tierLimits = TIER_RATE_LIMITS[tier];

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', tierLimits.limit);
    response.setHeader('X-RateLimit-Remaining', 0);
    response.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + Math.ceil(tierLimits.ttl / 1000));
    response.setHeader('Retry-After', Math.ceil(tierLimits.ttl / 1000));

    throw new HttpException(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(tierLimits.ttl / 1000),
          limit: tierLimits.limit,
          upgradeUrl: tier === SubscriptionTier.FREE ? '/pricing' : undefined,
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * Endpoint-specific rate limits
 * Use with @Throttle() decorator
 */
export const ENDPOINT_RATE_LIMITS = {
  // Auth endpoints - strict limits
  auth: {
    login: { ttl: 60000, limit: 5 }, // 5 per minute
    register: { ttl: 60000, limit: 3 }, // 3 per minute
    passwordReset: { ttl: 3600000, limit: 3 }, // 3 per hour
  },

  // Code execution - vary by tier
  codeExecution: {
    [SubscriptionTier.FREE]: { ttl: 86400000, limit: 5 }, // 5 per day
    [SubscriptionTier.BASIC]: { ttl: 86400000, limit: 100 }, // 100 per day
    [SubscriptionTier.PRO]: { ttl: 86400000, limit: 1000 }, // 1000 per day
    [SubscriptionTier.ENTERPRISE]: { ttl: 86400000, limit: 10000 }, // 10000 per day
  },

  // Chat messages
  chat: {
    send: { ttl: 60000, limit: 30 }, // 30 per minute
  },

  // File uploads
  upload: {
    file: { ttl: 60000, limit: 10 }, // 10 per minute
  },
};
