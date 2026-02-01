/**
 * OpenAI Usage API Endpoint
 * 
 * Allows checking OpenAI API usage/spending directly from the server.
 * Perse can ask Claude "how much have I spent on OpenAI?" and Claude
 * can call this endpoint to check.
 * 
 * Created: Feb 1, 2026
 */

import { Router, Request, Response } from 'express';

const router = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface UsageData {
  totalSpent: number;
  dailyBreakdown: Array<{
    date: string;
    spent: number;
    requests: number;
  }>;
  currentMonth: {
    spent: number;
    limit: number | null;
  };
}

/**
 * GET /api/usage/openai
 * 
 * Get OpenAI usage statistics
 * Note: OpenAI's usage API is limited - this fetches what's available
 */
router.get('/openai', async (req: Request, res: Response) => {
  if (!OPENAI_API_KEY) {
    res.status(503).json({ error: 'OpenAI API key not configured' });
    return;
  }

  try {
    // Get the current date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`[Usage] Fetching OpenAI usage from ${startDateStr} to ${endDateStr}`);

    // OpenAI Usage API endpoint
    const response = await fetch(
      `https://api.openai.com/v1/usage?start_date=${startDateStr}&end_date=${endDateStr}`,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Usage] OpenAI API error:', response.status, errorText);
      
      // If usage API fails, try the organization billing endpoint
      // Note: This requires organization-level API access
      res.status(response.status).json({ 
        error: 'Failed to fetch usage data',
        details: errorText,
        hint: 'Check usage manually at https://platform.openai.com/usage'
      });
      return;
    }

    const data = await response.json();
    
    // Calculate totals
    let totalCost = 0;
    const dailyBreakdown: Array<{ date: string; spent: number; requests: number }> = [];
    
    if (data.data) {
      // Process usage data
      const dailyMap = new Map<string, { spent: number; requests: number }>();
      
      for (const item of data.data) {
        const date = item.aggregation_timestamp 
          ? new Date(item.aggregation_timestamp * 1000).toISOString().split('T')[0]
          : 'unknown';
        
        // Calculate cost based on model and usage
        let itemCost = 0;
        if (item.n_context_tokens_total && item.n_generated_tokens_total) {
          // Rough cost estimate based on model
          const model = item.snapshot_id || '';
          if (model.includes('gpt-4')) {
            itemCost = (item.n_context_tokens_total * 0.00003) + (item.n_generated_tokens_total * 0.00006);
          } else if (model.includes('gpt-3.5')) {
            itemCost = (item.n_context_tokens_total * 0.0000015) + (item.n_generated_tokens_total * 0.000002);
          } else if (model.includes('whisper')) {
            itemCost = (item.n_context_tokens_total / 1000) * 0.006; // per minute approximation
          } else if (model.includes('realtime')) {
            // Realtime API pricing
            itemCost = (item.n_context_tokens_total * 0.00015) + (item.n_generated_tokens_total * 0.0006);
          }
        }
        
        totalCost += itemCost;
        
        const existing = dailyMap.get(date) || { spent: 0, requests: 0 };
        dailyMap.set(date, {
          spent: existing.spent + itemCost,
          requests: existing.requests + (item.n_requests || 1)
        });
      }
      
      // Convert to array and sort by date
      for (const [date, stats] of dailyMap) {
        dailyBreakdown.push({ date, ...stats });
      }
      dailyBreakdown.sort((a, b) => b.date.localeCompare(a.date));
    }

    res.json({
      success: true,
      period: {
        start: startDateStr,
        end: endDateStr
      },
      totalSpent: totalCost,
      totalSpentFormatted: `$${totalCost.toFixed(2)}`,
      dailyBreakdown: dailyBreakdown.slice(0, 7), // Last 7 days
      rawData: data,
      checkManually: 'https://platform.openai.com/usage',
      note: 'Cost estimates are approximate. Check OpenAI dashboard for exact billing.'
    });

  } catch (error) {
    console.error('[Usage] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch usage data',
      checkManually: 'https://platform.openai.com/usage'
    });
  }
});

/**
 * GET /api/usage/summary
 * 
 * Quick summary for Claude to read
 */
router.get('/summary', async (req: Request, res: Response) => {
  if (!OPENAI_API_KEY) {
    res.json({
      message: "OpenAI API key not configured. Check usage at https://platform.openai.com/usage"
    });
    return;
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const response = await fetch(
      `https://api.openai.com/v1/usage?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      res.json({
        message: `Could not fetch usage automatically. Check manually at https://platform.openai.com/usage`,
        status: response.status
      });
      return;
    }

    const data = await response.json();
    
    // Simple token count
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalRequests = 0;
    
    if (data.data) {
      for (const item of data.data) {
        totalInputTokens += item.n_context_tokens_total || 0;
        totalOutputTokens += item.n_generated_tokens_total || 0;
        totalRequests += item.n_requests || 0;
      }
    }

    // Rough cost estimate for Realtime API
    const estimatedCost = (totalInputTokens * 0.00015) + (totalOutputTokens * 0.0006);

    res.json({
      message: `Last 30 days: ~${totalRequests} requests, ~${Math.round(totalInputTokens/1000)}K input tokens, ~${Math.round(totalOutputTokens/1000)}K output tokens. Estimated cost: $${estimatedCost.toFixed(2)}. For exact billing, check https://platform.openai.com/usage`,
      totalRequests,
      totalInputTokens,
      totalOutputTokens,
      estimatedCost: `$${estimatedCost.toFixed(2)}`,
      checkExact: 'https://platform.openai.com/usage'
    });

  } catch (error) {
    res.json({
      message: `Error fetching usage. Check manually at https://platform.openai.com/usage`,
      error: String(error)
    });
  }
});

/**
 * GET /api/usage/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    configured: !!OPENAI_API_KEY,
    endpoints: ['/api/usage/openai', '/api/usage/summary']
  });
});

export default router;
