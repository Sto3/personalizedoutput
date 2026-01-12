-- Redi Logging Tables
-- Auto-track workouts, meals, meetings, and generic logs via AI

-- ============================================================================
-- USERS TABLE (extend existing or create)
-- ============================================================================

CREATE TABLE IF NOT EXISTS redi_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE,
    apple_user_id TEXT,
    email TEXT,
    display_name TEXT,

    -- Subscription info
    subscription_tier TEXT CHECK (subscription_tier IN ('monthly', 'unlimited')),
    subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
    minutes_remaining INTEGER DEFAULT 0,
    minutes_used_this_period INTEGER DEFAULT 0,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,

    -- Apple/Stripe IDs
    apple_transaction_id TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS redi_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES redi_users(id),
    device_id TEXT NOT NULL,

    -- Session config
    mode TEXT NOT NULL CHECK (mode IN ('studying', 'meeting', 'sports', 'music', 'assembly', 'monitoring')),
    voice_gender TEXT DEFAULT 'female' CHECK (voice_gender IN ('male', 'female')),
    sensitivity DECIMAL(3,2) DEFAULT 0.5,
    voice_only BOOLEAN DEFAULT FALSE,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    actual_duration_seconds INTEGER,

    -- Stats
    ai_responses_count INTEGER DEFAULT 0,
    user_questions_count INTEGER DEFAULT 0,
    snapshots_analyzed INTEGER DEFAULT 0,
    motion_clips_analyzed INTEGER DEFAULT 0,

    -- AI summary (generated at end of session)
    ai_summary TEXT,
    key_feedback TEXT[],

    -- Payment reference
    payment_reference TEXT,
    minutes_used INTEGER DEFAULT 0,

    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended', 'expired'))
);

CREATE INDEX idx_redi_sessions_user ON redi_sessions(user_id);
CREATE INDEX idx_redi_sessions_device ON redi_sessions(device_id);
CREATE INDEX idx_redi_sessions_started ON redi_sessions(started_at DESC);

-- ============================================================================
-- ACTIVITY LOGS TABLE (generic log entries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS redi_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES redi_users(id),
    session_id UUID REFERENCES redi_sessions(id),

    -- Log type
    log_type TEXT NOT NULL CHECK (log_type IN ('workout', 'meal', 'meeting', 'study', 'custom')),

    -- Content (JSON for flexibility)
    content JSONB NOT NULL,

    -- AI-extracted summary
    summary TEXT,

    -- Timestamps
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    activity_timestamp TIMESTAMPTZ,  -- When the activity actually happened

    -- Source
    source TEXT DEFAULT 'auto' CHECK (source IN ('auto', 'voice_command', 'manual'))
);

CREATE INDEX idx_redi_logs_user ON redi_logs(user_id);
CREATE INDEX idx_redi_logs_session ON redi_logs(session_id);
CREATE INDEX idx_redi_logs_type ON redi_logs(log_type);
CREATE INDEX idx_redi_logs_logged ON redi_logs(logged_at DESC);

-- ============================================================================
-- WORKOUT LOGS (detailed structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS redi_workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES redi_logs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES redi_users(id),
    session_id UUID REFERENCES redi_sessions(id),

    -- Workout details
    exercise_name TEXT NOT NULL,
    exercise_type TEXT,  -- 'strength', 'cardio', 'flexibility', 'sport'

    -- For strength exercises
    sets INTEGER,
    reps INTEGER,
    weight_lbs DECIMAL(6,2),
    weight_kg DECIMAL(6,2),

    -- For cardio
    duration_seconds INTEGER,
    distance_miles DECIMAL(6,2),
    distance_km DECIMAL(6,2),

    -- AI feedback
    form_feedback TEXT,
    difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 10),
    ai_notes TEXT,

    logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_redi_workout_user ON redi_workout_logs(user_id);
CREATE INDEX idx_redi_workout_exercise ON redi_workout_logs(exercise_name);

-- ============================================================================
-- MEAL LOGS (detailed structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS redi_meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES redi_logs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES redi_users(id),
    session_id UUID REFERENCES redi_sessions(id),

    -- Meal details
    meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'drink')),
    food_items TEXT[],  -- List of identified foods

    -- AI-estimated nutrition (from vision analysis)
    estimated_calories INTEGER,
    estimated_protein_g DECIMAL(6,2),
    estimated_carbs_g DECIMAL(6,2),
    estimated_fat_g DECIMAL(6,2),

    -- Vision capture
    image_url TEXT,
    image_analysis TEXT,

    -- Notes
    ai_notes TEXT,
    user_notes TEXT,

    logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_redi_meal_user ON redi_meal_logs(user_id);
CREATE INDEX idx_redi_meal_type ON redi_meal_logs(meal_type);

