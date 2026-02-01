/**
 * OpenAI Usage API Endpoint
 * 
 * Allows checking OpenAI API spending without logging into the dashboard.
 * Can be queried by Perse or Claude to check current usage.
 * 
 * Created: Feb 1, 2026
 */

import { Router, Request, Response } from 'express';

const router = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY || 'po-admin-2024';

/**
 * GET /api/usage/openai
 * 
 * Get OpenAI API usage for current billing period.
 * Requires admin key for security.
 * 
 * Query params:
 * - key: Admin key for authentication
 * - days: Number of days to look back (default: 30)
 */
router.get('/openai', async (req: Request, res: Response) => {
  const adminKey = req.query.key || req.headers['x-admin-key'];
  
  if (adminKey !== ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized - admin key required' });
    return;
  }

  if (!OPENAI_API_KEY) {
    res.status(503).json({ error: 'OpenAI API key not configured' });
    return;
  }

  try {
    // Get current date and start of billing period
    const now = new Date();
    const daysBack = parseInt(req.query.days as string) || 30;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    
    // Format dates for OpenAI API (YYYY-MM-DD)
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    // Fetch usage data from OpenAI
    // Note: OpenAI's usage API requires organization-level access
    // We'll use the billing/usage endpoint
    const response = await fetch(
      `https://api.openai.com/v1/organization/usage?start_date=${formatDate(startDate)}&end_date=${formatDate(now)}`,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // Try alternative: dashboard API (may not work with all keys)
      // Fall back to a simple cost estimate based on known usage
      const errorText = await response.text();
      console.log('[Usage API] OpenAI usage endpoint not available:', response.status);
      
      // Return manual guidance instead
      res.json({
        success: false,
        message: 'Direct usage API requires organization admin access',
        checkManually: 'https://platform.openai.com/usage',
        estimatedRates: {
          realtimeAudioInput: '$0.06/min',
          realtimeAudioOutput: '$0.24/min',
          visionPerFrame: '$0.01-0.05/frame',
          estimatedPerMinute: '$0.30-0.60/min with vision'
        },
        tip: 'Log into platform.openai.com/usage to see actual spending'
      });
      return;
    }

    const data = await response.json();
    
    // Calculate totals
    let totalCost = 0;
    const breakdown: Record<string, number> = {};
    
    if (data.data) {
      for (const entry of data.data) {
        const cost = entry.cost || 0;
        totalCost += cost;
        
        const model = entry.model || 'unknown';
        breakdown[model] = (breakdown[model] || 0) + cost;
      }
    }

    res.json({
      success: true,
      period: {
        start: formatDate(startDate),
        end: formatDate(now),
        days: daysBack
      },
      totalCost: `$${totalCost.toFixed(2)}`,
      breakdown,
      checkDashboard: 'https://platform.openai.com/usage'
    });

  } catch (error) {
    console.error('[Usage API] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch usage data',
      checkManually: 'https://platform.openai.com/usage'
    });
  }
});

/**
 * GET /api/usage/summary
 * 
 * Quick summary for Claude/Perse to check spending.
 * Returns a human-readable response.
 */
router.get('/summary', async (req: Request, res: Response) => {
  const adminKey = req.query.key || req.headers['x-admin-key'];
  
  if (adminKey !== ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Since direct API access is limited, provide guidance
  res.json({
    message: 'OpenAI Usage Summary',
    checkHere: 'https://platform.openai.com/usage',
    currentRates: {
      'Realtime API (audio input)': '$0.06/min',
      'Realtime API (audio output)': '$0.24/min', 
      'Vision (per frame)': '$0.01-0.05',
      'Estimated with vision': '$0.30-0.60/min'
    },
    costSavingTip: 'V9 architecture (Cerebras + GPT-4o) targets $0.07-0.09/min',
    billingCycle: 'Monthly, around the 1st'
  });
});

/**
 * GET /api/usage/estimate
 * 
 * Estimate cost based on usage minutes.
 */
router.get('/estimate', (req: Request, res: Response) => {
  const minutes = parseFloat(req.query.minutes as string) || 0;
  const withVision = req.query.vision !== 'false';
  
  // Current V7 rates (OpenAI Realtime API)
  const audioInputRate = 0.06;  // per minute
  const audioOutputRate = 0.24; // per minute
  const visionRate = 0.15;      // approximate per minute with frames
  
  const audioCost = minutes * (audioInputRate + audioOutputRate);
  const visionCost = withVision ? minutes * visionRate : 0;
  const totalCost = audioCost + visionCost;
  
  // V9 projected rates
  const v9Rate = 0.08; // per minute
  const v9Cost = minutes * v9Rate;
  const savings = totalCost - v9Cost;
  
  res.json({
    input: {
      minutes,
      withVision
    },
    v7Estimate: {
      audio: `$${audioCost.toFixed(2)}`,
      vision: `$${visionCost.toFixed(2)}`,
      total: `$${totalCost.toFixed(2)}`,
      perMinute: `$${(totalCost / minutes).toFixed(2)}/min`
    },
    v9Projected: {
      total: `$${v9Cost.toFixed(2)}`,
      perMinute: '$0.08/min',
      savings: `$${savings.toFixed(2)} (${((savings/totalCost)*100).toFixed(0)}% less)`
    }
  });
});

export default router;
