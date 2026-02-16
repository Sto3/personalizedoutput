-- Redi User Memory Table
-- Supabase/Postgres migration

CREATE TABLE IF NOT EXISTS redi_user_memory (
  user_id TEXT PRIMARY KEY,
  memory_summary TEXT DEFAULT '',
  memory_version INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redi_user_memory_updated ON redi_user_memory(updated_at);
CREATE INDEX IF NOT EXISTS idx_redi_user_memory_user ON redi_user_memory(user_id);

-- Tiered Memory Table
CREATE TABLE IF NOT EXISTS redi_tiered_memory (
  user_id TEXT PRIMARY KEY,
  layer2_session_context TEXT DEFAULT '',
  layer3_weekly_patterns TEXT DEFAULT '',
  layer4_personal_profile TEXT DEFAULT '',
  layer5_life_milestones TEXT DEFAULT '',
  fact_frequency JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redi_tiered_memory_user ON redi_tiered_memory(user_id);

-- Outreach Log
CREATE TABLE IF NOT EXISTS redi_outreach_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  title TEXT,
  body TEXT,
  status TEXT DEFAULT 'sent',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redi_outreach_user ON redi_outreach_log(user_id);

-- Outreach Schedule
CREATE TABLE IF NOT EXISTS redi_outreach_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  channel TEXT NOT NULL DEFAULT 'push',
  enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  max_frequency TEXT DEFAULT 'daily',
  last_triggered TIMESTAMP WITH TIME ZONE,
  next_trigger TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redi_outreach_schedule_user ON redi_outreach_schedule(user_id);

-- Phone Numbers
CREATE TABLE IF NOT EXISTS redi_phone_numbers (
  phone_number TEXT PRIMARY KEY,
  user_id TEXT,
  area_code TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'available'
);

CREATE INDEX IF NOT EXISTS idx_redi_phone_user ON redi_phone_numbers(user_id);

-- Meeting Briefs
CREATE TABLE IF NOT EXISTS redi_meeting_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  agenda TEXT,
  talking_points JSONB DEFAULT '[]',
  authorized_topics JSONB DEFAULT '[]',
  boundaries TEXT,
  status TEXT DEFAULT 'briefed',
  debrief JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redi_meeting_user ON redi_meeting_briefs(user_id);

-- Study Progress
CREATE TABLE IF NOT EXISTS redi_study_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  score NUMERIC,
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  weak_areas JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redi_study_user ON redi_study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_redi_study_topic ON redi_study_progress(user_id, topic);

-- Usage Tracking
CREATE TABLE IF NOT EXISTS redi_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  session_type TEXT DEFAULT 'voice',
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  brain_used TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  credits_consumed NUMERIC DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_redi_usage_user ON redi_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_redi_usage_time ON redi_usage(start_time);

-- Credits
CREATE TABLE IF NOT EXISTS redi_credits (
  user_id TEXT PRIMARY KEY,
  balance NUMERIC DEFAULT 0,
  last_purchase TIMESTAMP WITH TIME ZONE,
  lifetime_purchased NUMERIC DEFAULT 0
);

-- Users
CREATE TABLE IF NOT EXISTS redi_users (
  user_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_type TEXT DEFAULT 'payg',
  totp_secret TEXT,
  totp_enabled BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_redi_users_email ON redi_users(email);

-- OAuth Tokens
CREATE TABLE IF NOT EXISTS redi_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_redi_oauth_user ON redi_oauth_tokens(user_id);

-- Audit Log
CREATE TABLE IF NOT EXISTS redi_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redi_audit_user ON redi_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_redi_audit_time ON redi_audit_log(created_at);

-- Reports
CREATE TABLE IF NOT EXISTS redi_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  period_days INTEGER DEFAULT 30,
  recipient_name TEXT,
  recipient_role TEXT,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redi_reports_user ON redi_reports(user_id);

-- Organizations
CREATE TABLE IF NOT EXISTS redi_organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  created_by TEXT NOT NULL,
  member_ids TEXT[] NOT NULL DEFAULT '{}',
  org_memory TEXT DEFAULT '',
  roles JSONB DEFAULT '{}',
  culture TEXT DEFAULT '',
  active_projects TEXT[] DEFAULT '{}',
  shared_calendar BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization invite codes
CREATE TABLE IF NOT EXISTS redi_org_invites (
  code TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES redi_organizations(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add last_memory_backup and last_backup_path to users table
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS last_memory_backup TIMESTAMPTZ;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS last_backup_path TEXT;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS has_used_observe_mode BOOLEAN DEFAULT FALSE;

-- ============================================================
-- AUTH + BILLING columns for redi_users
-- ============================================================
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS credits_remaining REAL DEFAULT 5;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_redi_users_email ON redi_users(email);
CREATE INDEX IF NOT EXISTS idx_redi_users_phone ON redi_users(phone);

-- Purchase history
CREATE TABLE IF NOT EXISTS redi_purchases (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  credits_added REAL NOT NULL,
  amount_cents INTEGER NOT NULL,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
