/**
 * Proactive Suggestions Engine
 * =============================
 * Cross-references memory, calendar, weather, email, location, time
 * to generate contextual, prioritized suggestions.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export interface Suggestion {
  type: string;
  priority: number; // 0-1, higher = more urgent
  title: string;
  body: string;
  actionType: 'nudge' | 'reminder' | 'alert' | 'prep' | 'social';
  suggestedAction?: string;
  confidence: number;
}

// GET /api/intelligence/suggestions/:userId
router.get('/suggestions/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const db = getSupabase();

    // Gather all available data
    const [memoryResult, usageResult] = await Promise.all([
      db.from('redi_tiered_memory').select('*').eq('user_id', userId).single(),
      db.from('redi_usage')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('start_time', { ascending: false })
        .limit(20),
    ]);

    const memory = memoryResult.data;
    const recentUsage = usageResult.data || [];

    // Build context for suggestion generation
    const contextParts: string[] = [];
    const now = new Date();
    contextParts.push(`Current time: ${now.toISOString()}, ${now.toLocaleDateString('en-US', { weekday: 'long' })}`);

    if (memory?.layer4_personal_profile) contextParts.push(`User profile: ${memory.layer4_personal_profile}`);
    if (memory?.layer3_weekly_patterns) contextParts.push(`Weekly patterns: ${memory.layer3_weekly_patterns}`);
    if (memory?.layer2_session_context) contextParts.push(`Recent context: ${memory.layer2_session_context}`);
    if (memory?.layer5_life_milestones) contextParts.push(`Life milestones: ${memory.layer5_life_milestones}`);

    contextParts.push(`Sessions in last 7 days: ${recentUsage.length}`);

    if (recentUsage.length === 0) {
      contextParts.push('Note: User has not used Redi in the past week');
    }

    // Optional context from query params
    const lat = req.query.lat as string;
    const lon = req.query.lon as string;
    const weather = req.query.weather as string;
    const calendar = req.query.calendar as string;

    if (lat && lon) contextParts.push(`Location: ${lat}, ${lon}`);
    if (weather) contextParts.push(`Weather: ${weather}`);
    if (calendar) contextParts.push(`Upcoming calendar: ${calendar}`);

    // Generate suggestions via Claude
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
        system: `You are Redi's proactive intelligence engine. Based on the user's data, generate 2-5 contextual suggestions. Each should be genuinely helpful, not annoying. Focus on:
- Schedule-aware reminders
- Social nudges (haven't contacted someone in a while)
- Health/wellness patterns
- Preparation for upcoming events
- Weather-aware suggestions

Output ONLY valid JSON array of objects with: type (schedule/social/health/weather/prep), priority (0-1), title (short), body (1-2 sentences), actionType (nudge/reminder/alert/prep/social), suggestedAction (optional), confidence (0-1).`,
        messages: [{
          role: 'user',
          content: contextParts.join('\n\n'),
        }],
      }),
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Suggestion generation failed' });
    }

    const aiData = (await response.json()) as any;
    const text = aiData.content?.[0]?.text || '[]';

    let suggestions: Suggestion[];
    try {
      suggestions = JSON.parse(text);
    } catch {
      // Try to extract JSON from the response
      const match = text.match(/\[[\s\S]*\]/);
      suggestions = match ? JSON.parse(match[0]) : [];
    }

    // Sort by priority
    suggestions.sort((a, b) => b.priority - a.priority);

    res.json({ suggestions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
