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

    // Check engagement nudge for habit building
    const engagementNudge = await checkEngagementNudge(userId);
    if (engagementNudge) {
      suggestions.push(engagementNudge);
    }

    // Check if user should be nudged to download their memory backup
    const backupStatus = await checkMemoryBackupNudge(userId);
    if (backupStatus.shouldNudge) {
      suggestions.push({
        type: 'memory_backup',
        priority: 0.5,
        title: 'Back up your Redi memory',
        body: backupStatus.lastBackupDate
          ? `It's been ${backupStatus.daysSinceBackup} days since your last memory backup. Want me to prepare a download? This way everything I know about you is safe even if something happens.`
          : `I've been learning a lot about you! Want me to create a backup of everything I remember? It's good to have a safe copy — just in case.`,
        actionType: 'nudge',
        suggestedAction: 'download_memory_backup',
        confidence: 0.8,
      });
    }

    // Sort by priority
    suggestions.sort((a, b) => b.priority - a.priority);

    res.json({ suggestions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Check if user should be nudged to download their memory backup
// Runs as part of the proactive suggestion engine

interface MemoryBackupStatus {
  lastBackupDate: Date | null;
  daysSinceBackup: number;
  shouldNudge: boolean;
}

async function checkMemoryBackupNudge(userId: string): Promise<MemoryBackupStatus> {
  const db = getSupabase();

  // Get last backup date from user record
  const { data } = await db
    .from('redi_users')
    .select('last_memory_backup')
    .eq('id', userId)
    .single();

  const lastBackup = data?.last_memory_backup ? new Date(data.last_memory_backup) : null;
  const daysSinceBackup = lastBackup
    ? Math.floor((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))
    : 999;  // Never backed up

  return {
    lastBackupDate: lastBackup,
    daysSinceBackup,
    shouldNudge: daysSinceBackup >= 90,  // ~quarterly
  };
}

// Engagement nudge — habit building for new users, tips for established users
async function checkEngagementNudge(userId: string): Promise<Suggestion | null> {
  const db = getSupabase();

  // Count total sessions
  const { count } = await db
    .from('redi_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const sessionCount = count || 0;

  // Phase 1: < 30 sessions — habit builders
  if (sessionCount < 30) {
    const habitPrompts = [
      { title: 'Say good morning to Redi', body: 'Start your day by telling Redi what\'s on your mind. It helps Redi learn your rhythm and priorities.' },
      { title: 'Show Redi what you\'re working on', body: 'Point your camera at anything — Redi can read documents, identify objects, and help you think through what you see.' },
      { title: 'Tell Redi about your week', body: 'The more Redi knows about your life, the better the help. Redi remembers everything you share — across sessions.' },
      { title: 'Ask Redi to prep you for a meeting', body: 'Tell Redi who you\'re meeting with and what it\'s about. Redi will help you think through talking points.' },
      { title: 'Think out loud with Redi', body: 'Got a decision to make? A problem you\'re stuck on? Just talk it through — Redi is a great sounding board.' },
    ];

    const prompt = habitPrompts[sessionCount % habitPrompts.length];

    return {
      type: 'engagement',
      priority: 0.6,
      title: prompt.title,
      body: prompt.body,
      actionType: 'nudge',
      suggestedAction: 'start_session',
      confidence: 0.9,
    };
  }

  // Phase 2: >= 30 sessions — "did you know" tips (less frequently)
  if (sessionCount >= 30 && sessionCount % 5 === 0) {
    const tips = [
      { title: 'Did you know? Redi can read your screen', body: 'Share your screen and Redi can help with anything visible — emails, code, documents.' },
      { title: 'Did you know? Redi generates reports', body: 'Ask Redi to write a progress report, meeting summary, or weekly recap for your boss or team.' },
      { title: 'Did you know? Redi works for teams', body: 'Create an organization and invite your team. Redi will learn your org\'s projects, culture, and goals.' },
      { title: 'Did you know? Redi joins meetings', body: 'Give Redi a Zoom, Teams, or Google Meet link — Redi will join, listen, and take notes for you.' },
      { title: 'Did you know? Redi searches the web', body: 'Ask Redi to look anything up — news, restaurants, prices, facts. Real-time search and summary.' },
    ];

    const tip = tips[Math.floor(sessionCount / 5) % tips.length];

    return {
      type: 'engagement_tip',
      priority: 0.3,
      title: tip.title,
      body: tip.body,
      actionType: 'nudge',
      confidence: 0.7,
    };
  }

  return null;
}

export default router;
