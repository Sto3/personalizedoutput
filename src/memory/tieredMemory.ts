/**
 * Tiered Memory — 5-Layer Memory System
 * =======================================
 * L1: Working Memory (session, ephemeral — handled client-side)
 * L2: Session Context (last 3-5 sessions, 500 words)
 * L3: Weekly Patterns (behavioral, 300 words)
 * L4: Personal Profile (stable facts, 500 words)
 * L5: Life Milestones (major events, 200 words)
 */

import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

const LAYER_WORD_BUDGETS: Record<number, number> = {
  2: 500,
  3: 300,
  4: 500,
  5: 200,
};

const LAYER_COLUMNS: Record<number, string> = {
  2: 'layer2_session_context',
  3: 'layer3_weekly_patterns',
  4: 'layer4_personal_profile',
  5: 'layer5_life_milestones',
};

async function callHaiku(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) throw new Error(`Haiku call failed: ${response.status}`);
  const data = (await response.json()) as any;
  return data.content?.[0]?.text || '';
}

// Auto-promote facts mentioned 3+ times to Layer 4
async function checkPromotions(userId: string): Promise<void> {
  const db = getSupabase();
  const { data } = await db
    .from('redi_tiered_memory')
    .select('fact_frequency, layer4_personal_profile')
    .eq('user_id', userId)
    .single();

  if (!data?.fact_frequency) return;

  const freq = data.fact_frequency as Record<string, number>;
  const promotable = Object.entries(freq).filter(([_, count]) => count >= 3);

  if (promotable.length === 0) return;

  const factsToPromote = promotable.map(([fact]) => fact).join('\n');
  const existing = data.layer4_personal_profile || '';

  const merged = await callHaiku(
    `You are a memory organizer. Add these frequently mentioned facts to the user's personal profile. Keep it under ${LAYER_WORD_BUDGETS[4]} words. Output only the updated profile.`,
    `EXISTING PROFILE:\n${existing}\n\nFACTS TO ADD:\n${factsToPromote}`,
  );

  // Remove promoted facts from frequency tracker
  const updatedFreq = { ...freq };
  promotable.forEach(([fact]) => delete updatedFreq[fact]);

  await db.from('redi_tiered_memory').upsert({
    user_id: userId,
    layer4_personal_profile: merged,
    fact_frequency: updatedFreq,
    updated_at: new Date().toISOString(),
  });
}

// Detect emotional significance for Layer 5 promotion
async function checkEmotionalPromotion(userId: string, sessionSummary: string): Promise<void> {
  const db = getSupabase();

  const isSignificant = await callHaiku(
    'Determine if this session summary contains a major life event (graduation, new job, marriage, birth, loss, major move, big achievement). Reply only YES or NO.',
    sessionSummary,
  );

  if (!isSignificant.toUpperCase().includes('YES')) return;

  const { data } = await db
    .from('redi_tiered_memory')
    .select('layer5_life_milestones')
    .eq('user_id', userId)
    .single();

  const existing = data?.layer5_life_milestones || '';
  const merged = await callHaiku(
    `You are a memory organizer. Add this life milestone to the user's milestone record. Keep it under ${LAYER_WORD_BUDGETS[5]} words. Output only the updated milestones.`,
    `EXISTING MILESTONES:\n${existing}\n\nNEW EVENT:\n${sessionSummary}`,
  );

  await db.from('redi_tiered_memory').upsert({
    user_id: userId,
    layer5_life_milestones: merged,
    updated_at: new Date().toISOString(),
  });
}

// Build combined memory context for system prompt injection (Layers 2-5)
export async function buildMemoryContext(userId: string): Promise<string> {
  const db = getSupabase();
  const { data } = await db
    .from('redi_tiered_memory')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!data) return '';

  const parts: string[] = [];
  if (data.layer4_personal_profile) parts.push(`[Profile] ${data.layer4_personal_profile}`);
  if (data.layer5_life_milestones) parts.push(`[Milestones] ${data.layer5_life_milestones}`);
  if (data.layer3_weekly_patterns) parts.push(`[Patterns] ${data.layer3_weekly_patterns}`);
  if (data.layer2_session_context) parts.push(`[Recent] ${data.layer2_session_context}`);

  return parts.join('\n\n');
}

