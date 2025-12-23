-- Create thought_sessions table for persistent session storage
-- This table stores chat sessions so they survive Render deploys

CREATE TABLE IF NOT EXISTS thought_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  product_id TEXT NOT NULL,
  turns JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'ready_for_generation', 'completed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by session_id
CREATE INDEX IF NOT EXISTS idx_thought_sessions_session_id ON thought_sessions(session_id);

-- Index for listing sessions by product
CREATE INDEX IF NOT EXISTS idx_thought_sessions_product_id ON thought_sessions(product_id);

-- Index for cleanup of old sessions
CREATE INDEX IF NOT EXISTS idx_thought_sessions_updated_at ON thought_sessions(updated_at);

-- Enable Row Level Security
ALTER TABLE thought_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON thought_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_thought_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS thought_sessions_updated_at ON thought_sessions;
CREATE TRIGGER thought_sessions_updated_at
  BEFORE UPDATE ON thought_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_thought_sessions_updated_at();

-- Comment for documentation
COMMENT ON TABLE thought_sessions IS 'Stores chat-based thought organization sessions for Santa, Vision Board, and other products';
