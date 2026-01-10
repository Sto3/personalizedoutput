/**
 * Homework Rescue - Referral System
 *
 * Handles:
 * - Referral code generation
 * - Code validation
 * - Credit tracking
 * - Anti-fraud measures
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// Referral configuration
const REFERRER_CREDIT = 5.00;  // $5 credit for referrer
const REFEREE_DISCOUNT = 0.10; // 10% off for new customer

// In-memory storage (use database in production)
const referralCodes: Map<string, ReferralCode> = new Map();
const referralUsages: Map<string, ReferralUsage[]> = new Map();
const userCredits: Map<string, number> = new Map();

export interface ReferralCode {
  code: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: Date;
  usageCount: number;
  creditsEarned: number;
  isActive: boolean;
}

export interface ReferralUsage {
  code: string;
  usedBy: string;
  usedByEmail: string;
  orderId: string;
  usedAt: Date;
  creditAwarded: boolean;
}

/**
 * Generate a referral code for a user
 */
export function generateReferralCode(userId: string, email: string): ReferralCode {
  // Check if user already has a code
  for (const code of referralCodes.values()) {
    if (code.ownerId === userId) {
      return code;
    }
  }

  // Generate new code
  const code = `HR${uuidv4().split('-')[0].toUpperCase()}`;

  const referralCode: ReferralCode = {
    code,
    ownerId: userId,
    ownerEmail: email,
    createdAt: new Date(),
    usageCount: 0,
    creditsEarned: 0,
    isActive: true
  };

  referralCodes.set(code, referralCode);

  console.log(`[Referral] Generated code ${code} for ${email}`);

  return referralCode;
}

/**
 * Validate a referral code
 */
export function validateReferralCode(code: string): {
  valid: boolean;
  discount: number;
  error?: string;
} {
  const referral = referralCodes.get(code.toUpperCase());

  if (!referral) {
    return { valid: false, discount: 0, error: 'Invalid referral code' };
  }

  if (!referral.isActive) {
    return { valid: false, discount: 0, error: 'This referral code is no longer active' };
  }

  return { valid: true, discount: REFEREE_DISCOUNT };
}

/**
 * Apply a referral code to an order
 */
export function applyReferralCode(
  code: string,
  userId: string,
  userEmail: string,
  orderId: string
): {
  success: boolean;
  discount: number;
  error?: string;
} {
  const validation = validateReferralCode(code);
  if (!validation.valid) {
    return { success: false, discount: 0, error: validation.error };
  }

  const referral = referralCodes.get(code.toUpperCase())!;

  // Anti-fraud: Check if user already used a referral
  const existingUsages = referralUsages.get(userEmail) || [];
  if (existingUsages.length > 0) {
    return { success: false, discount: 0, error: 'You have already used a referral code' };
  }

  // Anti-fraud: Can't use your own code
  if (referral.ownerEmail === userEmail) {
    return { success: false, discount: 0, error: 'Cannot use your own referral code' };
  }

  // Record usage
  const usage: ReferralUsage = {
    code: code.toUpperCase(),
    usedBy: userId,
    usedByEmail: userEmail,
    orderId,
    usedAt: new Date(),
    creditAwarded: false
  };

  const userUsages = referralUsages.get(userEmail) || [];
  userUsages.push(usage);
  referralUsages.set(userEmail, userUsages);

  console.log(`[Referral] Code ${code} applied to order ${orderId}`);

  return { success: true, discount: REFEREE_DISCOUNT };
}

/**
 * Award credit to referrer after successful order
 */
export function awardReferrerCredit(referralCode: string, orderId: string): boolean {
  const referral = referralCodes.get(referralCode.toUpperCase());
  if (!referral) return false;

  // Find the usage
  for (const [email, usages] of referralUsages.entries()) {
    const usage = usages.find(u => u.orderId === orderId && !u.creditAwarded);
    if (usage) {
      usage.creditAwarded = true;

      // Update referral stats
      referral.usageCount++;
      referral.creditsEarned += REFERRER_CREDIT;

      // Award credit to referrer
      const currentCredit = userCredits.get(referral.ownerId) || 0;
      userCredits.set(referral.ownerId, currentCredit + REFERRER_CREDIT);

      console.log(`[Referral] Awarded $${REFERRER_CREDIT} to ${referral.ownerEmail}`);

      return true;
    }
  }

  return false;
}

/**
 * Get user's referral code and stats
 */
export function getUserReferralInfo(userId: string): {
  code?: ReferralCode;
  creditBalance: number;
  referralCount: number;
} {
  let userCode: ReferralCode | undefined;
  for (const code of referralCodes.values()) {
    if (code.ownerId === userId) {
      userCode = code;
      break;
    }
  }

  return {
    code: userCode,
    creditBalance: userCredits.get(userId) || 0,
    referralCount: userCode?.usageCount || 0
  };
}

/**
 * Use credit balance towards a purchase
 */
export function useCredit(userId: string, amount: number): {
  success: boolean;
  amountUsed: number;
  remaining: number;
} {
  const balance = userCredits.get(userId) || 0;

  if (balance === 0) {
    return { success: false, amountUsed: 0, remaining: 0 };
  }

  const amountToUse = Math.min(balance, amount);
  const newBalance = balance - amountToUse;

  userCredits.set(userId, newBalance);

  console.log(`[Referral] Used $${amountToUse} credit for user ${userId}`);

  return { success: true, amountUsed: amountToUse, remaining: newBalance };
}

/**
 * Get referral leaderboard (for marketing/gamification)
 */
export function getReferralLeaderboard(limit: number = 10): Array<{
  email: string;
  referrals: number;
  earned: number;
}> {
  const leaders = Array.from(referralCodes.values())
    .filter(c => c.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit)
    .map(c => ({
      email: c.ownerEmail.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
      referrals: c.usageCount,
      earned: c.creditsEarned
    }));

  return leaders;
}
