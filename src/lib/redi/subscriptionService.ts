/**
 * Redi Subscription Service
 *
 * Manages subscription credits, session tracking, and billing cycle resets.
 * In production, this should be backed by Supabase for persistence.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  RediSubscriptionTier,
  SubscriptionStatus,
  UserSubscription,
  CreditTransaction,
  SUBSCRIPTION_TIERS,
  isUnlimitedTier
} from './subscriptionTypes';

// In-memory storage (replace with Supabase in production)
const userSubscriptions = new Map<string, UserSubscription>();
const creditTransactions = new Map<string, CreditTransaction[]>();

/**
 * Create or update a user subscription
 */
export function upsertSubscription(
  userId: string,
  tierId: RediSubscriptionTier,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  periodStart: Date,
  periodEnd: Date
): UserSubscription {
  const existing = userSubscriptions.get(userId);
  const tierConfig = SUBSCRIPTION_TIERS[tierId];

  const subscription: UserSubscription = {
    userId,
    deviceId: null,
    tierId,
    status: 'active',
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    sessionsRemaining: tierConfig.sessionsIncluded,
    sessionsUsedThisPeriod: 0,
    createdAt: existing?.createdAt || new Date(),
    updatedAt: new Date()
  };

  userSubscriptions.set(userId, subscription);

  // Log the credit grant
  logTransaction(userId, {
    transactionType: 'credit',
    amount: tierConfig.sessionsIncluded === -1 ? 0 : tierConfig.sessionsIncluded,
    reason: `Subscription activated: ${tierConfig.name}`,
    balanceBefore: 0,
    balanceAfter: tierConfig.sessionsIncluded
  });

  console.log(`[Redi Subscription] Created/updated subscription for user ${userId}: ${tierId}`);
  return subscription;
}

/**
 * Get user subscription
 */
export function getSubscription(userId: string): UserSubscription | undefined {
  return userSubscriptions.get(userId);
}

/**
 * Check if user can start a session
 */
export function canStartSession(userId: string): {
  canStart: boolean;
  reason?: string;
  sessionsRemaining?: number;
  isUnlimited?: boolean;
} {
  const subscription = userSubscriptions.get(userId);

  if (!subscription) {
    return {
      canStart: false,
      reason: 'No active subscription. Purchase a session or subscribe.',
      sessionsRemaining: 0
    };
  }

  if (subscription.status !== 'active') {
    return {
      canStart: false,
      reason: `Subscription is ${subscription.status}. Please update your payment method.`,
      sessionsRemaining: 0
    };
  }

  // Check if subscription period has expired
  if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd) {
    return {
      canStart: false,
      reason: 'Subscription period has ended. Awaiting renewal.',
      sessionsRemaining: 0
    };
  }

  // Unlimited tier always can start
  if (subscription.tierId && isUnlimitedTier(subscription.tierId)) {
    return {
      canStart: true,
      isUnlimited: true
    };
  }

  // Check remaining sessions
  if (subscription.sessionsRemaining <= 0) {
    return {
      canStart: false,
      reason: 'No sessions remaining this month. Upgrade or wait for renewal.',
      sessionsRemaining: 0
    };
  }

  return {
    canStart: true,
    sessionsRemaining: subscription.sessionsRemaining,
    isUnlimited: false
  };
}

/**
 * Deduct a session from user's allowance
 */
export function deductSession(userId: string, sessionId: string): boolean {
  const subscription = userSubscriptions.get(userId);

  if (!subscription) {
    console.error(`[Redi Subscription] Cannot deduct session: no subscription for user ${userId}`);
    return false;
  }

  // Unlimited tier doesn't deduct
  if (subscription.tierId && isUnlimitedTier(subscription.tierId)) {
    subscription.sessionsUsedThisPeriod++;
    subscription.updatedAt = new Date();
    console.log(`[Redi Subscription] Unlimited user ${userId} started session (${subscription.sessionsUsedThisPeriod} used this period)`);
    return true;
  }

  if (subscription.sessionsRemaining <= 0) {
    console.error(`[Redi Subscription] Cannot deduct session: no sessions remaining for user ${userId}`);
    return false;
  }

  const balanceBefore = subscription.sessionsRemaining;
  subscription.sessionsRemaining--;
  subscription.sessionsUsedThisPeriod++;
  subscription.updatedAt = new Date();

  logTransaction(userId, {
    transactionType: 'debit',
    amount: 1,
    reason: 'Session started',
    sessionId,
    balanceBefore,
    balanceAfter: subscription.sessionsRemaining
  });

  console.log(`[Redi Subscription] Deducted session for user ${userId}: ${subscription.sessionsRemaining} remaining`);
  return true;
}

