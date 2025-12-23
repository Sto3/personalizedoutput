-- Referral System Tables
-- 3 new subscribers = 1 month free subscription

-- Referral Codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  referral_count INTEGER DEFAULT 0,
  rewards_earned INTEGER DEFAULT 0,
  rewards_redeemed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_code VARCHAR(10) NOT NULL REFERENCES referral_codes(code),
  referred_user_id UUID NOT NULL,
  referred_email VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'expired')),
  subscription_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_user_id)
);

-- Referral Rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  reward_type VARCHAR(50) DEFAULT 'free_month',
  status VARCHAR(20) DEFAULT 'earned' CHECK (status IN ('earned', 'applied', 'expired')),
  stripe_coupon_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_code ON referrals(referrer_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards(status);

-- RLS Policies (Row Level Security)
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral code
CREATE POLICY "Users can read own referral code" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read referrals they made
CREATE POLICY "Users can read own referrals" ON referrals
  FOR SELECT USING (
    referrer_code IN (SELECT code FROM referral_codes WHERE user_id = auth.uid())
  );

-- Users can read their own rewards
CREATE POLICY "Users can read own rewards" ON referral_rewards
  FOR SELECT USING (auth.uid() = referrer_id);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access referral_codes" ON referral_codes
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access referrals" ON referrals
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access referral_rewards" ON referral_rewards
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_referral_codes_updated_at ON referral_codes;
CREATE TRIGGER update_referral_codes_updated_at
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
