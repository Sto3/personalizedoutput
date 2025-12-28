/**
 * Analytics Service - Simple Page View Tracking
 *
 * Privacy-friendly analytics using Supabase.
 * No cookies, no personal data, just page views.
 */

import { getSupabaseServiceClient, isSupabaseServiceConfigured } from './client';

// ============================================================
// TYPES
// ============================================================

export interface PageView {
  path: string;
  referrer?: string;
  user_agent?: string;
  country?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  session_id?: string;
}

export interface DailyStats {
  date: string;
  total_views: number;
  unique_visitors: number;
}

export interface PageStats {
  path: string;
  views: number;
  unique_visitors: number;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Detect device type from user agent
 */
function getDeviceType(userAgent?: string): 'mobile' | 'tablet' | 'desktop' {
  if (!userAgent) return 'desktop';

  const ua = userAgent.toLowerCase();

  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }

  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Generate anonymous session ID (hash of IP + user agent + date)
 * Privacy-friendly: can't be traced back to individual
 */
function generateSessionId(ip?: string, userAgent?: string): string {
  const today = new Date().toISOString().split('T')[0];
  const raw = `${ip || 'unknown'}-${userAgent || 'unknown'}-${today}`;

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36);
}

// ============================================================
// TRACKING FUNCTIONS
// ============================================================

/**
 * Track a page view
 */
export async function trackPageView(
  path: string,
  options: {
    referrer?: string;
    userAgent?: string;
    ip?: string;
  } = {}
): Promise<void> {
  if (!isSupabaseServiceConfigured()) {
    return; // Silently skip if Supabase not configured
  }

  try {
    const supabase = getSupabaseServiceClient();

    const pageView: PageView = {
      path,
      referrer: options.referrer || null,
      user_agent: options.userAgent?.substring(0, 500), // Truncate long UAs
      device_type: getDeviceType(options.userAgent),
      session_id: generateSessionId(options.ip, options.userAgent),
    };

    await supabase.from('page_views').insert(pageView);
  } catch (error) {
    // Silently fail - analytics should never break the site
    console.error('[Analytics] Failed to track page view:', error);
  }
}

// ============================================================
// REPORTING FUNCTIONS
// ============================================================

/**
 * Get daily stats for the last N days
 */
export async function getDailyStats(days: number = 7): Promise<DailyStats[]> {
  if (!isSupabaseServiceConfigured()) {
    return [];
  }

  try {
    const supabase = getSupabaseServiceClient();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('page_views')
      .select('created_at, session_id')
      .gte('created_at', startDate);

    if (error || !data) return [];

    // Group by date
    const byDate: Record<string, { views: number; sessions: Set<string> }> = {};

    data.forEach(row => {
      const date = row.created_at.split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { views: 0, sessions: new Set() };
      }
      byDate[date].views++;
      if (row.session_id) {
        byDate[date].sessions.add(row.session_id);
      }
    });

    return Object.entries(byDate)
      .map(([date, stats]) => ({
        date,
        total_views: stats.views,
        unique_visitors: stats.sessions.size,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error('[Analytics] Failed to get daily stats:', error);
    return [];
  }
}

/**
 * Get top pages for the last N days
 */
export async function getTopPages(days: number = 7, limit: number = 10): Promise<PageStats[]> {
  if (!isSupabaseServiceConfigured()) {
    return [];
  }

  try {
    const supabase = getSupabaseServiceClient();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('page_views')
      .select('path, session_id')
      .gte('created_at', startDate);

    if (error || !data) return [];

    // Group by path
    const byPath: Record<string, { views: number; sessions: Set<string> }> = {};

    data.forEach(row => {
      if (!byPath[row.path]) {
        byPath[row.path] = { views: 0, sessions: new Set() };
      }
      byPath[row.path].views++;
      if (row.session_id) {
        byPath[row.path].sessions.add(row.session_id);
      }
    });

    return Object.entries(byPath)
      .map(([path, stats]) => ({
        path,
        views: stats.views,
        unique_visitors: stats.sessions.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  } catch (error) {
    console.error('[Analytics] Failed to get top pages:', error);
    return [];
  }
}

/**
 * Get device breakdown for the last N days
 */
export async function getDeviceBreakdown(days: number = 7): Promise<Record<string, number>> {
  if (!isSupabaseServiceConfigured()) {
    return {};
  }

  try {
    const supabase = getSupabaseServiceClient();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('page_views')
      .select('device_type')
      .gte('created_at', startDate);

    if (error || !data) return {};

    const breakdown: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 };

    data.forEach(row => {
      const device = row.device_type || 'desktop';
      breakdown[device] = (breakdown[device] || 0) + 1;
    });

    return breakdown;
  } catch (error) {
    console.error('[Analytics] Failed to get device breakdown:', error);
    return {};
  }
}

/**
 * Get complete analytics summary
 */
export async function getAnalyticsSummary(days: number = 7): Promise<{
  daily: DailyStats[];
  topPages: PageStats[];
  devices: Record<string, number>;
  totals: { views: number; unique: number };
}> {
  const [daily, topPages, devices] = await Promise.all([
    getDailyStats(days),
    getTopPages(days),
    getDeviceBreakdown(days),
  ]);

  const totals = daily.reduce(
    (acc, day) => ({
      views: acc.views + day.total_views,
      unique: acc.unique + day.unique_visitors,
    }),
    { views: 0, unique: 0 }
  );

  return { daily, topPages, devices, totals };
}
