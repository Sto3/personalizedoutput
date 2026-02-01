/**
 * OpenAI Usage API Endpoint
 * 
 * Allows checking OpenAI API spending directly from the server.
 * Can be queried by Claude or admin to monitor costs.
 * 
 * Created: Feb 1, 2026
 */

import { Router, Request, Response } from 'express';

const router = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY || 'po-admin-2024';

interface UsageData {
  totalSpent: number;
  dailyBreakdown: Array<{
    date: string;
    cost: number;
    requests: number;
  }>;
  currentMonth: {
    totalCost: number;
    startDate: string;
    endDate: string;
  };
  byModel: Record<string, {
    cost: number;
    requests: number;
    tokens: number;
  }>;
}

/**
 * GET /api/usage/openai
 * 
 * Get OpenAI API usage and costs
 * Requires admin key for security
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
    // Get current date range (this month)
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    console.log(`[Usage] Fetching OpenAI usage from ${startStr} to ${endStr}`);

    // OpenAI Usage API - Get costs
    // Note: OpenAI's official usage endpoint
    const response = await fetch(
      `https://api.openai.com/v1/organization/costs?start_time=${Math.floor(startDate.getTime() / 1000)}&end_time=${Math.floor(endDate.getTime() / 1000)}&bucket_width=1d`,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // Try alternative: dashboard API (may require different auth)
      console.log('[Usage] Costs API failed, trying usage endpoint...');
      
      // Fallback: Use the billing/usage endpoint
      const usageResponse = await fetch(
        `https://api.openai.com/v1/usage?date=${startStr}`,
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      if (!usageResponse.ok) {
        const errorText = await usageResponse.text();
        console.error('[Usage] OpenAI API error:', usageResponse.status, errorText);
        
        // Return helpful message about checking manually
        res.json({
          error: 'OpenAI usage API requires Organization API key',
          message: 'Check usage manually at: https://platform.openai.com/usage',
          tip: 'The API key used for Realtime API may not have billing access',
          manualCheckUrl: 'https://platform.openai.com/usage',
          currentApiKeyPrefix: OPENAI_API_KEY?.substring(0, 10) + '...'
        });
        return;
      }

      const usageData = await usageResponse.json();
      res.json({
        source: 'usage_endpoint',
        data: usageData,
        checkFullDetails: 'https://platform.openai.com/usage'
      });
      return;
    }

    const data = await response.json();
    
    // Calculate totals
    let totalCost = 0;
    const dailyBreakdown: Array<{ date: string; cost: number }> = [];
    
    if (data.data) {
      for (const bucket of data.data) {
        const cost = bucket.results?.reduce((sum: number, r: any) => sum + (r.amount?.value || 0), 0) || 0;
        totalCost += cost;
        dailyBreakdown.push({
          date: new Date(bucket.start_time * 1000).toISOString().split('T')[0],
          cost: cost
        });
      }
    }

    res.json({
      success: true,
      currentMonth: {
        totalCost: totalCost,
        totalCostFormatted: `$${totalCost.toFixed(2)}`,
        startDate: startStr,
        endDate: endStr,
        daysElapsed: now.getDate(),
        projectedMonthly: totalCost > 0 ? `$${(totalCost / now.getDate() * 30).toFixed(2)}` : '$0.00'
      },
      dailyBreakdown: dailyBreakdown.slice(-7), // Last 7 days
      checkedAt: new Date().toISOString(),
      dashboardUrl: 'https://platform.openai.com/usage'
    });

  } catch (error: any) {
    console.error('[Usage] Error fetching usage:', error);
    res.status(500).json({ 
      error: 'Failed to fetch usage data',
      message: error.message,
      manualCheckUrl: 'https://platform.openai.com/usage'
    });
  }
});

/**
 * GET /api/usage/summary
 * 
 * Quick summary for Claude to check
 */
router.get('/summary', async (req: Request, res: Response) => {
  const adminKey = req.query.key || req.headers['x-admin-key'];
  
  if (adminKey !== ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json({
    message: 'OpenAI Usage Summary',
    checkManually: 'https://platform.openai.com/usage',
    tip: 'Perse reported ~$0.09 spent as of Feb 1, 2026',
    estimatedCostPerMinute: '$0.30-0.60 (with vision)',
    costBreakdown: {
      audioInput: '$0.06/min',
      audioOutput: '$0.24/min', 
      vision: '$0.01-0.05/frame'
    },
    recommendation: 'Add spending alerts in OpenAI dashboard at Settings > Limits'
  });
});

/**
 * GET /api/usage/redi
 * 
 * Redi-specific usage tracking (local tracking)
 */
router.get('/redi', async (req: Request, res: Response) => {
  const adminKey = req.query.key || req.headers['x-admin-key'];
  
  if (adminKey !== ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // This would connect to local usage tracking
  // For now, return guidance
  res.json({
    message: 'Redi Usage Tracking',
    note: 'Local usage tracking not yet implemented',
    openaiUsage: 'https://platform.openai.com/usage',
    recommendation: 'Set up OpenAI spending limits at https://platform.openai.com/account/limits',
    v9Benefits: {
      estimatedCost: '$0.07-0.09/min',
      savings: '70-85% vs current OpenAI Realtime',
      status: 'In development'
    }
  });
});

export default router;
