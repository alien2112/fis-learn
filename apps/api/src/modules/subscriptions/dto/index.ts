import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUrl,
  Min,
} from 'class-validator';
import { SubscriptionTier, BillingCycle } from '@prisma/client';

// ============ PLAN DTOs ============

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsOptional()
  features?: string[];

  @IsOptional()
  limits?: Record<string, number>;

  @IsNumber()
  @IsOptional()
  @Min(0)
  trialDays?: number;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsOptional()
  features?: string[];

  @IsOptional()
  limits?: Record<string, number>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  trialDays?: number;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

// ============ SUBSCRIPTION DTOs ============

export class CreateCheckoutDto {
  @IsString()
  planId: string;

  @IsUrl()
  successUrl: string;

  @IsUrl()
  cancelUrl: string;
}

export class CancelSubscriptionDto {
  @IsBoolean()
  @IsOptional()
  cancelAtPeriodEnd?: boolean = true;
}

export class ChangePlanDto {
  @IsString()
  newPlanId: string;
}

// ============ RESPONSE DTOs ============

export class PlanResponseDto {
  id: string;
  name: string;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  price: number;
  currency: string;
  features: string[];
  limits: Record<string, number>;
  trialDays: number;
  isActive: boolean;
}

export class SubscriptionResponseDto {
  id: string;
  userId: string;
  plan: PlanResponseDto;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  createdAt: Date;
}

export class CheckoutResponseDto {
  sessionId: string;
  url: string;
}

export class BillingPortalResponseDto {
  url: string;
}

export class UsageLimitsResponseDto {
  tier: SubscriptionTier;
  limits: Record<string, number>;
  usage: Record<string, number>;
  remaining: Record<string, number>;
}
