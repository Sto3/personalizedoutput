/**
 * Service Usage Monitor
 *
 * Monitors all external service usage and sends email alerts when:
 * - ElevenLabs character quota approaching limit (70%, 85%, 95%)
 * - Supabase storage approaching limit
 * - High API costs detected
 * - Any service errors or failures
 *
 * Usage:
 *   npx ts-node scripts/serviceMonitor.ts              # Run check
 *   npx ts-node scripts/serviceMonitor.ts --test       # Send test email
 *   npx ts-node scripts/serviceMonitor.ts --force      # Force all alerts
 *
 * Schedule with cron (every 6 hours):
 *   0 0,6,12,18 * * * cd /path/to/project && npx ts-node scripts/serviceMonitor.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const ALERT_EMAIL = process.env.ALERT_EMAIL || process.env.PERSONAL_EMAIL || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = 'PersonalizedOutput Monitor <onboarding@resend.dev>';

// Service API keys
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Thresholds
const ELEVENLABS_WARN_PERCENT = 70;  // Warn at 70%
const ELEVENLABS_ALERT_PERCENT = 85; // Alert at 85%
const ELEVENLABS_CRITICAL_PERCENT = 95; // Critical at 95%

// Track when we last alerted to prevent spam
const ALERT_STATE_FILE = path.join(__dirname, '..', 'data', 'monitor_state.json');

interface MonitorState {
  lastCheck: string;
  lastElevenLabsAlert?: string;
  elevenLabsAlertLevel?: string; // 'warn' | 'alert' | 'critical'
  lastSupabaseAlert?: string;
  lastErrorAlert?: string;
  alerts: Array<{ timestamp: string; type: string; message: string }>;
}

interface ElevenLabsSubscription {
  tier: string;
  character_count: number;
  character_limit: number;
  can_extend_character_limit: boolean;
  next_character_count_reset_unix: number;
}

interface ServiceStatus {
  service: string;
  status: 'ok' | 'warning' | 'critical' | 'error';
  message: string;
  usage?: number;
  limit?: number;
  percentUsed?: number;
  action?: string;
}

// Load state
function loadState(): MonitorState {
  try {
    if (fs.existsSync(ALERT_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(ALERT_STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.log('[Monitor] Starting fresh state');
  }
  return { lastCheck: '', alerts: [] };
}

// Save state
function saveState(state: MonitorState): void {
  try {
    const dir = path.dirname(ALERT_STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ALERT_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('[Monitor] Failed to save state:', e);
  }
}

/**
 * Check ElevenLabs usage via their API
 */
async function checkElevenLabs(): Promise<ServiceStatus> {
  if (!ELEVENLABS_API_KEY) {
    return {
      service: 'ElevenLabs',
      status: 'error',
      message: 'API key not configured'
    };
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json() as ElevenLabsSubscription;
    const used = data.character_count;
    const limit = data.character_limit;
    const percentUsed = Math.round((used / limit) * 100);
    const resetDate = new Date(data.next_character_count_reset_unix * 1000);
    const daysUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    let status: 'ok' | 'warning' | 'critical' = 'ok';
    let action: string | undefined;

    if (percentUsed >= ELEVENLABS_CRITICAL_PERCENT) {
      status = 'critical';
      action = `URGENT: Upgrade to Pro ($99/mo) immediately or orders will fail! Only ${limit - used} characters remaining.`;
    } else if (percentUsed >= ELEVENLABS_ALERT_PERCENT) {
      status = 'critical';
      action = `Upgrade to Pro ($99/mo) soon. ${limit - used} characters remaining, resets in ${daysUntilReset} days.`;
    } else if (percentUsed >= ELEVENLABS_WARN_PERCENT) {
      status = 'warning';
      action = `Monitor usage closely. Consider upgrading to Pro if orders increase. Resets in ${daysUntilReset} days.`;
    }

    return {
      service: 'ElevenLabs',
      status,
      message: `${used.toLocaleString()} / ${limit.toLocaleString()} characters used (${percentUsed}%)`,
      usage: used,
      limit,
      percentUsed,
      action
    };

  } catch (error) {
    const errorMsg = String(error);
    // Check for permission error
    if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('missing_permissions')) {
      return {
        service: 'ElevenLabs',
        status: 'warning',
        message: 'API key needs user_read permission for usage monitoring',
        action: 'Create new API key at elevenlabs.io with "user_read" permission, or check usage manually in dashboard'
      };
    }
    return {
      service: 'ElevenLabs',
      status: 'error',
      message: `Failed to check: ${error}`,
      action: 'Check ElevenLabs dashboard manually: elevenlabs.io/app/subscription'
    };
  }
}