/**
 * Reset credits on billing cycle renewal
 */
export function resetCredits(userId: string, newPeriodStart: Date, newPeriodEnd: Date): boolean {
  const subscription = userSubscriptions.get(userId);

  if (!subscription || !subscription.tierId) {
    console.error(`[Redi Subscription] Cannot reset credits: no subscription for user ${userId}`);
    return false;
  }

  const tierConfig = SUBSCRIPTION_TIERS[subscription.tierId];
  const balanceBefore = subscription.sessionsRemaining;

  subscription.currentPeriodStart = newPeriodStart;
  subscription.currentPeriodEnd = newPeriodEnd;
  subscription.sessionsRemaining = tierConfig.sessionsIncluded;
  subscription.sessionsUsedThisPeriod = 0;
  subscription.updatedAt = new Date();

  logTransaction(userId, {
    transactionType: 'reset',
    amount: tierConfig.sessionsIncluded,
    reason: 'Billing cycle renewal',
    balanceBefore,
    balanceAfter: tierConfig.sessionsIncluded
  });

  console.log(`[Redi Subscription] Reset credits for user ${userId}: ${tierConfig.sessionsIncluded} sessions`);
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

/**
 * Grant one-time session (for one-time purchases)
 */
export function grantOneTimeSession(userId: string, duration: 30 | 60, stripePaymentId: string): UserSubscription {
  let subscription = userSubscriptions.get(userId);

  if (!subscription) {
    // Create a minimal subscription record for one-time purchase tracking
    subscription = {
      userId,
      deviceId: null,
      tierId: null,
      status: null,
      stripeCustomerId: '',
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      sessionsRemaining: 1,
      sessionsUsedThisPeriod: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } else {
    // Add to existing balance
    subscription.sessionsRemaining++;
    subscription.updatedAt = new Date();
  }

  userSubscriptions.set(userId, subscription);

  logTransaction(userId, {
    transactionType: 'credit',
    amount: 1,
    reason: `One-time ${duration}min session purchase`,
    balanceBefore: subscription.sessionsRemaining - 1,
    balanceAfter: subscription.sessionsRemaining
  });

  console.log(`[Redi Subscription] Granted one-time ${duration}min session to user ${userId}`);
  return subscription;
}

/**
 * Get user's session balance info
 */
export function getSessionBalance(userId: string): {
  hasSubscription: boolean;
  tierId: RediSubscriptionTier | null;
  tierName: string | null;
  status: SubscriptionStatus | null;
  sessionsRemaining: number;
  sessionsUsedThisPeriod: number;
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
      sessionsRemaining: 0,
      sessionsUsedThisPeriod: 0,
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
    sessionsRemaining: unlimited ? -1 : subscription.sessionsRemaining,
    sessionsUsedThisPeriod: subscription.sessionsUsedThisPeriod,
    isUnlimited: unlimited,
    periodEnd: subscription.currentPeriodEnd,
    canStartSession: canStartSession(userId).canStart
  };
}

/**
 * Get credit transaction history
 */
export function getTransactionHistory(userId: string): CreditTransaction[] {
  return creditTransactions.get(userId) || [];
}

/**
 * Log a credit transaction
 */
function logTransaction(
  userId: string,
  data: Omit<CreditTransaction, 'id' | 'userId' | 'createdAt'>
): void {
  const transaction: CreditTransaction = {
    id: uuidv4(),
    userId,
    ...data,
    createdAt: new Date()
  };

  const history = creditTransactions.get(userId) || [];
  history.push(transaction);
  creditTransactions.set(userId, history);
}

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
