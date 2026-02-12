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

// Categories of facts to extract from every session
// The memory merge (Claude Haiku) should be instructed to look for ALL of these
const EXTRACTION_CATEGORIES = {
  // Identity
  name: 'User\'s name, preferred name, nicknames',
  family: 'Names and relationships of family members (spouse, kids, parents, siblings)',
  friends: 'Names and context of friends mentioned',
  coworkers: 'Names, roles, and dynamics of coworkers and bosses',
  pets: 'Pet names, breeds, health',

  // Important dates
  birthday: 'User\'s birthday',
  anniversary: 'Wedding anniversary, relationship milestones',
  family_dates: 'Family members\' birthdays, kids\' school events, graduations',

  // Routine & schedule
  work_schedule: 'Work hours, commute, meeting patterns',
  weekly_routine: 'Gym days, church schedule, regular commitments',
  recurring_events: 'Book club, poker night, therapy sessions, tutoring',

  // Preferences
  food_preferences: 'Favorite foods, restaurants, allergies, dietary restrictions',
  music_taste: 'Favorite artists, genres, playlists',
  entertainment: 'Shows, movies, books, podcasts they enjoy',
  communication_style: 'How they prefer to communicate — direct, detailed, casual, formal',
  humor_style: 'Do they appreciate jokes? Sarcasm? Puns? Or prefer straight talk?',

  // Health & wellness
  health_conditions: 'Chronic conditions, medications, doctor appointments',
  fitness_goals: 'Workout routine, fitness targets, sports',
  mental_health: 'Stress triggers, therapy, coping strategies (handle with extreme care)',
  sleep_patterns: 'Sleep issues, bedtime routine',

  // Life goals & passions
  career_goals: 'Job aspirations, promotions, career changes',
  financial_goals: 'Savings targets, debts, investments, budgets',
  passions: 'Hobbies, interests they get excited about, creative pursuits',
  learning: 'What they\'re studying, courses, skills they want to develop',
  dreams: 'Long-term life dreams, bucket list items',

  // Current concerns
  active_problems: 'Problems they\'re currently working through',
  stressors: 'What\'s causing them stress right now',
  upcoming_decisions: 'Decisions they\'re weighing',

  // Relationship with Redi
  running_jokes: 'Inside jokes or recurring humor between user and Redi',
  shared_history: 'Significant moments in their Redi journey',
  preferences_for_redi: 'How they want Redi to behave, what they like/dislike about interactions',
};

const MEMORY_MERGE_PROMPT = `You are extracting and updating a person's memory profile from a conversation transcript.

CRITICAL INSTRUCTIONS:
1. Extract EVERY personal fact mentioned, no matter how small. Their dog's name matters. Their favorite coffee order matters.
2. Update existing facts if new information contradicts or adds to them.
3. Note emotional context: what excited them, what stressed them, what they avoided.
4. Track communication style observations: are they getting more comfortable? Do they prefer brevity?
5. Identify passions: what topics made them talk more, get animated, ask follow-up questions?
6. Note unresolved problems: what issues are still open from this session?
7. Flag matters of importance: anything time-sensitive, health-related, or emotionally significant.

CATEGORIES TO EXTRACT FROM:
${JSON.stringify(EXTRACTION_CATEGORIES, null, 2)}

EXISTING MEMORY:
{existingMemory}

NEW SESSION TRANSCRIPT:
{transcript}

OUTPUT FORMAT:
Return the complete updated memory as a single cohesive text (max 2000 words). Organize naturally by theme. Mark any NEW facts discovered in this session with [NEW]. Mark any UPDATED facts with [UPDATED]. Include a "Current Concerns" section at the end with active problems and upcoming events.`;

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

    // Use enhanced extraction prompt for richer memory capture
    const enrichedPrompt = MEMORY_MERGE_PROMPT
      .replace('{existingMemory}', existing?.layer2_session_context || '(empty)')
      .replace('{transcript}', sessionSummary);

    const updatedL2 = await callHaiku(
      `Summarize the last 3-5 sessions into a context summary using deep extraction. Keep under ${LAYER_WORD_BUDGETS[2]} words. Output only the summary.`,
      enrichedPrompt,
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

// Update a specific field within a memory layer
async function updateLayerField(userId: string, layerNum: number, fieldName: string, value: string): Promise<void> {
  const db = getSupabase();
  const col = LAYER_COLUMNS[layerNum];
  if (!col) return;

  const { data } = await db
    .from('redi_tiered_memory')
    .select(col)
    .eq('user_id', userId)
    .single();

  const existing = data?.[col] || '';
  // Append or replace the field marker
  const fieldMarker = `[${fieldName}]`;
  const fieldRegex = new RegExp(`\\[${fieldName}\\]\\s*[\\s\\S]*?(?=\\[|$)`, 'i');

  let updated: string;
  if (fieldRegex.test(existing)) {
    updated = existing.replace(fieldRegex, `${fieldMarker} ${value}\n`);
  } else {
    updated = existing + `\n${fieldMarker} ${value}\n`;
  }

  await db.from('redi_tiered_memory').upsert({
    user_id: userId,
    [col]: updated.trim(),
    updated_at: new Date().toISOString(),
  });
}

// After every 5 sessions, analyze the user's communication style
// and store it in Layer 4 (Personal Profile) for Redi to adapt to
export async function analyzeCommStyle(userId: string, recentTranscripts: string[]): Promise<string> {
  const prompt = `Analyze these conversation transcripts and describe this person's communication style in 100 words or less. Focus on:
- Formality level (casual/professional/mixed)
- Preferred response length (brief/detailed/depends on topic)
- Humor appreciation (jokes welcome/straight talk preferred)
- Decision-making style (quick/deliberate/collaborative)
- Emotional expression (open/reserved/context-dependent)
- Topics that energize them vs topics they avoid

Transcripts:
${recentTranscripts.join('\n---\n')}

Respond with ONLY the style description, no preamble.`;

  const response = await callHaiku(
    'You are a communication style analyzer. Output only the style description.',
    prompt,
  );

  // Store in Layer 4 (Personal Profile) under communication_style
  await updateLayerField(userId, 4, 'communication_style', response);

  return response;
}

export { EXTRACTION_CATEGORIES };

export default router;
