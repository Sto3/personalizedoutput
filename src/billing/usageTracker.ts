/**
 * Usage Tracker — PAYG credit system
 * ====================================
 * Tracks usage per session, manages credit balance.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// Credit consumption rates per minute
const CREDIT_RATES: Record<string, number> = {
  vision: 1.0,
  voice: 0.4,
  passive: 0.1,
};

// Credit packs
const CREDIT_PACKS: Record<number, { price: number; credits: number }> = {
  5: { price: 5, credits: 50 },
  15: { price: 15, credits: 160 },
  25: { price: 25, credits: 280 },
  50: { price: 50, credits: 600 },
};

// GET /api/billing/:userId/balance
router.get('/:userId/balance', async (req: Request, res: Response) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('redi_credits')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    const balance = data?.balance || 0;

    res.json({
      userId: req.params.userId,
      balance,
      lowBalance: balance <= 10,
      zeroBalance: balance <= 0,
      lifetimePurchased: data?.lifetime_purchased || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/billing/:userId/usage
router.get('/:userId/usage', async (req: Request, res: Response) => {
  try {
    const db = getSupabase();
    const from = req.query.from as string;
    const to = req.query.to as string;

    let query = db
      .from('redi_usage')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('start_time', { ascending: false });

    if (from) query = query.gte('start_time', from);
    if (to) query = query.lte('start_time', to);

    const { data, error } = await query.limit(100);

    if (error) return res.status(500).json({ error: error.message });

    const totalCredits = (data || []).reduce((sum, u) => sum + (u.credits_consumed || 0), 0);
    const totalSeconds = (data || []).reduce((sum, u) => sum + (u.duration_seconds || 0), 0);

    res.json({
      usage: data || [],
      summary: {
        sessions: data?.length || 0,
        totalMinutes: Math.round(totalSeconds / 60),
        totalCreditsUsed: Math.round(totalCredits * 100) / 100,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/:userId/purchase — record credit purchase
router.post('/:userId/purchase', async (req: Request, res: Response) => {
  try {
    const { amount, transactionId } = req.body;
    const pack = CREDIT_PACKS[amount];

    if (!pack) {
      return res.status(400).json({
        error: `Invalid amount. Valid packs: ${Object.entries(CREDIT_PACKS).map(([p, v]) => `$${p}=${v.credits}cr`).join(', ')}`,
      });
    }

    const db = getSupabase();
    const userId = req.params.userId;

    const { data: existing } = await db
      .from('redi_credits')
      .select('balance, lifetime_purchased')
      .eq('user_id', userId)
      .single();

    const newBalance = (existing?.balance || 0) + pack.credits;
    const newLifetime = (existing?.lifetime_purchased || 0) + pack.credits;

    await db.from('redi_credits').upsert({
      user_id: userId,
      balance: newBalance,
      lifetime_purchased: newLifetime,
      last_purchase: new Date().toISOString(),
    });

    res.json({
      balance: newBalance,
      creditsAdded: pack.credits,
      transactionId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/:userId/consume — consume credits (called by session)
router.post('/:userId/consume', async (req: Request, res: Response) => {
  try {
    const { sessionId, sessionType, durationSeconds, inputTokens, outputTokens, brainUsed } = req.body;
    const userId = req.params.userId;
    const db = getSupabase();

    const rate = CREDIT_RATES[sessionType] || CREDIT_RATES.voice;
    const minutes = durationSeconds / 60;
    const creditsConsumed = Math.round(minutes * rate * 100) / 100;

    // Deduct credits
    const { data: credits } = await db
      .from('redi_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    const currentBalance = credits?.balance || 0;
    if (currentBalance <= 0) {
      return res.status(402).json({ error: 'Insufficient credits', balance: 0 });
    }

    const newBalance = Math.max(0, currentBalance - creditsConsumed);
    await db.from('redi_credits').upsert({
      user_id: userId,
      balance: newBalance,
    });

    // Log usage
    await db.from('redi_usage').insert({
      user_id: userId,
      session_id: sessionId,
      session_type: sessionType || 'voice',
      duration_seconds: durationSeconds,
      input_tokens: inputTokens || 0,
      output_tokens: outputTokens || 0,
      brain_used: brainUsed || 'voice',
      credits_consumed: creditsConsumed,
    });

    res.json({
      creditsConsumed,
      balance: newBalance,
      lowBalance: newBalance <= 10,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/billing/:userId/estimate
router.get('/:userId/estimate', (req: Request, res: Response) => {
  const sessionType = req.query.type as string || 'voice';
  const minutes = parseInt(req.query.minutes as string) || 10;
  const rate = CREDIT_RATES[sessionType] || CREDIT_RATES.voice;

  res.json({
    sessionType,
    minutes,
    estimatedCredits: Math.round(minutes * rate * 100) / 100,
    rate: `${rate} credits/min`,
    packs: Object.entries(CREDIT_PACKS).map(([price, pack]) => ({
      price: `$${price}`,
      credits: pack.credits,
      estimatedMinutes: Math.round(pack.credits / rate),
    })),
  });
});

export default router;