// GET /api/memory/:userId/layers — get all 5 layers
router.get('/:userId/layers', async (req: Request, res: Response) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('redi_tiered_memory')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      userId: req.params.userId,
      layers: {
        1: { name: 'Working Memory', content: '(ephemeral — current session only)', budget: 'unlimited' },
        2: { name: 'Session Context', content: data?.layer2_session_context || '', budget: LAYER_WORD_BUDGETS[2] },
        3: { name: 'Weekly Patterns', content: data?.layer3_weekly_patterns || '', budget: LAYER_WORD_BUDGETS[3] },
        4: { name: 'Personal Profile', content: data?.layer4_personal_profile || '', budget: LAYER_WORD_BUDGETS[4] },
        5: { name: 'Life Milestones', content: data?.layer5_life_milestones || '', budget: LAYER_WORD_BUDGETS[5] },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/memory/:userId/promote — manually promote a fact
router.post('/:userId/promote', async (req: Request, res: Response) => {
  try {
    const { fact, targetLayer } = req.body;
    if (!fact || !targetLayer || targetLayer < 3 || targetLayer > 5) {
      return res.status(400).json({ error: 'fact and targetLayer (3-5) required' });
    }

    const db = getSupabase();
    const col = LAYER_COLUMNS[targetLayer];
    const { data } = await db
      .from('redi_tiered_memory')
      .select(col)
      .eq('user_id', req.params.userId)
      .single();

    const existing = data?.[col] || '';
    const merged = await callHaiku(
      `Add this fact to the memory layer. Keep under ${LAYER_WORD_BUDGETS[targetLayer]} words. Output only the updated content.`,
      `EXISTING:\n${existing}\n\nADD:\n${fact}`,
    );

    await db.from('redi_tiered_memory').upsert({
      user_id: req.params.userId,
      [col]: merged,
      updated_at: new Date().toISOString(),
    });

    res.json({ promoted: true, layer: targetLayer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/memory/:userId/layer/:layerNum — edit a specific layer
router.put('/:userId/layer/:layerNum', async (req: Request, res: Response) => {
  try {
    const layerNum = parseInt(req.params.layerNum);
    if (layerNum < 2 || layerNum > 5) {
      return res.status(400).json({ error: 'layerNum must be 2-5' });
    }

    const { content } = req.body;
    if (content === undefined) {
      return res.status(400).json({ error: 'content required' });
    }

    const db = getSupabase();
    const col = LAYER_COLUMNS[layerNum];

    await db.from('redi_tiered_memory').upsert({
      user_id: req.params.userId,
      [col]: content,
      updated_at: new Date().toISOString(),
    });

    res.json({ updated: true, layer: layerNum });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/memory/:userId/session-end — process end-of-session data
router.post('/:userId/session-end', async (req: Request, res: Response) => {
  try {
    const { sessionSummary, detectedFacts } = req.body;
    if (!sessionSummary) {
      return res.status(400).json({ error: 'sessionSummary required' });
    }

    const db = getSupabase();
    const userId = req.params.userId;

    // Update Layer 2 (session context)
    const { data: existing } = await db
      .from('redi_tiered_memory')
      .select('layer2_session_context, fact_frequency')
      .eq('user_id', userId)
      .single();

    const updatedL2 = await callHaiku(
      `Summarize the last 3-5 sessions into a context summary. Keep under ${LAYER_WORD_BUDGETS[2]} words. Output only the summary.`,
      `PREVIOUS CONTEXT:\n${existing?.layer2_session_context || ''}\n\nLATEST SESSION:\n${sessionSummary}`,
    );

    // Track fact frequency for auto-promotion
    const freq = (existing?.fact_frequency || {}) as Record<string, number>;
    if (detectedFacts && Array.isArray(detectedFacts)) {
      for (const fact of detectedFacts) {
        freq[fact] = (freq[fact] || 0) + 1;
      }
    }

    await db.from('redi_tiered_memory').upsert({
      user_id: userId,
      layer2_session_context: updatedL2,
      fact_frequency: freq,
      updated_at: new Date().toISOString(),
    });

    // Check for auto-promotions
    await checkPromotions(userId);
    await checkEmotionalPromotion(userId, sessionSummary);

    res.json({ processed: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
