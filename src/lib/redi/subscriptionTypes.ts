/**
 * Redi Subscription Types
 *
 * Defines subscription tiers, pricing, and credit management types.
 */

// Subscription tier identifiers
export type RediSubscriptionTier = 'starter' | 'regular' | 'unlimited';

// Purchase types
export type RediPurchaseType = 'one_time' | 'subscription';

// Subscription status
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';

/**
 * Subscription tier configuration
 */
export interface SubscriptionTierConfig {
  id: RediSubscriptionTier;
  name: string;
  priceMonthly: number;        // Price in cents
  sessionsIncluded: number;    // -1 for unlimited
  sessionDuration: 30 | 60;    // Minutes per session
  features: string[];
}

/**
 * One-time purchase configuration
 */
export interface OneTimePurchaseConfig {
  duration: 30 | 60;
  price: number;               // Price in cents
}

/**
 * User subscription record
 */
export interface UserSubscription {
  userId: string;
  deviceId: string | null;         // null for one-time purchases
  tierId: RediSubscriptionTier | null;
  status: SubscriptionStatus | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  sessionsRemaining: number;   // -1 for unlimited
  sessionsUsedThisPeriod: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session credit transaction
 */
export interface CreditTransaction {
  id: string;
  userId: string;
  transactionType: 'debit' | 'credit' | 'reset';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  sessionId?: string;
  createdAt: Date;
}

// Subscription tier configurations
export const SUBSCRIPTION_TIERS: Record<RediSubscriptionTier, SubscriptionTierConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 7200,        // $72.00
    sessionsIncluded: 3,
    sessionDuration: 30,
    features: [
      '3 sessions per month',
      '30 minutes each',
      'All modes included',
      'Multi-phone support'
    ]
  },
  regular: {
    id: 'regular',
    name: 'Regular',
    priceMonthly: 11000,       // $110.00
    sessionsIncluded: 5,
    sessionDuration: 30,
    features: [
      '5 sessions per month',
      '30 minutes each',
      'All modes included',
      'Multi-phone support',
      'Priority support'
    ]
  },
  unlimited: {
    id: 'unlimited',
    name: 'Unlimited',
    priceMonthly: 14900,       // $149.00
    sessionsIncluded: -1,      // Unlimited
    sessionDuration: 30,
    features: [
      'Unlimited sessions',
      '30 minutes each',
      'All modes included',
      'Multi-phone support',
      'Priority support',
      'Early access to new features'
    ]
  }
};

// One-time purchase configurations
export const ONE_TIME_PURCHASES: Record<string, OneTimePurchaseConfig> = {
  '30': {
    duration: 30,
    price: 2600               // $26.00
  },
  '60': {
    duration: 60,
    price: 4900               // $49.00
  }
};

// Stripe price ID environment variable names
export const STRIPE_PRICE_ENV_KEYS = {
  oneTime30: 'STRIPE_REDI_30MIN_PRICE_ID',
  oneTime60: 'STRIPE_REDI_60MIN_PRICE_ID',
  starter: 'STRIPE_REDI_STARTER_PRICE_ID',
  regular: 'STRIPE_REDI_REGULAR_PRICE_ID',
  unlimited: 'STRIPE_REDI_UNLIMITED_PRICE_ID'
};

/**
 * Get Stripe price ID for a tier
 */
export function getStripePriceId(tier: RediSubscriptionTier): string {
  const envKey = STRIPE_PRICE_ENV_KEYS[tier];
  return process.env[envKey] || '';
}

/**
 * Get Stripe price ID for one-time purchase
 */
export function getOneTimePriceId(duration: 30 | 60): string {
  const envKey = duration === 30 ? STRIPE_PRICE_ENV_KEYS.oneTime30 : STRIPE_PRICE_ENV_KEYS.oneTime60;
  return process.env[envKey] || '';
}

/**
 * Check if a tier has unlimited sessions
 */
export function isUnlimitedTier(tier: RediSubscriptionTier): boolean {
  return SUBSCRIPTION_TIERS[tier].sessionsIncluded === -1;
}

/**
 * Get display price for a tier
 */
export function getTierDisplayPrice(tier: RediSubscriptionTier): string {
  const config = SUBSCRIPTION_TIERS[tier];
  return `$${(config.priceMonthly / 100).toFixed(0)}/mo`;
}

/**
 * Get display price for one-time purchase
 */
export function getOneTimeDisplayPrice(duration: 30 | 60): string {
  const config = ONE_TIME_PURCHASES[duration.toString()];
  return `$${(config.price / 100).toFixed(0)}`;
}
