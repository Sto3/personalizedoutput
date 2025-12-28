-- Page Views Analytics Table
-- Simple, privacy-friendly visitor tracking

CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  session_id TEXT, -- anonymous session identifier
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);

-- Daily summary view for quick stats
CREATE OR REPLACE VIEW daily_page_views AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_views,
  COUNT(DISTINCT session_id) as unique_visitors,
  path,
  device_type
FROM page_views
GROUP BY DATE(created_at), path, device_type
ORDER BY date DESC;
