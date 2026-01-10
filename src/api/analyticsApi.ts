/**
 * Homework Rescue - Analytics & Tracking
 *
 * Handles:
 * - Event tracking for internal analytics
 * - TikTok pixel events
 * - Conversion tracking
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Analytics log file
const ANALYTICS_LOG_PATH = path.join(process.cwd(), 'outputs', 'logs', 'homework_analytics.jsonl');

// Ensure log directory exists
const logDir = path.dirname(ANALYTICS_LOG_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Event types
export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  source?: string;
}

/**
 * Track an analytics event
 */
export async function trackEvent(
  event: string,
  properties: Record<string, any> = {},
  sessionId?: string,
  userId?: string
): Promise<void> {
  const analyticsEvent: AnalyticsEvent = {
    event,
    properties,
    timestamp: new Date().toISOString(),
    sessionId,
    userId,
    source: 'homework_rescue'
  };

  // Log to file
  fs.appendFileSync(ANALYTICS_LOG_PATH, JSON.stringify(analyticsEvent) + '\n');

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics]', event, properties);
  }
}

/**
 * Track page view
 */
router.post('/analytics/pageview', async (req: Request, res: Response) => {
  try {
    const { page, referrer, sessionId, userId } = req.body;

    await trackEvent('page_view', { page, referrer }, sessionId, userId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

/**
 * Track custom event
 */
router.post('/analytics/event', async (req: Request, res: Response) => {
  try {
    const { event, properties, sessionId, userId } = req.body;

    await trackEvent(event, properties || {}, sessionId, userId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

/**
 * Get analytics summary (admin)
 */
router.get('/analytics/summary', async (req: Request, res: Response) => {
  try {
    const { period = '7d' } = req.query;

    // Read log file and aggregate
    if (!fs.existsSync(ANALYTICS_LOG_PATH)) {
      return res.json({ success: true, summary: {} });
    }

    const lines = fs.readFileSync(ANALYTICS_LOG_PATH, 'utf-8')
      .split('\n')
      .filter(l => l.trim());

    const events: AnalyticsEvent[] = lines.map(l => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    }).filter(Boolean) as AnalyticsEvent[];

    // Calculate period cutoff
    const now = Date.now();
    const periodMs = period === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                     period === '30d' ? 30 * 24 * 60 * 60 * 1000 :
                     24 * 60 * 60 * 1000;
    const cutoff = new Date(now - periodMs);

    const filteredEvents = events.filter(e =>
      new Date(e.timestamp) >= cutoff
    );

    // Aggregate by event type
    const eventCounts: Record<string, number> = {};
    for (const event of filteredEvents) {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    }

    // Calculate key metrics
    const pageViews = eventCounts['page_view'] || 0;
    const intakeStarted = eventCounts['lesson.intake_started'] || 0;
    const intakeCompleted = eventCounts['lesson.intake_completed'] || 0;
    const checkouts = eventCounts['InitiateCheckout'] || 0;
    const purchases = eventCounts['CompletePayment'] || 0;
    const remakes = eventCounts['lesson.remake_requested'] || 0;

    // Calculate revenue
    const purchaseEvents = filteredEvents.filter(e => e.event === 'CompletePayment');
    const totalRevenue = purchaseEvents.reduce((sum, e) =>
      sum + (e.properties?.value || 0), 0
    );

    res.json({
      success: true,
      summary: {
        period,
        pageViews,
        intakeStarted,
        intakeCompleted,
        checkouts,
        purchases,
        remakes,
        totalRevenue,
        conversionRate: intakeStarted > 0 ? ((purchases / intakeStarted) * 100).toFixed(1) + '%' : '0%',
        intakeCompletionRate: intakeStarted > 0 ? ((intakeCompleted / intakeStarted) * 100).toFixed(1) + '%' : '0%',
        checkoutConversionRate: checkouts > 0 ? ((purchases / checkouts) * 100).toFixed(1) + '%' : '0%',
        remakeRate: purchases > 0 ? ((remakes / purchases) * 100).toFixed(1) + '%' : '0%',
        eventCounts
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * TikTok Pixel server-side tracking
 */
router.post('/analytics/tiktok', async (req: Request, res: Response) => {
  try {
    const { event, properties, pixelId } = req.body;

    // TikTok Events API would be called here
    // For MVP, we rely on client-side pixel

    await trackEvent(`tiktok.${event}`, properties);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

export default router;
