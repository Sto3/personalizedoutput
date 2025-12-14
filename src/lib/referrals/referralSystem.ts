/**
 * Learn With Friends - Referral System
 *
 * Tracks referral codes and rewards both referrer and referee with discounts.
 *
 * How it works:
 * 1. Each PDF includes a unique referral code (FRIEND + order-based suffix)
 * 2. Friend uses code at checkout for 15% off
 * 3. Original customer gets 15% off their next purchase
 * 4. Codes are tracked in data/referrals.json
 */

import * as fs from 'fs';
import * as path from 'path';

const REFERRALS_FILE = path.join(process.cwd(), 'data', 'referrals.json');
const DISCOUNT_PERCENT = 15;

export interface ReferralCode {
  code: string;
  createdAt: string;
  originalOrderId: string;
  originalEmail?: string;
  productId?: string;
  usedCount: number;
  maxUses: number;
  discountPercent: number;
  rewardsPending: number; // Number of rewards owed to original customer
  rewardsRedeemed: number;
}

export interface ReferralUsage {
  code: string;
  usedAt: string;
  usedByEmail?: string;
  newOrderId: string;
  discountApplied: number;
}

interface ReferralData {
  codes: Record<string, ReferralCode>;
  usages: ReferralUsage[];
  lastUpdated: string;
}

/**
 * Load referral data
 */
