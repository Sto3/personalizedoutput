-- Stor Sessions table for AI chat history
CREATE TABLE IF NOT EXISTS stor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stor_sessions_admin ON stor_sessions(admin_email);
CREATE INDEX IF NOT EXISTS idx_stor_sessions_updated ON stor_sessions(updated_at DESC);

-- Stor Messages table
CREATE TABLE IF NOT EXISTS stor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES stor_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  is_sensitive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stor_messages_session ON stor_messages(session_id);

-- Stor Alerts table for real-time notifications
CREATE TABLE IF NOT EXISTS stor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ
);

-- Email List table for newsletter subscribers
CREATE TABLE IF NOT EXISTS email_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'website',
  user_id UUID,
  interests TEXT[] DEFAULT '{}',
  subscribed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_email_list_email ON email_list(email);
CREATE INDEX IF NOT EXISTS idx_email_list_subscribed ON email_list(subscribed);
