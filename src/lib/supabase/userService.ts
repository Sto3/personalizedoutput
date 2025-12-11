/**
 * User Service
 *
 * Handles user authentication, profile management, and usage tracking.
 */

import {
  getSupabaseClient,
  getSupabaseServiceClient,
  isSupabaseConfigured,
  Profile,
  SUBSCRIPTION_TIERS,
  TierName,
} from './client';

// ============================================================
// AUTHENTICATION
// ============================================================

/**
 * Sign up a new user with email and password
 */
export async function signUp(
  email: string,
  password: string,
  fullName?: string,
  referralCode?: string
): Promise<{ user: Profile | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Supabase not configured' };
  }

  const supabase = getSupabaseClient();

  // Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError) {
    return { user: null, error: authError.message };
  }

  if (!authData.user) {
    return { user: null, error: 'Failed to create user' };
  }

  // If there's a referral code, link the referral
  if (referralCode) {
    await linkReferral(authData.user.id, referralCode);
  }

  // Fetch the created profile
  const profile = await getProfile(authData.user.id);
  return { user: profile, error: null };
}

/**
 * Sign in an existing user
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: Profile | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Supabase not configured' };
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  if (!data.user) {
    return { user: null, error: 'Failed to sign in' };
  }

  const profile = await getProfile(data.user.id);
  return { user: profile, error: null };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase not configured' };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  return { error: error?.message || null };
}

/**
 * Get the current session
 */
export async function getSession() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase not configured' };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.SITE_URL || 'https://personalizedoutput.com'}/reset-password`,
  });

  return { error: error?.message || null };
}

// ============================================================
// PROFILE MANAGEMENT
// ============================================================

/**
 * Get a user's profile by ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[UserService] Error fetching profile:', error);
    return null;
  }

  return data as Profile;
}

/**
 * Get a user's profile by email
 */
export async function getProfileByEmail(email: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('[UserService] Error fetching profile by email:', error);
    return null;
  }

  return data as Profile;
}

/**
 * Get a user's profile by referral code
 */
export async function getProfileByReferralCode(referralCode: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('referral_code', referralCode)
    .single();

  if (error) {
    return null;
  }

  return data as Profile;
}

/**
 * Update a user's profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<{ profile: Profile | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { profile: null, error: 'Supabase not configured' };
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data as Profile, error: null };
}

// ============================================================
// USAGE TRACKING
// ============================================================

/**
 * Check if a user can generate (has outputs remaining)
 */
export async function canGenerate(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);

  if (!profile) {
    return false;
  }

  if (profile.subscription_tier === 'free' || profile.subscription_status !== 'active') {
    return false;
  }

  return profile.monthly_outputs_used < profile.monthly_outputs_limit;
}

/**
 * Get remaining outputs for a user
 */
export async function getRemainingOutputs(userId: string): Promise<number> {
  const profile = await getProfile(userId);

  if (!profile || profile.subscription_tier === 'free' || profile.subscription_status !== 'active') {
    return 0;
  }

  return Math.max(0, profile.monthly_outputs_limit - profile.monthly_outputs_used);
}

/**
 * Increment a user's usage count
 */
export async function incrementUsage(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabaseServiceClient();

  const { error } = await supabase.rpc('increment_usage', { p_user_id: userId });

  if (error) {
    console.error('[UserService] Error incrementing usage:', error);
    return false;
  }

  return true;
}

/**
 * Reset monthly usage for a user (called when subscription renews)
 */
export async function resetUsage(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      monthly_outputs_used: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[UserService] Error resetting usage:', error);
    return false;
  }

  return true;
}

// ============================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================

/**
 * Update subscription for a user
 */
export async function updateSubscription(
  userId: string,
  tier: TierName,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabaseServiceClient();
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      monthly_outputs_limit: tierConfig.outputs,
      monthly_outputs_used: 0,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[UserService] Error updating subscription:', error);
    return false;
  }

  return true;
}

/**
 * Cancel subscription for a user
 */
export async function cancelSubscription(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[UserService] Error cancelling subscription:', error);
    return false;
  }

  return true;
}

// ============================================================
// REFERRAL SYSTEM
// ============================================================

/**
 * Link a referral (when new user signs up with referral code)
 */
async function linkReferral(newUserId: string, referralCode: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabaseServiceClient();

  // Find the referrer
  const referrer = await getProfileByReferralCode(referralCode);
  if (!referrer) {
    console.log('[UserService] Referral code not found:', referralCode);
    return false;
  }

  // Update the new user's referred_by field
  await supabase
    .from('profiles')
    .update({ referred_by: referrer.id })
    .eq('id', newUserId);

  // Create referral record
  const { error } = await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: newUserId,
    status: 'pending',
  });

  if (error) {
    console.error('[UserService] Error creating referral:', error);
    return false;
  }

  console.log(`[UserService] Referral linked: ${newUserId} referred by ${referrer.id}`);
  return true;
}

/**
 * Qualify a referral (when referred user subscribes)
 */
export async function qualifyReferral(referredUserId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabaseServiceClient();

  // Update referral status
  const { error } = await supabase
    .from('referrals')
    .update({
      status: 'qualified',
      referred_subscribed: true,
    })
    .eq('referred_id', referredUserId)
    .eq('status', 'pending');

  if (error) {
    console.error('[UserService] Error qualifying referral:', error);
    return false;
  }

  // Check if referrer now qualifies for reward
  const profile = await getProfile(referredUserId);
  if (profile?.referred_by) {
    await checkAndGrantReferralReward(profile.referred_by);
  }

  return true;
}

/**
 * Check and grant referral reward (3 referrals = 1 free month)
 */
async function checkAndGrantReferralReward(referrerId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabaseServiceClient();

  // Count qualified unrewarded referrals
  const { count } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
    .eq('status', 'qualified')
    .eq('reward_granted', false);

  if ((count || 0) >= 3) {
    // Grant the reward (extend subscription by 1 month)
    const profile = await getProfile(referrerId);
    if (profile && profile.current_period_end) {
      const newEndDate = new Date(profile.current_period_end);
      newEndDate.setMonth(newEndDate.getMonth() + 1);

      await supabase
        .from('profiles')
        .update({
          current_period_end: newEndDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', referrerId);

      // Mark 3 referrals as rewarded
      const { data: referrals } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', referrerId)
        .eq('status', 'qualified')
        .eq('reward_granted', false)
        .limit(3);

      if (referrals) {
        const ids = referrals.map((r) => r.id);
        await supabase
          .from('referrals')
          .update({
            reward_granted: true,
            reward_granted_at: new Date().toISOString(),
          })
          .in('id', ids);
      }

      console.log(`[UserService] Referral reward granted to ${referrerId}`);
      return true;
    }
  }

  return false;
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string): Promise<{
  totalReferrals: number;
  qualifiedReferrals: number;
  rewardsEarned: number;
  referralCode: string;
}> {
  if (!isSupabaseConfigured()) {
    return { totalReferrals: 0, qualifiedReferrals: 0, rewardsEarned: 0, referralCode: '' };
  }

  const supabase = getSupabaseServiceClient();
  const profile = await getProfile(userId);

  if (!profile) {
    return { totalReferrals: 0, qualifiedReferrals: 0, rewardsEarned: 0, referralCode: '' };
  }

  const { count: total } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId);

  const { count: qualified } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .eq('status', 'qualified');

  const { count: rewarded } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .eq('reward_granted', true);

  return {
    totalReferrals: total || 0,
    qualifiedReferrals: qualified || 0,
    rewardsEarned: Math.floor((rewarded || 0) / 3),
    referralCode: profile.referral_code,
  };
}