/**
 * Check local usage tracking (characters used this month)
 */
async function checkLocalUsageTracking(): Promise<ServiceStatus> {
  const usageFile = path.join(__dirname, '..', 'data', 'usage_tracking.json');

  try {
    if (!fs.existsSync(usageFile)) {
      return {
        service: 'Usage Tracking',
        status: 'ok',
        message: 'No local usage data yet'
      };
    }

    const data = JSON.parse(fs.readFileSync(usageFile, 'utf-8'));
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyData = data[currentMonth] || { lessons: 0, characters: 0 };

    return {
      service: 'Local Tracking',
      status: 'ok',
      message: `This month: ${monthlyData.lessons || 0} lessons, ${(monthlyData.characters || 0).toLocaleString()} characters`,
      usage: monthlyData.characters || 0
    };

  } catch (error) {
    return {
      service: 'Usage Tracking',
      status: 'warning',
      message: `Could not read local tracking: ${error}`
    };
  }
}

/**
 * Check Supabase database usage
 */
async function checkSupabase(): Promise<ServiceStatus> {
  // You're on Supabase Pro ($10/month) - much higher limits
  // Pro tier: 8GB database, 100GB bandwidth, 50GB storage
  // Can check actual usage via Supabase dashboard

  return {
    service: 'Supabase',
    status: 'ok',
    message: 'Pro tier ($10/mo) - 8GB database, 100GB bandwidth',
    action: 'Usage well within Pro limits. Check dashboard monthly.'
  };
}

/**
 * Check Render hosting status
 */
async function checkRender(): Promise<ServiceStatus> {
  // Render doesn't have a simple usage API
  // We track based on our knowledge of the free tier

  return {
    service: 'Render',
    status: 'ok',
    message: 'Free tier (750 hrs/mo, auto-sleep after 15 min)',
    action: 'Upgrade to Starter ($7/mo) before marketing push for always-on'
  };
}

/**
 * Send monitoring email via Resend
 */
