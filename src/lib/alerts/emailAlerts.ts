/**
 * Email Alert Service
 *
 * Sends email notifications for important events like:
 * - Traffic spikes
 * - New orders/generations
 * - System errors
 * - Daily summaries
 *
 * Uses Resend for email delivery.
 *
 * Setup:
 * 1. Sign up at resend.com
 * 2. Add your domain or use their test domain
 * 3. Get API key and add to Render env vars as RESEND_API_KEY
 * 4. Set ALERT_EMAIL in Render env vars (your personal email)
 */

import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Resend client (only if API key exists)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Alert config
const ALERT_EMAIL = process.env.ALERT_EMAIL || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'alerts@personalizedoutput.com';

// Track sent alerts to prevent spam (file-based for persistence)
const ALERT_LOG_PATH = path.join(process.cwd(), 'data', 'alert_log.json');

interface AlertLog {
  lastTrafficSpike?: string;
  lastDailySummary?: string;
  lastError?: string;
  alerts: Array<{ type: string; timestamp: string; message: string }>;
}

let alertLog: AlertLog = { alerts: [] };

try {
  if (fs.existsSync(ALERT_LOG_PATH)) {
    alertLog = JSON.parse(fs.readFileSync(ALERT_LOG_PATH, 'utf-8'));
  }
} catch (e) {
  console.log('[Alerts] Starting fresh alert log');
}

function saveAlertLog() {
  try {
    fs.writeFileSync(ALERT_LOG_PATH, JSON.stringify(alertLog, null, 2));
  } catch (e) {
    console.error('[Alerts] Failed to save alert log:', e);
  }
}

/**
 * Send an email alert
 */
async function sendAlert(subject: string, htmlContent: string, type: string): Promise<boolean> {
  if (!resend || !ALERT_EMAIL) {
    console.log(`[Alerts] Email not configured. Would send: ${subject}`);
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ALERT_EMAIL,
      subject: `[PersonalizedOutput] ${subject}`,
      html: htmlContent,
    });

    // Log the alert
    alertLog.alerts.push({
      type,
      timestamp: new Date().toISOString(),
      message: subject
    });

    // Keep only last 100 alerts
    if (alertLog.alerts.length > 100) {
      alertLog.alerts = alertLog.alerts.slice(-100);
    }

    saveAlertLog();
    console.log(`[Alerts] Sent: ${subject}`);
    return true;
  } catch (error) {
    console.error('[Alerts] Failed to send email:', error);
    return false;
  }
}

/**
 * Traffic spike alert - only send once per hour
 */
export async function alertTrafficSpike(currentHourTraffic: number, hourKey: string): Promise<void> {
  // Check if we already alerted this hour
  if (alertLog.lastTrafficSpike === hourKey) {
    return;
  }

  const subject = `🚨 TRAFFIC SPIKE: ${currentHourTraffic} requests this hour`;
  const html = `
    <h2>Traffic Spike Detected!</h2>
    <p><strong>${currentHourTraffic}</strong> requests in the last hour (threshold: 100)</p>
    <p>Time: ${new Date().toLocaleString()}</p>
    <p>This could mean:</p>
    <ul>
      <li>Your product is going viral! 🎉</li>
      <li>Someone shared your link</li>
      <li>Bot traffic (check logs)</li>
    </ul>
    <p><strong>Action:</strong> Check <a href="https://personalizedoutput.com/admin/stats?key=${process.env.ADMIN_KEY || 'po-admin-2024'}">Admin Stats</a> and consider upgrading your Render plan if traffic continues.</p>
    <hr>
    <p><small>PersonalizedOutput Alert System</small></p>
  `;

  const sent = await sendAlert(subject, html, 'traffic_spike');
  if (sent) {
    alertLog.lastTrafficSpike = hourKey;
    saveAlertLog();
  }
}

/**
 * New generation completed alert
 */
export async function alertNewGeneration(productType: string, orderId?: string): Promise<void> {
  const subject = `✨ New ${productType} Generated`;
  const html = `
    <h2>New ${productType} Created!</h2>
    ${orderId ? `<p>Order ID: ${orderId}</p>` : ''}
    <p>Time: ${new Date().toLocaleString()}</p>
    <p>A customer just received their personalized ${productType}.</p>
    <hr>
    <p><small>PersonalizedOutput Alert System</small></p>
  `;

  await sendAlert(subject, html, 'generation');
}

/**
 * Daily summary email
 */
export async function sendDailySummary(stats: {
  totalPageViews: number;
  totalGenerations: number;
  topProduct: string;
  hourlyPeak: number;
}): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // Only send once per day
  if (alertLog.lastDailySummary === today) {
    return;
  }

  const subject = `📊 Daily Summary - ${stats.totalPageViews} views, ${stats.totalGenerations} generations`;
  const html = `
    <h2>Daily Summary for ${today}</h2>
    <table style="border-collapse: collapse; width: 100%;">
      <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Page Views</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${stats.totalPageViews}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Generations</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${stats.totalGenerations}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Top Product</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${stats.topProduct}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Peak Hour Traffic</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${stats.hourlyPeak} requests</td></tr>
    </table>
    <p style="margin-top: 20px;"><a href="https://personalizedoutput.com/admin/stats?key=${process.env.ADMIN_KEY || 'po-admin-2024'}">View Full Stats</a></p>
    <hr>
    <p><small>PersonalizedOutput Alert System</small></p>
  `;

  const sent = await sendAlert(subject, html, 'daily_summary');
  if (sent) {
    alertLog.lastDailySummary = today;
    saveAlertLog();
  }
}

/**
 * Error alert - throttled to once per 10 minutes
 */
export async function alertError(errorMessage: string, context: string): Promise<void> {
  const now = new Date();
  const lastError = alertLog.lastError ? new Date(alertLog.lastError) : null;

  // Throttle: only alert once per 10 minutes
  if (lastError && (now.getTime() - lastError.getTime()) < 10 * 60 * 1000) {
    return;
  }

  const subject = `⚠️ Error: ${context}`;
  const html = `
    <h2>Error Detected</h2>
    <p><strong>Context:</strong> ${context}</p>
    <p><strong>Error:</strong></p>
    <pre style="background: #f4f4f4; padding: 10px; overflow-x: auto;">${errorMessage}</pre>
    <p>Time: ${now.toLocaleString()}</p>
    <hr>
    <p><small>PersonalizedOutput Alert System</small></p>
  `;

  const sent = await sendAlert(subject, html, 'error');
  if (sent) {
    alertLog.lastError = now.toISOString();
    saveAlertLog();
  }
}

/**
 * Test alert - use this to verify email is working
 */
export async function sendTestAlert(): Promise<boolean> {
  const subject = '✅ Test Alert - Email Working!';
  const html = `
    <h2>Email Alerts Are Working!</h2>
    <p>This is a test alert from PersonalizedOutput.</p>
    <p>You will receive alerts for:</p>
    <ul>
      <li>🚨 Traffic spikes (>100 requests/hour)</li>
      <li>✨ New product generations</li>
      <li>📊 Daily summaries</li>
      <li>⚠️ System errors</li>
    </ul>
    <p>Time: ${new Date().toLocaleString()}</p>
    <hr>
    <p><small>PersonalizedOutput Alert System</small></p>
  `;

  return await sendAlert(subject, html, 'test');
}

/**
 * Check if alerts are configured
 */
export function isAlertConfigured(): boolean {
  return !!(resend && ALERT_EMAIL);
}
