/**
 * Redi Subscription Types
 *
 * Updated pricing model - minute-based tracking instead of session-based.
 *
 * Pricing:
 * - Try: $9 for 15 min
 * - Monthly: $59/mo for 120 min pool
 * - Unlimited: $99/mo
 * - Extensions: $4/5min, $7/10min, $10/15min
 * - Overage: $10/15min (for subscribers who ran out)
 */

// Subscription tier identifiers
export type RediSubscriptionTier = 'monthly' | 'unlimited';

// Product types
export type RediProductType = 'try' | 'subscription' | 'extension' | 'overage';

// Subscription status
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';

/**
 * Subscription tier configuration (minute-based)
 */
export interface SubscriptionTierConfig {
  id: RediSubscriptionTier;
  name: string;
  priceMonthly: number;        // Price in cents
  minutesIncluded: number;     // -1 for unlimited
  features: string[];
}

/**
 * One-time/extension purchase configuration
 */
export interface PurchaseConfig {
  id: string;
  productId: string;           // Apple IAP product ID
  type: RediProductType;
  minutes: number;
  price: number;               // Price in cents
  displayName: string;
}

/**
 * User subscription record (minute-based)
 */
export interface UserSubscription {
  userId: string;
  deviceId: string | null;
  tierId: RediSubscriptionTier | null;
  status: SubscriptionStatus | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  appleTransactionId: string | null;  // For Apple IAP
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  minutesRemaining: number;           // -1 for unlimited
  minutesUsedThisPeriod: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Minute transaction record
 */
export interface MinuteTransaction {
  id: string;
  userId: string;
  transactionType: 'debit' | 'credit' | 'reset' | 'extension' | 'overage';
  amount: number;                      // Minutes
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  sessionId?: string;
  productId?: string;
  createdAt: Date;
}

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

export const SUBSCRIPTION_TIERS: Record<RediSubscriptionTier, SubscriptionTierConfig> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    priceMonthly: 5900,        // $59.00
    minutesIncluded: 120,      // 120 minute pool
    features: [
      '120 minutes per month',
      'Roll over unused time',
      'All modes included',
      'Multi-phone support',
      'Activity logging',
      'Export logs as PDF/CSV'
    ]
  },
  unlimited: {
    id: 'unlimited',
    name: 'Unlimited',
    priceMonthly: 9900,        // $99.00
    minutesIncluded: -1,       // Unlimited
    features: [
      'Unlimited minutes',
      'All modes included',
      'Multi-phone support',
      'Activity logging',
      'Export logs as PDF/CSV',
      'Priority support',
      'Early access to features'
    ]
  }
};

// ============================================================================
// PURCHASE CONFIGURATIONS
// ============================================================================

export const PURCHASES: Record<string, PurchaseConfig> = {
  // Try session - one-time
  try: {
    id: 'try',
    productId: 'com.personalizedoutput.redi.try',
    type: 'try',
    minutes: 15,
    price: 900,                // $9.00
    displayName: 'Try Redi (15 min)'
  },

  // Extensions
  extend5: {
    id: 'extend5',
    productId: 'com.personalizedoutput.redi.extend5',
    type: 'extension',
    minutes: 5,
    price: 400,                // $4.00
    displayName: '+5 Minutes'
  },
  extend10: {
    id: 'extend10',
    productId: 'com.personalizedoutput.redi.extend10min',
    type: 'extension',
    minutes: 10,
    price: 700,                // $7.00
    displayName: '+10 Minutes'
  },
  extend15: {
    id: 'extend15',
    productId: 'com.personalizedoutput.redi.extend15min',
    type: 'extension',
    minutes: 15,
    price: 1000,               // $10.00
    displayName: '+15 Minutes'
  },

  // Overage (for subscribers who ran out)
  overage: {
    id: 'overage',
    productId: 'com.personalizedoutput.redi.overage15min',
    type: 'overage',
    minutes: 15,
    price: 1000,               // $10.00
    displayName: 'Extra Time (15 min)'
  }
};

// Apple Product ID mappings
export const APPLE_PRODUCTS: Record<string, PurchaseConfig> = {
  'com.personalizedoutput.redi.try': PURCHASES.try,
  'com.personalizedoutput.redi.extend5': PURCHASES.extend5,
  'com.personalizedoutput.redi.extend10min': PURCHASES.extend10,
  'com.personalizedoutput.redi.extend15min': PURCHASES.extend15,
  'com.personalizedoutput.redi.overage15min': PURCHASES.overage
};

export const APPLE_SUBSCRIPTION_TIERS: Record<string, RediSubscriptionTier> = {
  'com.personalizedoutput.redi.monthly': 'monthly',
  'com.personalizedoutput.redi.unlimited': 'unlimited'
};

// ============================================================================
// STRIPE CONFIGURATION
// ============================================================================

export const STRIPE_PRICE_ENV_KEYS = {
  // Subscriptions
  monthly: 'STRIPE_REDI_MONTHLY_PRICE_ID',
  unlimited: 'STRIPE_REDI_UNLIMITED_PRICE_ID',
  // One-time
  try: 'STRIPE_REDI_TRY_PRICE_ID',
  // Extensions
  extend5: 'STRIPE_REDI_EXTEND5_PRICE_ID',
  extend10: 'STRIPE_REDI_EXTEND10_PRICE_ID',
  extend15: 'STRIPE_REDI_EXTEND15_PRICE_ID',
  overage: 'STRIPE_REDI_OVERAGE_PRICE_ID'
};

/**
 * Get Stripe price ID for a subscription tier
 */
export function getStripePriceId(tier: RediSubscriptionTier): string {
  const envKey = STRIPE_PRICE_ENV_KEYS[tier];
  return process.env[envKey] || '';
}

/**
 * Get Stripe price ID for a purchase
 */
export function getPurchasePriceId(purchaseId: string): string {
  const envKey = STRIPE_PRICE_ENV_KEYS[purchaseId as keyof typeof STRIPE_PRICE_ENV_KEYS];
  return envKey ? (process.env[envKey] || '') : '';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a tier has unlimited minutes
 */
export function isUnlimitedTier(tier: RediSubscriptionTier): boolean {
  return SUBSCRIPTION_TIERS[tier].minutesIncluded === -1;
}

/**
 * Get display price for a tier
 */
export function getTierDisplayPrice(tier: RediSubscriptionTier): string {
  const config = SUBSCRIPTION_TIERS[tier];
  return `$${(config.priceMonthly / 100).toFixed(0)}/mo`;
}

/**
 * Get minutes for a purchase product ID
 */
export function getMinutesForProduct(productId: string): number {
  const purchase = APPLE_PRODUCTS[productId];
  if (purchase) return purchase.minutes;

  // Check subscription tiers
  const tier = APPLE_SUBSCRIPTION_TIERS[productId];
  if (tier) return SUBSCRIPTION_TIERS[tier].minutesIncluded;

  return 0;
}

/**
 * Get purchase type from product ID
 */
export function getProductType(productId: string): RediProductType | 'subscription' | null {
  if (APPLE_SUBSCRIPTION_TIERS[productId]) return 'subscription';
  const purchase = APPLE_PRODUCTS[productId];
  return purchase?.type || null;
}

/**
 * Format minutes as display string
 */
export function formatMinutes(minutes: number): string {
  if (minutes === -1) return 'Unlimited';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