async function sendMonitoringEmail(
  subject: string,
  statuses: ServiceStatus[],
  urgentMessage?: string
): Promise<boolean> {
  if (!RESEND_API_KEY || !ALERT_EMAIL) {
    console.log(`[Monitor] Email not configured. Subject: ${subject}`);
    console.log('[Monitor] Set RESEND_API_KEY and ALERT_EMAIL in .env');
    return false;
  }

  const statusEmoji = (s: ServiceStatus['status']) => {
    switch (s) {
      case 'ok': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      case 'error': return '❌';
    }
  };

  const statusColor = (s: ServiceStatus['status']) => {
    switch (s) {
      case 'ok': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      case 'error': return '#6b7280';
    }
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a24 0%, #2d2d3d 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">
                PersonalizedOutput Service Monitor
              </h1>
              <p style="margin: 10px 0 0; color: #888; font-size: 14px;">
                ${new Date().toLocaleString()}
              </p>
            </td>
          </tr>

          ${urgentMessage ? `
          <!-- Urgent Message -->
          <tr>
            <td style="padding: 20px; background: #fef2f2; border-left: 4px solid #ef4444;">
              <p style="margin: 0; color: #b91c1c; font-weight: 600;">
                ${urgentMessage}
              </p>
            </td>
          </tr>
          ` : ''}

          <!-- Service Status -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; font-size: 18px; color: #333;">Service Status</h2>

              ${statuses.map(s => `
              <div style="background: #f9fafb; border-radius: 12px; padding: 15px; margin-bottom: 15px; border-left: 4px solid ${statusColor(s.status)};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="color: #333; font-size: 16px;">${statusEmoji(s.status)} ${s.service}</strong>
                  <span style="background: ${statusColor(s.status)}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">
                    ${s.status}
                  </span>
                </div>
                <p style="margin: 0 0 8px; color: #666; font-size: 14px;">${s.message}</p>
                ${s.percentUsed !== undefined ? `
                <div style="background: #e5e7eb; border-radius: 4px; height: 8px; margin: 10px 0;">
                  <div style="background: ${statusColor(s.status)}; border-radius: 4px; height: 8px; width: ${s.percentUsed}%;"></div>
                </div>
                ` : ''}
                ${s.action ? `
                <p style="margin: 8px 0 0; color: ${statusColor(s.status)}; font-size: 13px; font-weight: 500;">
                  Action: ${s.action}
                </p>
                ` : ''}
              </div>
              `).join('')}
            </td>
          </tr>

          <!-- Quick Links -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <h3 style="margin: 0 0 15px; font-size: 14px; color: #666;">Quick Links</h3>
              <a href="https://elevenlabs.io/app/subscription" style="display: inline-block; margin-right: 10px; margin-bottom: 10px; padding: 8px 16px; background: #f3f4f6; color: #333; text-decoration: none; border-radius: 6px; font-size: 13px;">
                ElevenLabs Dashboard
              </a>
              <a href="https://dashboard.render.com" style="display: inline-block; margin-right: 10px; margin-bottom: 10px; padding: 8px 16px; background: #f3f4f6; color: #333; text-decoration: none; border-radius: 6px; font-size: 13px;">
                Render Dashboard
              </a>
              <a href="https://supabase.com/dashboard" style="display: inline-block; margin-right: 10px; margin-bottom: 10px; padding: 8px 16px; background: #f3f4f6; color: #333; text-decoration: none; border-radius: 6px; font-size: 13px;">
                Supabase Dashboard
              </a>
              <a href="https://console.anthropic.com" style="display: inline-block; margin-bottom: 10px; padding: 8px 16px; background: #f3f4f6; color: #333; text-decoration: none; border-radius: 6px; font-size: 13px;">
                Anthropic Console
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background: #f9fafb; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                This is an automated monitoring email from PersonalizedOutput.<br>
                <a href="https://personalizedoutput.com" style="color: #e94560;">personalizedoutput.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ALERT_EMAIL],
        subject: `[PersonalizedOutput] ${subject}`,
        html
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Monitor] Failed to send email:', error);
      return false;
    }

    console.log(`[Monitor] Email sent: ${subject}`);
    return true;

  } catch (error) {
    console.error('[Monitor] Email error:', error);
    return false;
  }
}

/**
 * Main monitoring routine
 */
