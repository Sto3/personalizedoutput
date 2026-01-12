/**
 * Redi Subscription Service
 *
 * Manages subscription minutes, time tracking, and billing cycle resets.
 * Updated to minute-based tracking instead of session-based.
 *
 * In production, this should be backed by Supabase for persistence.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  RediSubscriptionTier,
  SubscriptionStatus,
  UserSubscription,
  MinuteTransaction,
  SUBSCRIPTION_TIERS,
  PURCHASES,
  isUnlimitedTier
} from './subscriptionTypes';

// In-memory storage (replace with Supabase in production)
const userSubscriptions = new Map<string, UserSubscription>();
const minuteTransactions = new Map<string, MinuteTransaction[]>();

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Create or update a user subscription
 */
export function upsertSubscription(
  userId: string,
  tierId: RediSubscriptionTier,
  stripeCustomerId: string | null,
  subscriptionId: string,  // Stripe subscription ID or Apple transaction ID
  periodStart: Date,
  periodEnd: Date,
  isApple: boolean = false
): UserSubscription {
  const existing = userSubscriptions.get(userId);
  const tierConfig = SUBSCRIPTION_TIERS[tierId];

  const subscription: UserSubscription = {
    userId,
    deviceId: null,
    tierId,
    status: 'active',
    stripeCustomerId: isApple ? null : stripeCustomerId,
    stripeSubscriptionId: isApple ? null : subscriptionId,
    appleTransactionId: isApple ? subscriptionId : null,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    minutesRemaining: tierConfig.minutesIncluded,
    minutesUsedThisPeriod: 0,
    createdAt: existing?.createdAt || new Date(),
    updatedAt: new Date()
  };

  userSubscriptions.set(userId, subscription);

  // Log the minute grant
  logTransaction(userId, {
    transactionType: 'credit',
    amount: tierConfig.minutesIncluded === -1 ? 0 : tierConfig.minutesIncluded,
    reason: `Subscription activated: ${tierConfig.name}`,
    balanceBefore: 0,
    balanceAfter: tierConfig.minutesIncluded
  });

  console.log(`[Redi Subscription] Created/updated subscription for user ${userId}: ${tierId} (${tierConfig.minutesIncluded} min)`);
  return subscription;
}

/**
 * Get user subscription
 */
export function getSubscription(userId: string): UserSubscription | undefined {
  return userSubscriptions.get(userId);
}

// ============================================================================
// MINUTE TRACKING
// ============================================================================

/**
 * Check if user can start/continue a session
 */
export function canUseMinutes(userId: string, minutesNeeded: number = 1): {
  canUse: boolean;
  reason?: string;
  minutesRemaining?: number;
  isUnlimited?: boolean;
} {
  const subscription = userSubscriptions.get(userId);

  if (!subscription) {
    return {
      canUse: false,
      reason: 'No active subscription. Try Redi for $9 or subscribe.',
      minutesRemaining: 0
    };
  }

  if (subscription.status !== 'active') {
    return {
      canUse: false,
      reason: `Subscription is ${subscription.status}. Please update your payment method.`,
      minutesRemaining: 0
    };
  }

  // Check if subscription period has expired
  if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd) {
    return {
      canUse: false,
      reason: 'Subscription period has ended. Awaiting renewal.',
      minutesRemaining: 0
    };
  }

  // Unlimited tier always can use
  if (subscription.tierId && isUnlimitedTier(subscription.tierId)) {
    return {
      canUse: true,
      isUnlimited: true,
      minutesRemaining: -1
    };
  }

  // Check remaining minutes
  if (subscription.minutesRemaining < minutesNeeded) {
    return {
      canUse: false,
      reason: `Only ${subscription.minutesRemaining} minutes remaining. Add more time or upgrade.`,
      minutesRemaining: subscription.minutesRemaining
    };
  }

  return {
    canUse: true,
    minutesRemaining: subscription.minutesRemaining,
    isUnlimited: false
  };
}

/**
 * Deduct minutes from user's balance
 */
export function deductMinutes(userId: string, minutes: number, sessionId?: string, reason?: string): boolean {
  const subscription = userSubscriptions.get(userId);

  if (!subscription) {
    console.error(`[Redi Subscription] Cannot deduct minutes: no subscription for user ${userId}`);
    return false;
  }

  // Unlimited tier doesn't deduct
  if (subscription.tierId && isUnlimitedTier(subscription.tierId)) {
    subscription.minutesUsedThisPeriod += minutes;
    subscription.updatedAt = new Date();
    console.log(`[Redi Subscription] Unlimited user ${userId} used ${minutes} min (${subscription.minutesUsedThisPeriod} total this period)`);
    return true;
  }

  if (subscription.minutesRemaining < minutes) {
    console.error(`[Redi Subscription] Cannot deduct ${minutes} min: only ${subscription.minutesRemaining} remaining for user ${userId}`);
    return false;
  }

  const balanceBefore = subscription.minutesRemaining;
  subscription.minutesRemaining -= minutes;
  subscription.minutesUsedThisPeriod += minutes;
  subscription.updatedAt = new Date();

  logTransaction(userId, {
    transactionType: 'debit',
    amount: minutes,
    reason: reason || 'Session time used',
    sessionId,
    balanceBefore,
    balanceAfter: subscription.minutesRemaining
  });

  console.log(`[Redi Subscription] Deducted ${minutes} min for user ${userId}: ${subscription.minutesRemaining} remaining`);
  return true;
}

