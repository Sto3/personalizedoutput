/**
 * Memory Service — Server-side persistent memory for Redi
 * =======================================================
 * Handles Layer 5 (cross-session cumulative summary) via Supabase.
 * iOS handles Layers 1-4 on-device.
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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required');
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

// Merge memory using Claude Haiku
async function mergeMemory(existing: string, newSessionSummary: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: 'You are a memory manager. Merge this existing user profile with new session information. Keep the most important facts, preferences, ongoing projects, and relationships. Remove outdated info. Stay under 2000 words. Output only the merged summary.',
      messages: [
        {
          role: 'user',
          content: `EXISTING MEMORY:\n${existing || '(empty — first session)'}\n\nNEW SESSION SUMMARY:\n${newSessionSummary}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic merge failed: ${response.status} ${err}`);
  }

  const data = (await response.json()) as any;
  return data.content?.[0]?.text || existing;
}

// GET /api/memory/:userId — fetch memory
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('redi_user_memory')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      userId: req.params.userId,
      memorySummary: data?.memory_summary || '',
      memoryVersion: data?.memory_version || 0,
      updatedAt: data?.updated_at || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/memory/:userId/merge — merge new session data
router.post('/:userId/merge', async (req: Request, res: Response) => {
  try {
    const { sessionSummary } = req.body;
    if (!sessionSummary) {
      return res.status(400).json({ error: 'sessionSummary required' });
    }

    const db = getSupabase();
    const { data: existing } = await db
      .from('redi_user_memory')
      .select('memory_summary, memory_version')
      .eq('user_id', req.params.userId)
      .single();

    const merged = await mergeMemory(existing?.memory_summary || '', sessionSummary);
    const newVersion = (existing?.memory_version || 0) + 1;

    const { error } = await db.from('redi_user_memory').upsert({
      user_id: req.params.userId,
      memory_summary: merged,
      memory_version: newVersion,
      updated_at: new Date().toISOString(),
    });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ userId: req.params.userId, memoryVersion: newVersion, wordCount: merged.split(/\s+/).length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/memory/:userId — delete all memory
router.delete('/:userId', async (req: Request, res: Response) => {
  try {
    const db = getSupabase();
    await db.from('redi_user_memory').delete().eq('user_id', req.params.userId);
    await db.from('redi_tiered_memory').delete().eq('user_id', req.params.userId);
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/memory/:userId/export — export memory as JSON
router.get('/:userId/export', async (req: Request, res: Response) => {
  try {
    const db = getSupabase();
    const { data: memory } = await db
      .from('redi_user_memory')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    const { data: tiered } = await db
      .from('redi_tiered_memory')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    res.json({
      userId: req.params.userId,
      exportedAt: new Date().toISOString(),
      cumulativeMemory: memory || null,
      tieredMemory: tiered || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