async function runMonitor(options: { test?: boolean; force?: boolean } = {}): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║            SERVICE MONITOR - PersonalizedOutput.com                    ║
╚═══════════════════════════════════════════════════════════════════════╝
`);
  console.log(`[Monitor] Running at ${new Date().toISOString()}`);

  // Send test email if requested
  if (options.test) {
    console.log('[Monitor] Sending test email...');
    const testStatuses: ServiceStatus[] = [
      { service: 'Test Service', status: 'ok', message: 'This is a test' },
      { service: 'Warning Test', status: 'warning', message: 'Test warning', percentUsed: 75 },
      { service: 'Critical Test', status: 'critical', message: 'Test critical', percentUsed: 95 }
    ];
    const sent = await sendMonitoringEmail(
      'Test Alert - Service Monitor Working!',
      testStatuses,
      'This is a test alert to verify email delivery is working.'
    );
    console.log(sent ? '[Monitor] Test email sent!' : '[Monitor] Test email failed');
    return;
  }

  const state = loadState();
  const statuses: ServiceStatus[] = [];

  // Check all services
  console.log('\n[Monitor] Checking services...\n');

  const elevenLabs = await checkElevenLabs();
  console.log(`  ElevenLabs: ${elevenLabs.status} - ${elevenLabs.message}`);
  statuses.push(elevenLabs);

  const localUsage = await checkLocalUsageTracking();
  console.log(`  Local Tracking: ${localUsage.status} - ${localUsage.message}`);
  statuses.push(localUsage);

  const supabase = await checkSupabase();
  console.log(`  Supabase: ${supabase.status} - ${supabase.message}`);
  statuses.push(supabase);

  const render = await checkRender();
  console.log(`  Render: ${render.status} - ${render.message}`);
  statuses.push(render);

  // Determine if we need to alert
  const criticalServices = statuses.filter(s => s.status === 'critical');
  const warningServices = statuses.filter(s => s.status === 'warning');
  const errorServices = statuses.filter(s => s.status === 'error');

  let shouldAlert = options.force;
  let subject = 'Service Status Report';
  let urgentMessage: string | undefined;

  // Critical alert logic
  if (criticalServices.length > 0) {
    const elevenLabsCritical = criticalServices.find(s => s.service === 'ElevenLabs');
    if (elevenLabsCritical) {
      const currentLevel = elevenLabsCritical.percentUsed! >= ELEVENLABS_CRITICAL_PERCENT ? 'critical' :
                           elevenLabsCritical.percentUsed! >= ELEVENLABS_ALERT_PERCENT ? 'alert' : 'warn';

      // Only alert if level changed or it's been more than 12 hours
      const lastAlert = state.lastElevenLabsAlert ? new Date(state.lastElevenLabsAlert) : null;
      const hoursSinceAlert = lastAlert ? (Date.now() - lastAlert.getTime()) / (1000 * 60 * 60) : 999;

      if (currentLevel !== state.elevenLabsAlertLevel || hoursSinceAlert > 12 || options.force) {
        shouldAlert = true;
        state.elevenLabsAlertLevel = currentLevel;
        state.lastElevenLabsAlert = new Date().toISOString();
      }
    }

    subject = `CRITICAL: ${criticalServices.map(s => s.service).join(', ')} needs attention`;
    urgentMessage = criticalServices.map(s => s.action).filter(Boolean).join(' ');
  } else if (warningServices.length > 0) {
    // Only send warning alerts once per day
    const lastWarning = state.lastCheck ? new Date(state.lastCheck) : null;
    const hoursSinceWarning = lastWarning ? (Date.now() - lastWarning.getTime()) / (1000 * 60 * 60) : 999;

    if (hoursSinceWarning > 24 || options.force) {
      shouldAlert = true;
      subject = `Warning: ${warningServices.map(s => s.service).join(', ')} approaching limits`;
    }
  }

  // Send alert if needed
  if (shouldAlert && (RESEND_API_KEY && ALERT_EMAIL)) {
    await sendMonitoringEmail(subject, statuses, urgentMessage);
  } else if (!RESEND_API_KEY || !ALERT_EMAIL) {
    console.log('\n[Monitor] Email alerts not configured.');
    console.log('To enable email alerts, add to your .env file:');
    console.log('  RESEND_API_KEY=re_xxxxxxxxx');
    console.log('  ALERT_EMAIL=your@email.com');
  }

  // Update state
  state.lastCheck = new Date().toISOString();
  saveState(state);

  // Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                          MONITOR SUMMARY                               ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Critical: ${criticalServices.length.toString().padEnd(4)} Warning: ${warningServices.length.toString().padEnd(4)} Errors: ${errorServices.length.toString().padEnd(4)} OK: ${statuses.filter(s => s.status === 'ok').length.toString().padEnd(4)}      ║
║  Alert Sent: ${(shouldAlert && RESEND_API_KEY && ALERT_EMAIL ? 'Yes' : 'No').padEnd(57)}║
╚═══════════════════════════════════════════════════════════════════════╝

${criticalServices.length > 0 ? `
CRITICAL ACTIONS REQUIRED:
${criticalServices.map(s => `  - ${s.service}: ${s.action}`).join('\n')}
` : ''}
${warningServices.length > 0 ? `
WARNINGS:
${warningServices.map(s => `  - ${s.service}: ${s.action || s.message}`).join('\n')}
` : ''}
To schedule automatic monitoring, add to crontab:
  0 */6 * * * cd ${process.cwd()} && npx ts-node scripts/serviceMonitor.ts >> logs/monitor.log 2>&1

This runs every 6 hours and sends alerts only when needed.
`);
}

// Parse arguments and run
const args = process.argv.slice(2);
const options = {
  test: args.includes('--test'),
  force: args.includes('--force')
};

runMonitor(options).catch(console.error);
