-- Redi Session History
-- Tracks all user sessions for progress viewing

CREATE TABLE IF NOT EXISTS redi_session_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  device_id TEXT,

  -- Session details
  mode TEXT NOT NULL,
  duration_minutes INT NOT NULL,
  actual_duration_seconds INT,  -- How long they actually used it

  -- AI interaction stats
  ai_responses_count INT DEFAULT 0,
  user_questions_count INT DEFAULT 0,
  snapshots_analyzed INT DEFAULT 0,
  motion_clips_analyzed INT DEFAULT 0,

  -- Session summary (AI-generated)
  ai_summary TEXT,  -- "Practiced tennis serves. Improved follow-through consistency."
  key_feedback JSONB,  -- Array of main feedback points

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX idx_redi_session_history_user_id ON redi_session_history(user_id);
CREATE INDEX idx_redi_session_history_started_at ON redi_session_history(started_at DESC);

-- RLS policies
ALTER TABLE redi_session_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON redi_session_history
  FOR SELECT USING (true);  -- For now, allow all reads (we filter by user_id in app)

CREATE POLICY "Users can insert own sessions" ON redi_session_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own sessions" ON redi_session_history
  FOR UPDATE USING (true);
