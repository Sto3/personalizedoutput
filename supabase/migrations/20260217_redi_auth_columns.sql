-- Add auth columns to redi_users for password-based signup/login
-- Required by src/auth/authService.ts

-- Change id to TEXT to support user_xxx format from authService
-- (If table already has UUID data, this preserves it as text)
ALTER TABLE redi_users ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Add missing columns
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 5;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;
ALTER TABLE redi_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Index on email for login lookups
CREATE INDEX IF NOT EXISTS idx_redi_users_email ON redi_users(email);
