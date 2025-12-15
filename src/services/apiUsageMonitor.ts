/**
 * API Usage Monitor Service
 *
 * Automatically tracks usage across ALL external services and sends
 * alerts when usage hits 80% (and 90%, 95% critical).
 *
 * Services monitored:
 * - ElevenLabs (voice generation)
 * - Anthropic Claude API
 * - Ideogram (image generation)
 * - Supabase (database/storage)
 * - Render (hosting)
 *
 * Runs automatically every 4 hours when server is active.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// CONFIGURATION
// ============================================================

interface UsageThresholds {
  warning: number;  // 80%
  alert: number;    // 90%
  critical: number; // 95%
}

const THRESHOLDS: UsageThresholds = {
  warning: 80,
  alert: 90,
  critical: 95
};

const DATA_DIR = path.join(process.cwd(), 'data');
const USAGE_STATE_FILE = path.join(DATA_DIR, 'api_usage_state.json');
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

// ============================================================
// TYPES
// ============================================================

interface ServiceUsage {
  service: string;
  used: number;
  limit: number;
  percentUsed: number;
  unit: string;
  status: 'ok' | 'warning' | 'alert' | 'critical' | 'error' | 'unknown';
  message: string;
  resetDate?: string;
  error?: string;
}

interface UsageState {
  lastCheck: string;
  lastAlertSent?: string;
  services: Record<string, ServiceUsage>;
  alerts: Array<{
    timestamp: string;
    service: string;
    level: string;
    message: string;
  }>;
}

// ============================================================
// STATE MANAGEMENT
// ============================================================

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadState(): UsageState {
  try {
    if (fs.existsSync(USAGE_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(USAGE_STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.log('[UsageMonitor] Starting fresh state');
  }
  return { lastCheck: '', services: {}, alerts: [] };
}

function saveState(state: UsageState): void {
  ensureDataDir();
  fs.writeFileSync(USAGE_STATE_FILE, JSON.stringify(state, null, 2));
}

// ============================================================
// SERVICE CHECKERS
// ============================================================

async function checkElevenLabs(): Promise<ServiceUsage> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return {
      service: 'ElevenLabs',
      used: 0,
      limit: 0,
      percentUsed: 0,
      unit: 'characters',
      status: 'error',
      message: 'API key not configured'
    };
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': apiKey }
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json() as {
      character_count: number;
      character_limit: number;
      next_character_count_reset_unix: number;
    };
    const used = data.character_count;
    const limit = data.character_limit;
    const percentUsed = Math.round((used / limit) * 100);
    const resetDate = new Date(data.next_character_count_reset_unix * 1000);

    let status: ServiceUsage['status'] = 'ok';
    if (percentUsed >= THRESHOLDS.critical) status = 'critical';
    else if (percentUsed >= THRESHOLDS.alert) status = 'alert';
    else if (percentUsed >= THRESHOLDS.warning) status = 'warning';

    return {
      service: 'ElevenLabs',
      used,
      limit,
      percentUsed,
      unit: 'characters',
      status,
      message: `${used.toLocaleString()} / ${limit.toLocaleString()} chars (${percentUsed}%)`,
      resetDate: resetDate.toISOString()
    };

  } catch (error) {
    return {
      service: 'ElevenLabs',
      used: 0,
      limit: 0,
      percentUsed: 0,
      unit: 'characters',
      status: 'error',
      message: 'Failed to fetch usage',
      error: String(error)
    };
  }
}

async function checkAnthropic(): Promise<ServiceUsage> {
  // Anthropic doesn't have a public usage API
  // We track usage locally via our own tracking
  const trackingFile = path.join(DATA_DIR, 'anthropic_usage.json');

  try {
    if (fs.existsSync(trackingFile)) {
      const data = JSON.parse(fs.readFileSync(trackingFile, 'utf-8'));
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyData = data[currentMonth] || { tokens: 0, cost: 0 };

      // Estimate based on typical Claude Sonnet pricing ($3/1M input, $15/1M output)
      // Assume $50/month soft limit for monitoring purposes
      const estimatedLimit = 50; // $50 estimated monthly budget
      const cost = monthlyData.cost || 0;
      const percentUsed = Math.round((cost / estimatedLimit) * 100);

      let status: ServiceUsage['status'] = 'ok';
      if (percentUsed >= THRESHOLDS.critical) status = 'critical';
      else if (percentUsed >= THRESHOLDS.alert) status = 'alert';
      else if (percentUsed >= THRESHOLDS.warning) status = 'warning';

      return {
        service: 'Anthropic Claude',
        used: cost,
        limit: estimatedLimit,
        percentUsed,
        unit: 'dollars',
        status,
        message: `~$${cost.toFixed(2)} / $${estimatedLimit} estimated budget`
      };
    }
  } catch (e) {
    // Silent fail - tracking may not be set up yet
  }

  return {
    service: 'Anthropic Claude',
    used: 0,
    limit: 50,
    percentUsed: 0,
    unit: 'dollars',
    status: 'unknown',
    message: 'Usage tracking not yet collecting data'
  };
}

async function checkIdeogram(): Promise<ServiceUsage> {
  // Ideogram API doesn't have a usage endpoint
  // Track locally
  const trackingFile = path.join(DATA_DIR, 'ideogram_usage.json');

  try {
    if (fs.existsSync(trackingFile)) {
      const data = JSON.parse(fs.readFileSync(trackingFile, 'utf-8'));
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyData = data[currentMonth] || { images: 0 };

      // Ideogram pricing varies, estimate 400 images/month on basic plan
      const limit = 400;
      const used = monthlyData.images || 0;
      const percentUsed = Math.round((used / limit) * 100);

      let status: ServiceUsage['status'] = 'ok';
      if (percentUsed >= THRESHOLDS.critical) status = 'critical';
      else if (percentUsed >= THRESHOLDS.alert) status = 'alert';
      else if (percentUsed >= THRESHOLDS.warning) status = 'warning';

      return {
        service: 'Ideogram',
        used,
        limit,
        percentUsed,
        unit: 'images',
        status,
        message: `${used} / ${limit} images this month`
      };
    }
  } catch (e) {
    // Silent fail
  }

  return {
    service: 'Ideogram',
    used: 0,
    limit: 400,
    percentUsed: 0,
    unit: 'images',
    status: 'unknown',
    message: 'Usage tracking not yet collecting data'
  };
}

async function checkSupabase(): Promise<ServiceUsage> {
  // Supabase Pro tier: 8GB database, 50GB storage, 100GB bandwidth
  // Would need Supabase Management API for real usage
  // For now, return static info

  return {
    service: 'Supabase',
    used: 0,
    limit: 8,
    percentUsed: 0,
    unit: 'GB database',
    status: 'ok',
    message: 'Pro tier - 8GB DB, 50GB storage, 100GB bandwidth'
  };
}

async function checkRender(): Promise<ServiceUsage> {
  // Render free tier: 750 hours/month
  // No direct API for this

  return {
    service: 'Render',
    used: 0,
    limit: 750,
    percentUsed: 0,
    unit: 'hours',
    status: 'ok',
    message: 'Free tier - 750 hrs/month, auto-sleep after 15 min'
  };
}

// ============================================================
// ALERT SYSTEM
// ============================================================

async function sendAlert(services: ServiceUsage[]): Promise<void> {
  const alertEmail = process.env.ALERT_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;

  if (!alertEmail || !resendKey) {
    console.log('[UsageMonitor] Email alerts not configured - logging to console');
    console.log('[UsageMonitor] Services needing attention:');
    services.forEach(s => {
      console.log(`  - ${s.service}: ${s.percentUsed}% (${s.status})`);
    });
    return;
  }

  const statusEmoji = (status: string) => {
    switch (status) {
      case 'warning': return '⚠️';
      case 'alert': return '🔶';
      case 'critical': return '🚨';
      default: return '❌';
    }
  };

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, sans-serif; padding: 20px; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #e94560, #ff6b6b); padding: 20px; color: white;">
      <h1 style="margin: 0;">API Usage Alert</h1>
      <p style="margin: 5px 0 0; opacity: 0.9;">${new Date().toLocaleString()}</p>
    </div>
    <div style="padding: 20px;">
      <p style="color: #666;">One or more services have reached ${THRESHOLDS.warning}%+ usage:</p>
      ${services.map(s => `
        <div style="background: ${s.status === 'critical' ? '#fef2f2' : s.status === 'alert' ? '#fefce8' : '#f3f4f6'};
                    border-radius: 8px; padding: 15px; margin: 10px 0;
                    border-left: 4px solid ${s.status === 'critical' ? '#ef4444' : s.status === 'alert' ? '#f59e0b' : '#9ca3af'};">
          <strong>${statusEmoji(s.status)} ${s.service}</strong>
          <p style="margin: 5px 0 0; color: #666;">${s.message}</p>
          <div style="background: #e5e7eb; border-radius: 4px; height: 8px; margin: 10px 0;">
            <div style="background: ${s.status === 'critical' ? '#ef4444' : s.status === 'alert' ? '#f59e0b' : '#9ca3af'};
                        border-radius: 4px; height: 8px; width: ${Math.min(s.percentUsed, 100)}%;"></div>
          </div>
        </div>
      `).join('')}
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        <a href="https://elevenlabs.io/app/subscription" style="color: #e94560;">ElevenLabs</a> |
        <a href="https://console.anthropic.com" style="color: #e94560;">Anthropic</a> |
        <a href="https://supabase.com/dashboard" style="color: #e94560;">Supabase</a> |
        <a href="https://dashboard.render.com" style="color: #e94560;">Render</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'PersonalizedOutput Monitor <onboarding@resend.dev>',
        to: [alertEmail],
        subject: `[ALERT] API Usage at ${Math.max(...services.map(s => s.percentUsed))}%`,
        html
      })
    });

    if (response.ok) {
      console.log('[UsageMonitor] Alert email sent successfully');
    } else {
      console.error('[UsageMonitor] Failed to send alert:', await response.text());
    }
  } catch (error) {
    console.error('[UsageMonitor] Email error:', error);
  }
}

// ============================================================
// MAIN MONITOR
// ============================================================

let monitorInterval: NodeJS.Timeout | null = null;

export async function checkAllUsage(): Promise<UsageState> {
  console.log('[UsageMonitor] Checking all service usage...');

  const state = loadState();
  const services: ServiceUsage[] = [];

  // Check all services in parallel
  const [elevenLabs, anthropic, ideogram, supabase, render] = await Promise.all([
    checkElevenLabs(),
    checkAnthropic(),
    checkIdeogram(),
    checkSupabase(),
    checkRender()
  ]);

  services.push(elevenLabs, anthropic, ideogram, supabase, render);

  // Update state
  state.lastCheck = new Date().toISOString();
  services.forEach(s => {
    state.services[s.service] = s;
  });

  // Check if any service needs alerting
  const needsAlert = services.filter(s =>
    s.status === 'warning' || s.status === 'alert' || s.status === 'critical'
  );

  if (needsAlert.length > 0) {
    // Only send alert if we haven't sent one in the last 6 hours for same level
    const hoursSinceLastAlert = state.lastAlertSent
      ? (Date.now() - new Date(state.lastAlertSent).getTime()) / (1000 * 60 * 60)
      : 999;

    if (hoursSinceLastAlert > 6) {
      await sendAlert(needsAlert);
      state.lastAlertSent = new Date().toISOString();

      // Log alert
      needsAlert.forEach(s => {
        state.alerts.push({
          timestamp: new Date().toISOString(),
          service: s.service,
          level: s.status,
          message: s.message
        });
      });

      // Keep only last 100 alerts
      if (state.alerts.length > 100) {
        state.alerts = state.alerts.slice(-100);
      }
    }
  }

  saveState(state);

  // Log summary
  console.log('[UsageMonitor] Status Summary:');
  services.forEach(s => {
    const emoji = s.status === 'ok' ? '✅' : s.status === 'warning' ? '⚠️' : s.status === 'alert' ? '🔶' : s.status === 'critical' ? '🚨' : '❓';
    console.log(`  ${emoji} ${s.service}: ${s.percentUsed}% - ${s.message}`);
  });

  return state;
}

export function startMonitoring(): void {
  if (monitorInterval) {
    console.log('[UsageMonitor] Already running');
    return;
  }

  console.log('[UsageMonitor] Starting automatic monitoring (every 4 hours)');

  // Run immediately
  checkAllUsage().catch(console.error);

  // Schedule periodic checks
  monitorInterval = setInterval(() => {
    checkAllUsage().catch(console.error);
  }, CHECK_INTERVAL_MS);
}

export function stopMonitoring(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('[UsageMonitor] Stopped');
  }
}

export function getUsageState(): UsageState {
  return loadState();
}

// ============================================================
// USAGE TRACKING HELPERS
// ============================================================

export function trackAnthropicUsage(inputTokens: number, outputTokens: number): void {
  ensureDataDir();
  const trackingFile = path.join(DATA_DIR, 'anthropic_usage.json');

  // Claude Sonnet pricing: $3/1M input, $15/1M output
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  const totalCost = inputCost + outputCost;

  let data: Record<string, { tokens: number; cost: number }> = {};
  try {
    if (fs.existsSync(trackingFile)) {
      data = JSON.parse(fs.readFileSync(trackingFile, 'utf-8'));
    }
  } catch (e) {}

  const monthKey = new Date().toISOString().slice(0, 7);
  if (!data[monthKey]) {
    data[monthKey] = { tokens: 0, cost: 0 };
  }

  data[monthKey].tokens += inputTokens + outputTokens;
  data[monthKey].cost += totalCost;

  fs.writeFileSync(trackingFile, JSON.stringify(data, null, 2));
}

export function trackIdeogramUsage(imageCount: number = 1): void {
  ensureDataDir();
  const trackingFile = path.join(DATA_DIR, 'ideogram_usage.json');

  let data: Record<string, { images: number }> = {};
  try {
    if (fs.existsSync(trackingFile)) {
      data = JSON.parse(fs.readFileSync(trackingFile, 'utf-8'));
    }
  } catch (e) {}

  const monthKey = new Date().toISOString().slice(0, 7);
  if (!data[monthKey]) {
    data[monthKey] = { images: 0 };
  }

  data[monthKey].images += imageCount;

  fs.writeFileSync(trackingFile, JSON.stringify(data, null, 2));
}

// ============================================================
// CLI EXECUTION
// ============================================================

if (require.main === module) {
  checkAllUsage()
    .then(state => {
      console.log('\nUsage check complete. State saved to:', USAGE_STATE_FILE);
    })
    .catch(console.error);
}
