/**
 * Session Types — Specialized session configurations
 * ===================================================
 * Each type modifies the system prompt and enables specific behaviors.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export interface SessionType {
  id: string;
  name: string;
  description: string;
  systemPromptAddition: string;
  visionEnabled: boolean;
  preferredBrain: 'fast' | 'voice' | 'deep' | 'auto';
  features: string[];
}

export const SESSION_TYPES: Record<string, SessionType> = {
  learn: {
    id: 'learn',
    name: 'Learn with Redi',
    description: 'Patient teacher that breaks concepts into steps and uses analogies.',
    systemPromptAddition: `You are a patient, encouraging teacher. Break concepts into steps. Use analogies. Check understanding before moving on. Celebrate progress. If the user is practicing an instrument, art, or physical skill, use the camera to watch and give feedback.`,
    visionEnabled: true,
    preferredBrain: 'deep',
    features: ['vision', 'step-by-step', 'analogies', 'progress-tracking'],
  },

  study: {
    id: 'study',
    name: 'Study with Redi',
    description: 'Expert tutor for test prep (LSAT/MCAT/GRE/bar) with Socratic method.',
    systemPromptAddition: `You are an expert tutor. For test prep (LSAT, MCAT, GRE, bar exam), use the Socratic method. Track weak areas across sessions. Generate practice questions. Explain wrong answers thoroughly. Don't just give answers — guide the student to understanding.`,
    visionEnabled: true,
    preferredBrain: 'deep',
    features: ['socratic-method', 'practice-questions', 'weak-area-tracking', 'deep-explanation'],
  },

  cook: {
    id: 'cook',
    name: 'Cook with Redi',
    description: 'Hands-free kitchen companion with step-by-step guidance and allergy monitoring.',
    systemPromptAddition: `You are a hands-free kitchen companion. Give one step at a time. Wait for user to say 'next' or 'done'. Monitor for allergy ingredients if user has allergies in memory. Keep it fun and encouraging. If you can see the food through the camera, comment on doneness, color, and technique.`,
    visionEnabled: true,
    preferredBrain: 'fast',
    features: ['hands-free', 'step-by-step', 'allergy-monitoring', 'vision-doneness-check'],
  },

  practice: {
    id: 'practice',
    name: 'Practice with Redi',
    description: 'Coach that watches form/technique through camera and gives corrections.',
    systemPromptAddition: `You are a coach. Watch the user's form and technique through the camera. Give specific, actionable corrections. Be encouraging but honest. Reference improvements from past sessions. Corrections should be precise: "lift your elbow higher", "bend your knees more", "keep your back straight".`,
    visionEnabled: true,
    preferredBrain: 'fast',
    features: ['vision-form-analysis', 'real-time-corrections', 'progress-tracking', 'external-camera-support'],
  },

  solve: {
    id: 'solve',
    name: 'Solve with Redi',
    description: 'Point camera at a problem and walk through the solution step by step.',
    systemPromptAddition: `The user is pointing their camera at a problem (math equation, circuit diagram, code error, broken appliance, etc.). Analyze what you see and walk them through the solution step by step. Be thorough but clear. For math: show your work. For code: explain the error and the fix. For physical problems: describe what you see and suggest next steps.`,
    visionEnabled: true,
    preferredBrain: 'deep',
    features: ['vision-problem-analysis', 'step-by-step-solution', 'multi-domain'],
  },

  reflect: {
    id: 'reflect',
    name: 'Reflect with Redi',
    description: 'End-of-day reflection and emotional processing companion.',
    systemPromptAddition: `You are Redi in reflection mode. Help the user process their day, celebrate wins, learn from challenges, and set intentions for tomorrow. Be warm, empathetic, and genuinely curious. Never diagnose or claim to be a therapist.`,
    visionEnabled: false,
    preferredBrain: 'voice',
    features: ['reflection', 'gratitude', 'emotional-support', 'intention-setting'],
  },

  general: {
    id: 'general',
    name: 'Chat with Redi',
    description: 'General-purpose assistant with vision and voice.',
    systemPromptAddition: '',
    visionEnabled: true,
    preferredBrain: 'auto',
    features: ['vision', 'voice', 'general-knowledge'],
  },
};

// GET /api/sessions/types — list all session types
router.get('/types', (req: Request, res: Response) => {
  const types = Object.values(SESSION_TYPES).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    visionEnabled: t.visionEnabled,
    features: t.features,
  }));

  res.json({ sessionTypes: types });
});

// GET /api/sessions/types/:typeId/prompt — get full prompt for a session type
router.get('/types/:typeId/prompt', (req: Request, res: Response) => {
  const sessionType = SESSION_TYPES[req.params.typeId];
  if (!sessionType) {
    return res.status(404).json({ error: 'Session type not found' });
  }

  res.json({
    id: sessionType.id,
    systemPromptAddition: sessionType.systemPromptAddition,
    preferredBrain: sessionType.preferredBrain,
    visionEnabled: sessionType.visionEnabled,
  });
});

// GET /api/study/:userId/progress — get study progress
router.get('/study/:userId/progress', async (req: Request, res: Response) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('redi_study_progress')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('last_attempt', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ progress: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/study/:userId/score — record a study score
router.post('/study/:userId/score', async (req: Request, res: Response) => {
  try {
    const { topic, subtopic, score, weakAreas } = req.body;
    if (!topic || score === undefined) {
      return res.status(400).json({ error: 'topic and score required' });
    }

    const db = getSupabase();

    // Upsert: increment attempts, update score
    const { data: existing } = await db
      .from('redi_study_progress')
      .select('*')
      .eq('user_id', req.params.userId)
      .eq('topic', topic)
      .eq('subtopic', subtopic || '')
      .single();

    if (existing) {
      await db
        .from('redi_study_progress')
        .update({
          score,
          attempts: existing.attempts + 1,
          last_attempt: new Date().toISOString(),
          weak_areas: weakAreas || existing.weak_areas,
        })
        .eq('id', existing.id);
    } else {
      await db.from('redi_study_progress').insert({
        user_id: req.params.userId,
        topic,
        subtopic: subtopic || '',
        score,
        attempts: 1,
        weak_areas: weakAreas || [],
      });
    }

    res.json({ recorded: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
