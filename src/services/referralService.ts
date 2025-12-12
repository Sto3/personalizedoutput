/**
 * Referral System Service
 * 3 new subscribers = 1 month free subscription
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface ReferralCode {
  id: string;
  code: string;
  user_id: string;
  user_email: string;
  referral_count: number;
  rewards_earned: number;
  rewards_redeemed: number;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_code: string;
  referred_user_id: string;
  referred_email: string;
  status: 'pending' | 'converted' | 'expired';
  subscription_id?: string;
  created_at: string;
  converted_at?: string;
}

export interface ReferralReward {
  id: string;
  referrer_id: string;
  reward_type: 'free_month';
  status: 'earned' | 'applied' | 'expired';
  stripe_coupon_id?: string;
  created_at: string;
  applied_at?: string;
}

/**
 * Generate a unique referral code
 */
function generateReferralCode(email: string): string {
  // Use first part of email + random string
  const prefix = email.split('@')[0].substring(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
}

/**
 * Create a referral code for a user
 */
export async function createReferralCode(userId: string, email: string): Promise<ReferralCode> {
  // Check if user already has a code
  const { data: existing } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) {
    return existing;
  }

  // Generate unique code
  let code = generateReferralCode(email);
  let attempts = 0;

  while (attempts < 10) {
    const { data: codeExists } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('code', code)
      .single();

    if (!codeExists) break;
    code = generateReferralCode(email);
    attempts++;
  }

  // Create referral code
  const { data, error } = await supabase
    .from('referral_codes')
    .insert({
      code,
      user_id: userId,
      user_email: email,
      referral_count: 0,
      rewards_earned: 0,
      rewards_redeemed: 0
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get referral code by code string
 */
export async function getReferralCode(code: string): Promise<ReferralCode | null> {
  const { data, error } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error) return null;
  return data;
}

/**
 * Get referral code for a user
 */
export async function getUserReferralCode(userId: string): Promise<ReferralCode | null> {
  const { data, error } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Track a referral signup (before subscription)
 */
export async function trackReferralSignup(
  referralCode: string,
  referredUserId: string,
  referredEmail: string
): Promise<Referral | null> {
  // Get the referral code
  const codeData = await getReferralCode(referralCode);
  if (!codeData) return null;

  // Check if this user was already referred
  const { data: existing } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_user_id', referredUserId)
    .single();

  if (existing) return existing;

  // Create referral record
  const { data, error } = await supabase
    .from('referrals')
    .insert({
      referrer_code: referralCode.toUpperCase(),
      referred_user_id: referredUserId,
      referred_email: referredEmail,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Error tracking referral:', error);
    return null;
  }

  return data;
}

/**
 * Convert a referral when user subscribes
 * This is called from Stripe webhook when subscription is created
 */
export async function convertReferral(
  referredUserId: string,
  subscriptionId: string
): Promise<boolean> {
  // Find the pending referral
  const { data: referral, error: findError } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_user_id', referredUserId)
    .eq('status', 'pending')
    .single();

  if (findError || !referral) {
    console.log('No pending referral found for user:', referredUserId);
    return false;
  }

  // Update referral to converted
  const { error: updateError } = await supabase
    .from('referrals')
    .update({
      status: 'converted',
      subscription_id: subscriptionId,
      converted_at: new Date().toISOString()
    })
    .eq('id', referral.id);

  if (updateError) {
    console.error('Error converting referral:', updateError);
    return false;
  }

  // Update referrer's count
  const { data: referrerCode } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('code', referral.referrer_code)
    .single();

  if (referrerCode) {
    const newCount = (referrerCode.referral_count || 0) + 1;
    const newRewards = Math.floor(newCount / 3); // 1 reward per 3 referrals

    await supabase
      .from('referral_codes')
      .update({
        referral_count: newCount,
        rewards_earned: newRewards,
        updated_at: new Date().toISOString()
      })
      .eq('id', referrerCode.id);

    // Check if new reward earned
    if (newRewards > (referrerCode.rewards_redeemed || 0)) {
      await createReward(referrerCode.user_id);
      console.log(`New reward earned for user ${referrerCode.user_id}! Total rewards: ${newRewards}`);
    }
  }

  return true;
}

/**
 * Create a reward for a referrer
 */
async function createReward(referrerId: string): Promise<ReferralReward | null> {
  const { data, error } = await supabase
    .from('referral_rewards')
    .insert({
      referrer_id: referrerId,
      reward_type: 'free_month',
      status: 'earned'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating reward:', error);
    return null;
  }

  return data;
}

/**
 * Get pending rewards for a user
 */
export async function getPendingRewards(userId: string): Promise<ReferralReward[]> {
  const { data, error } = await supabase
    .from('referral_rewards')
    .select('*')
    .eq('referrer_id', userId)
    .eq('status', 'earned')
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

/**
 * Apply a reward (create Stripe coupon and apply to subscription)
 */
export async function applyReward(
  rewardId: string,
  subscriptionId: string,
  stripeSecretKey: string
): Promise<boolean> {
  // This would integrate with Stripe to apply a coupon
  // For now, mark the reward as applied

  const { error } = await supabase
    .from('referral_rewards')
    .update({
      status: 'applied',
      applied_at: new Date().toISOString()
    })
    .eq('id', rewardId);

  if (error) {
    console.error('Error applying reward:', error);
    return false;
  }

  // Update redeemed count on referral code
  const { data: reward } = await supabase
    .from('referral_rewards')
    .select('referrer_id')
    .eq('id', rewardId)
    .single();

  if (reward) {
    const { data: code } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', reward.referrer_id)
      .single();

    if (code) {
      await supabase
        .from('referral_codes')
        .update({
          rewards_redeemed: (code.rewards_redeemed || 0) + 1
        })
        .eq('id', code.id);
    }
  }

  return true;
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string): Promise<{
  code: string;
  referralCount: number;
  rewardsEarned: number;
  rewardsRedeemed: number;
  pendingRewards: number;
  referrals: Array<{
    email: string;
    status: string;
    date: string;
  }>;
}> {
  const referralCode = await getUserReferralCode(userId);

  if (!referralCode) {
    return {
      code: '',
      referralCount: 0,
      rewardsEarned: 0,
      rewardsRedeemed: 0,
      pendingRewards: 0,
      referrals: []
    };
  }

  // Get referrals
  const { data: referrals } = await supabase
    .from('referrals')
    .select('referred_email, status, created_at')
    .eq('referrer_code', referralCode.code)
    .order('created_at', { ascending: false });

  return {
    code: referralCode.code,
    referralCount: referralCode.referral_count,
    rewardsEarned: referralCode.rewards_earned,
    rewardsRedeemed: referralCode.rewards_redeemed,
    pendingRewards: referralCode.rewards_earned - referralCode.rewards_redeemed,
    referrals: (referrals || []).map(r => ({
      email: r.referred_email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
      status: r.status,
      date: new Date(r.created_at).toLocaleDateString()
    }))
  };
}

/**
 * Generate referral link
 */
export function generateReferralLink(code: string): string {
  const baseUrl = process.env.SITE_URL || 'https://personalizedoutput.com';
  return `${baseUrl}/signup?ref=${code}`;
}