/**
 * Add minutes to user's balance (extension or overage purchase)
 */
export function addMinutes(
  userId: string,
  minutes: number,
  productId: string,
  transactionType: 'extension' | 'overage' | 'credit' = 'extension'
): boolean {
  let subscription = userSubscriptions.get(userId);

  if (!subscription) {
    // Create a minimal record for tracking
    subscription = {
      userId,
      deviceId: null,
      tierId: null,
      status: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      appleTransactionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      minutesRemaining: 0,
      minutesUsedThisPeriod: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    userSubscriptions.set(userId, subscription);
  }

  const balanceBefore = subscription.minutesRemaining;

  // For unlimited users, just track the purchase but don't add to balance
  if (subscription.tierId && isUnlimitedTier(subscription.tierId)) {
    console.log(`[Redi Subscription] Unlimited user ${userId} purchased ${minutes} min extension (not added to balance)`);
    return true;
  }

  subscription.minutesRemaining += minutes;
  subscription.updatedAt = new Date();

  logTransaction(userId, {
    transactionType,
    amount: minutes,
    reason: `Added ${minutes} minutes`,
    productId,
    balanceBefore,
    balanceAfter: subscription.minutesRemaining
  });

  console.log(`[Redi Subscription] Added ${minutes} min for user ${userId}: ${subscription.minutesRemaining} total`);
  return true;
}

/**
 * Grant minutes from a one-time "Try" purchase
 */
export function grantTrySession(userId: string, transactionId: string): UserSubscription {
  const tryConfig = PURCHASES.try;
  let subscription = userSubscriptions.get(userId);

  if (!subscription) {
    subscription = {
      userId,
      deviceId: null,
      tierId: null,
      status: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      appleTransactionId: transactionId,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      minutesRemaining: tryConfig.minutes,
      minutesUsedThisPeriod: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } else {
    subscription.minutesRemaining += tryConfig.minutes;
    subscription.updatedAt = new Date();
  }

  userSubscriptions.set(userId, subscription);

  logTransaction(userId, {
    transactionType: 'credit',
    amount: tryConfig.minutes,
    reason: 'Try Redi purchase',
    productId: tryConfig.productId,
    balanceBefore: subscription.minutesRemaining - tryConfig.minutes,
    balanceAfter: subscription.minutesRemaining
  });

  console.log(`[Redi Subscription] Granted ${tryConfig.minutes} min Try session to user ${userId}`);
  return subscription;
}

// ============================================================================
// BILLING CYCLE
// ============================================================================

/**
 * Reset minutes on billing cycle renewal
 */
export function resetMinutes(userId: string, newPeriodStart: Date, newPeriodEnd: Date): boolean {
  const subscription = userSubscriptions.get(userId);

  if (!subscription || !subscription.tierId) {
    console.error(`[Redi Subscription] Cannot reset minutes: no subscription for user ${userId}`);
    return false;
  }

  const tierConfig = SUBSCRIPTION_TIERS[subscription.tierId];
  const balanceBefore = subscription.minutesRemaining;

  subscription.currentPeriodStart = newPeriodStart;
  subscription.currentPeriodEnd = newPeriodEnd;
  subscription.minutesRemaining = tierConfig.minutesIncluded;
  subscription.minutesUsedThisPeriod = 0;
  subscription.updatedAt = new Date();

  logTransaction(userId, {
    transactionType: 'reset',
    amount: tierConfig.minutesIncluded,
    reason: 'Billing cycle renewal',
    balanceBefore,
    balanceAfter: tierConfig.minutesIncluded
  });

  console.log(`[Redi Subscription] Reset minutes for user ${userId}: ${tierConfig.minutesIncluded} min`);
  return true;
}

/**
 * Update subscription status
 */
export function updateSubscriptionStatus(userId: string, status: SubscriptionStatus): boolean {
  const subscription = userSubscriptions.get(userId);

  if (!subscription) {
    console.error(`[Redi Subscription] Cannot update status: no subscription for user ${userId}`);
    return false;
  }

  subscription.status = status;
  subscription.updatedAt = new Date();

  console.log(`[Redi Subscription] Updated status for user ${userId}: ${status}`);
  return true;
}

/**
 * Cancel subscription
 */
export function cancelSubscription(userId: string): boolean {
  const subscription = userSubscriptions.get(userId);

  if (!subscription) {
    console.error(`[Redi Subscription] Cannot cancel: no subscription for user ${userId}`);
    return false;
  }

  subscription.status = 'canceled';
  subscription.updatedAt = new Date();

  console.log(`[Redi Subscription] Canceled subscription for user ${userId}`);
  return true;
}

// ============================================================================
// BALANCE QUERIES
// ============================================================================

/**
 * Get user's minute balance info
 */
export function getMinuteBalance(userId: string): {
  hasSubscription: boolean;
  tierId: RediSubscriptionTier | null;
  tierName: string | null;
  status: SubscriptionStatus | null;
  minutesRemaining: number;
  minutesUsedThisPeriod: number;
  isUnlimited: boolean;
  periodEnd: Date | null;
  canStartSession: boolean;
} {
  const subscription = userSubscriptions.get(userId);

  if (!subscription) {
    return {
      hasSubscription: false,
      tierId: null,
      tierName: null,
      status: null,
      minutesRemaining: 0,
      minutesUsedThisPeriod: 0,
      isUnlimited: false,
      periodEnd: null,
      canStartSession: false
    };
  }

  const tierConfig = subscription.tierId ? SUBSCRIPTION_TIERS[subscription.tierId] : null;
  const unlimited = subscription.tierId ? isUnlimitedTier(subscription.tierId) : false;

  return {
    hasSubscription: subscription.tierId !== null,
    tierId: subscription.tierId,
    tierName: tierConfig?.name || null,
    status: subscription.status,
    minutesRemaining: unlimited ? -1 : subscription.minutesRemaining,
    minutesUsedThisPeriod: subscription.minutesUsedThisPeriod,
    isUnlimited: unlimited,
    periodEnd: subscription.currentPeriodEnd,
    canStartSession: canUseMinutes(userId, 1).canUse
  };
}

// Legacy alias for backward compatibility
export function getSessionBalance(userId: string) {
  const balance = getMinuteBalance(userId);
  return {
    ...balance,
    // Map to old field names for compatibility
    sessionsRemaining: balance.minutesRemaining,
    sessionsUsedThisPeriod: balance.minutesUsedThisPeriod
  };
}

// Legacy alias
export function canStartSession(userId: string) {
  const result = canUseMinutes(userId, 1);
  return {
    canStart: result.canUse,
    reason: result.reason,
    sessionsRemaining: result.minutesRemaining,
    isUnlimited: result.isUnlimited
  };
}

// Legacy alias
export function deductSession(userId: string, sessionId: string) {
  // Deduct 1 minute as placeholder - actual deduction happens during session
  return deductMinutes(userId, 0, sessionId, 'Session started');
}

// Legacy alias
export function resetCredits(userId: string, newPeriodStart: Date, newPeriodEnd: Date) {
  return resetMinutes(userId, newPeriodStart, newPeriodEnd);
}

// Legacy alias
export function grantOneTimeSession(userId: string, duration: number, paymentId: string) {
  return grantTrySession(userId, paymentId);
}

// ============================================================================
// TRANSACTION HISTORY
// ============================================================================

/**
 * Get minute transaction history
 */
export function getTransactionHistory(userId: string): MinuteTransaction[] {
  return minuteTransactions.get(userId) || [];
}

/**
 * Log a minute transaction
 */
function logTransaction(
  userId: string,
  data: Omit<MinuteTransaction, 'id' | 'userId' | 'createdAt'>
): void {
  const transaction: MinuteTransaction = {
    id: uuidv4(),
    userId,
    ...data,
    createdAt: new Date()
  };

  const history = minuteTransactions.get(userId) || [];
  history.push(transaction);
  minuteTransactions.set(userId, history);
}

// ============================================================================
// USER LOOKUPS
// ============================================================================

/**
 * Find user ID by Stripe customer ID
 */
export function findUserByStripeCustomer(stripeCustomerId: string): string | undefined {
  for (const [userId, subscription] of userSubscriptions) {
    if (subscription.stripeCustomerId === stripeCustomerId) {
      return userId;
    }
  }
  return undefined;
}

/**
 * Find user ID by Stripe subscription ID
 */
export function findUserByStripeSubscription(stripeSubscriptionId: string): string | undefined {
  for (const [userId, subscription] of userSubscriptions) {
    if (subscription.stripeSubscriptionId === stripeSubscriptionId) {
      return userId;
    }
  }
  return undefined;
}

/**
 * Find user ID by Apple transaction ID
 */
export function findUserByAppleTransaction(appleTransactionId: string): string | undefined {
  for (const [userId, subscription] of userSubscriptions) {
    if (subscription.appleTransactionId === appleTransactionId) {
      return userId;
    }
  }
  return undefined;
}