function loadData(): ReferralData {
  try {
    if (fs.existsSync(REFERRALS_FILE)) {
      return JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[Referrals] Error loading data:', e);
  }
  return { codes: {}, usages: [], lastUpdated: new Date().toISOString() };
}

/**
 * Save referral data
 */
function saveData(data: ReferralData): void {
  try {
    const dir = path.dirname(REFERRALS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(REFERRALS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[Referrals] Error saving data:', e);
  }
}

/**
 * Generate a unique referral code
 */
export function generateReferralCode(orderId: string): string {
  const base = orderId.slice(-4).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `FRIEND${base}${suffix}`;
}

/**
 * Create and store a new referral code for an order
 */
export function createReferralCode(
  orderId: string,
  email?: string,
  productId?: string
): ReferralCode {
  const data = loadData();
  const code = generateReferralCode(orderId);

  const referralCode: ReferralCode = {
    code,
    createdAt: new Date().toISOString(),
    originalOrderId: orderId,
    originalEmail: email,
    productId,
    usedCount: 0,
    maxUses: 10, // Each code can be used up to 10 times
    discountPercent: DISCOUNT_PERCENT,
    rewardsPending: 0,
    rewardsRedeemed: 0
  };

  data.codes[code] = referralCode;
  saveData(data);

  console.log(`[Referrals] Created code ${code} for order ${orderId}`);
  return referralCode;
}

/**
 * Validate a referral code
 */
export function validateReferralCode(code: string): {
  valid: boolean;
  discountPercent?: number;
  message: string;
} {
  const data = loadData();
  const normalizedCode = code.toUpperCase().trim();

  const referralCode = data.codes[normalizedCode];

  if (!referralCode) {
    return {
      valid: false,
      message: 'Invalid referral code'
    };
  }

  if (referralCode.usedCount >= referralCode.maxUses) {
    return {
      valid: false,
      message: 'This referral code has reached its maximum uses'
    };
  }

  return {
    valid: true,
    discountPercent: referralCode.discountPercent,
    message: `${referralCode.discountPercent}% discount will be applied!`
  };
}

/**
 * Use a referral code (mark it as used and track the usage)
 */
export function useReferralCode(
  code: string,
  newOrderId: string,
  orderAmount: number,
  usedByEmail?: string
): {
  success: boolean;
  discountAmount: number;
  message: string;
} {
  const data = loadData();
  const normalizedCode = code.toUpperCase().trim();

  const referralCode = data.codes[normalizedCode];

  if (!referralCode) {
    return {
      success: false,
      discountAmount: 0,
      message: 'Invalid referral code'
    };
  }

  if (referralCode.usedCount >= referralCode.maxUses) {
    return {
      success: false,
      discountAmount: 0,
      message: 'This referral code has reached its maximum uses'
    };
  }

  // Calculate discount
  const discountAmount = Math.round((orderAmount * referralCode.discountPercent) / 100 * 100) / 100;

  // Update code usage
  referralCode.usedCount++;
  referralCode.rewardsPending++;

  // Track the usage
  const usage: ReferralUsage = {
    code: normalizedCode,
    usedAt: new Date().toISOString(),
    usedByEmail,
    newOrderId,
    discountApplied: discountAmount
  };
  data.usages.push(usage);

  saveData(data);

  console.log(`[Referrals] Code ${normalizedCode} used for order ${newOrderId} - discount: $${discountAmount}`);

  return {
    success: true,
    discountAmount,
    message: `${referralCode.discountPercent}% discount ($${discountAmount}) applied! Your friend will get a reward too.`
  };
}

/**
 * Check if a customer has pending rewards
 */
export function getPendingRewards(email: string): {
  hasPendingRewards: boolean;
  rewardCount: number;
  discountPercent: number;
} {
  const data = loadData();

  // Find all codes belonging to this email
  const customerCodes = Object.values(data.codes).filter(
    c => c.originalEmail?.toLowerCase() === email.toLowerCase()
  );

  let totalPending = 0;
  for (const code of customerCodes) {
    totalPending += code.rewardsPending;
  }

  return {
    hasPendingRewards: totalPending > 0,
    rewardCount: totalPending,
    discountPercent: DISCOUNT_PERCENT
  };
}

/**
 * Redeem a reward (use the 15% off for the referrer)
 */
export function redeemReward(
  email: string,
  orderId: string
): {
  success: boolean;
  discountPercent: number;
  message: string;
} {
  const data = loadData();

  // Find codes belonging to this email with pending rewards
  const customerCodes = Object.values(data.codes).filter(
    c => c.originalEmail?.toLowerCase() === email.toLowerCase() && c.rewardsPending > 0
  );

  if (customerCodes.length === 0) {
    return {
      success: false,
      discountPercent: 0,
      message: 'No pending rewards found for this email'
    };
  }

  // Redeem from the first code with pending rewards
  const codeToRedeem = customerCodes[0];
  codeToRedeem.rewardsPending--;
  codeToRedeem.rewardsRedeemed++;

  saveData(data);

  console.log(`[Referrals] Reward redeemed for ${email} on order ${orderId}`);

  return {
    success: true,
    discountPercent: DISCOUNT_PERCENT,
    message: `${DISCOUNT_PERCENT}% referral reward applied!`
  };
}

/**
 * Get statistics about the referral program
 */
export function getReferralStats(): {
  totalCodes: number;
  totalUsages: number;
  totalDiscountsGiven: number;
  topReferrers: Array<{ email: string; referrals: number }>;
} {
  const data = loadData();

  const codes = Object.values(data.codes);
  const totalCodes = codes.length;
  const totalUsages = data.usages.length;
  const totalDiscountsGiven = data.usages.reduce((sum, u) => sum + u.discountApplied, 0);

  // Calculate top referrers
  const referrerCounts: Record<string, number> = {};
  for (const code of codes) {
    if (code.originalEmail && code.usedCount > 0) {
      const email = code.originalEmail.toLowerCase();
      referrerCounts[email] = (referrerCounts[email] || 0) + code.usedCount;
    }
  }

  const topReferrers = Object.entries(referrerCounts)
    .map(([email, referrals]) => ({ email, referrals }))
    .sort((a, b) => b.referrals - a.referrals)
    .slice(0, 10);

  return {
    totalCodes,
    totalUsages,
    totalDiscountsGiven,
    topReferrers
  };
}

/**
 * Get referral code info by code
 */
export function getReferralCodeInfo(code: string): ReferralCode | null {
  const data = loadData();
  return data.codes[code.toUpperCase().trim()] || null;
}
