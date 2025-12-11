-- Personalized Output Database Schema
-- Run this in your Supabase SQL Editor after creating your project

-- ============================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by UUID REFERENCES public.profiles(id),
    subscription_tier TEXT DEFAULT 'free', -- free, starter, regular, power
    subscription_status TEXT DEFAULT 'inactive', -- inactive, active, cancelled, past_due
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    monthly_outputs_used INTEGER DEFAULT 0,
    monthly_outputs_limit INTEGER DEFAULT 0,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    code TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate referral code on profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, referral_code)
    VALUES (
        NEW.id,
        NEW.email,
        generate_referral_code()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    tier TEXT NOT NULL, -- starter, regular, power
    status TEXT NOT NULL, -- active, cancelled, past_due, trialing
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDERS TABLE (tracks all product generations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    etsy_order_id TEXT,
    product_type TEXT NOT NULL, -- santa_message, vision_board, holiday_reset, etc.
    source TEXT NOT NULL, -- etsy, subscription, referral_reward
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    input_data JSONB,
    output_url TEXT,
    output_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_etsy_order_id ON public.orders(etsy_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_type ON public.orders(product_type);

-- ============================================================
-- REFERRALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    referred_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, qualified, rewarded
    referred_subscribed BOOLEAN DEFAULT FALSE,
    reward_granted BOOLEAN DEFAULT FALSE,
    reward_granted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(referrer_id, referred_id)
);

-- Index for referral lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);

-- ============================================================
-- EMAIL LIST TABLE (for marketing opt-ins)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL, -- etsy_fulfillment, website_signup, referral
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    subscribed BOOLEAN DEFAULT TRUE,
    interests TEXT[], -- santa, vision_board, planners, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_email_list_email ON public.email_list(email);

-- ============================================================
-- USAGE TRACKING TABLE (monthly usage per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    outputs_used INTEGER DEFAULT 0,
    outputs_limit INTEGER NOT NULL,

    UNIQUE(user_id, period_start)
);

-- Index for usage lookups
CREATE INDEX IF NOT EXISTS idx_usage_user_period ON public.usage_tracking(user_id, period_start);

-- ============================================================
-- BLOG POSTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    author TEXT DEFAULT 'Personalized Output Team',
    tags TEXT[],
    meta_title TEXT,
    meta_description TEXT,
    published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for blog lookups
CREATE INDEX IF NOT EXISTS idx_blog_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_published ON public.blog_posts(published);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile, service role can do anything
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Subscriptions: Users can view their own
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Orders: Users can view their own
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Referrals: Users can view referrals they made or received
CREATE POLICY "Users can view own referrals" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Email list: Only service role (server) can access
CREATE POLICY "Service role only" ON public.email_list
    FOR ALL USING (false);

-- Usage tracking: Users can view their own
CREATE POLICY "Users can view own usage" ON public.usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

-- Blog posts: Anyone can read published posts
CREATE POLICY "Anyone can read published posts" ON public.blog_posts
    FOR SELECT USING (published = true);

-- ============================================================
-- FUNCTIONS FOR USAGE TRACKING
-- ============================================================

-- Function to check if user can generate (has outputs remaining)
CREATE OR REPLACE FUNCTION can_generate(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_tier TEXT;
    v_outputs_used INTEGER;
    v_outputs_limit INTEGER;
BEGIN
    SELECT subscription_tier, monthly_outputs_used, monthly_outputs_limit
    INTO v_tier, v_outputs_used, v_outputs_limit
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_tier = 'free' THEN
        RETURN FALSE;
    END IF;

    RETURN v_outputs_used < v_outputs_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.profiles
    SET monthly_outputs_used = monthly_outputs_used + 1,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly usage (run via cron)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET monthly_outputs_used = 0,
        updated_at = NOW()
    WHERE subscription_status = 'active'
      AND current_period_end <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION FOR REFERRAL REWARDS
-- ============================================================

-- Check and grant referral rewards (3 referrals = 1 free month)
CREATE OR REPLACE FUNCTION check_referral_rewards(p_referrer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_qualified_count INTEGER;
BEGIN
    -- Count qualified referrals that haven't been rewarded
    SELECT COUNT(*)
    INTO v_qualified_count
    FROM public.referrals
    WHERE referrer_id = p_referrer_id
      AND status = 'qualified'
      AND reward_granted = FALSE;

    -- If 3 or more qualified, mark them as rewarded and return true
    IF v_qualified_count >= 3 THEN
        UPDATE public.referrals
        SET reward_granted = TRUE,
            reward_granted_at = NOW()
        WHERE id IN (
            SELECT id FROM public.referrals
            WHERE referrer_id = p_referrer_id
              AND status = 'qualified'
              AND reward_granted = FALSE
            ORDER BY created_at
            LIMIT 3
        );

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SUBSCRIPTION TIER LIMITS
-- ============================================================
-- These are set in code but documented here:
-- starter: $25/month = 2 outputs
-- regular: $39/month = 4 outputs
-- power: $59/month = 8 outputs