-- ============================================================================
-- MEETING LOGS (detailed structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS redi_meeting_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES redi_logs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES redi_users(id),
    session_id UUID REFERENCES redi_sessions(id),

    -- Meeting details
    meeting_title TEXT,
    attendees TEXT[],  -- Detected or mentioned attendees

    -- Content
    key_points TEXT[],
    action_items TEXT[],
    decisions TEXT[],

    -- Full transcript summary
    summary TEXT,

    -- Duration
    duration_minutes INTEGER,

    -- Notes
    ai_notes TEXT,

    logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_redi_meeting_user ON redi_meeting_logs(user_id);

-- ============================================================================
-- MINUTE TRANSACTIONS (for tracking minute usage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS redi_minute_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES redi_users(id),

    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit', 'reset', 'extension', 'overage')),
    amount INTEGER NOT NULL,  -- Minutes
    balance_before INTEGER,
    balance_after INTEGER,

    reason TEXT,
    session_id UUID REFERENCES redi_sessions(id),
    product_id TEXT,  -- Apple product ID if purchased

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_redi_txn_user ON redi_minute_transactions(user_id);
CREATE INDEX idx_redi_txn_created ON redi_minute_transactions(created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update user's minute balance
CREATE OR REPLACE FUNCTION update_user_minutes(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_reason TEXT DEFAULT NULL,
    p_session_id UUID DEFAULT NULL,
    p_product_id TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_balance_before INTEGER;
    v_balance_after INTEGER;
BEGIN
    -- Get current balance
    SELECT minutes_remaining INTO v_balance_before
    FROM redi_users WHERE id = p_user_id;

    -- Calculate new balance
    IF p_transaction_type IN ('credit', 'reset', 'extension', 'overage') THEN
        v_balance_after := COALESCE(v_balance_before, 0) + p_amount;
    ELSE  -- debit
        v_balance_after := GREATEST(0, COALESCE(v_balance_before, 0) - p_amount);
    END IF;

    -- Update user
    UPDATE redi_users
    SET minutes_remaining = v_balance_after,
        minutes_used_this_period = CASE
            WHEN p_transaction_type = 'debit' THEN minutes_used_this_period + p_amount
            WHEN p_transaction_type = 'reset' THEN 0
            ELSE minutes_used_this_period
        END,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log transaction
    INSERT INTO redi_minute_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        reason, session_id, product_id
    ) VALUES (
        p_user_id, p_transaction_type, p_amount, v_balance_before, v_balance_after,
        p_reason, p_session_id, p_product_id
    );

    RETURN v_balance_after;
END;
$$ LANGUAGE plpgsql;

-- Function to end session and log minutes used
CREATE OR REPLACE FUNCTION end_redi_session(
    p_session_id UUID,
    p_ai_summary TEXT DEFAULT NULL,
    p_key_feedback TEXT[] DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_started_at TIMESTAMPTZ;
    v_minutes_used INTEGER;
BEGIN
    -- Get session info
    SELECT user_id, started_at INTO v_user_id, v_started_at
    FROM redi_sessions WHERE id = p_session_id;

    -- Calculate actual duration
    v_minutes_used := CEIL(EXTRACT(EPOCH FROM (NOW() - v_started_at)) / 60);

    -- Update session
    UPDATE redi_sessions SET
        ended_at = NOW(),
        actual_duration_seconds = EXTRACT(EPOCH FROM (NOW() - v_started_at))::INTEGER,
        minutes_used = v_minutes_used,
        ai_summary = p_ai_summary,
        key_feedback = p_key_feedback,
        status = 'ended'
    WHERE id = p_session_id;

    -- Deduct minutes from user (if user_id exists)
    IF v_user_id IS NOT NULL THEN
        PERFORM update_user_minutes(
            v_user_id, v_minutes_used, 'debit',
            'Session ended', p_session_id, NULL
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE redi_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE redi_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE redi_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE redi_workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE redi_meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE redi_meeting_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE redi_minute_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON redi_users
    FOR SELECT USING (auth.uid()::text = id::text OR device_id = current_setting('app.device_id', true));

CREATE POLICY "Users can view own sessions" ON redi_sessions
    FOR SELECT USING (device_id = current_setting('app.device_id', true));

CREATE POLICY "Users can view own logs" ON redi_logs
    FOR SELECT USING (
        user_id IN (SELECT id FROM redi_users WHERE device_id = current_setting('app.device_id', true))
    );

-- Service role can do everything (for backend)
CREATE POLICY "Service role full access users" ON redi_users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access sessions" ON redi_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access logs" ON redi_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access workout" ON redi_workout_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access meal" ON redi_meal_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access meeting" ON redi_meeting_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access txn" ON redi_minute_transactions
    FOR ALL USING (auth.role() = 'service_role');
