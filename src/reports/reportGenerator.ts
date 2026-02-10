/**
 * Report Generator — Professional progress reports
 * ==================================================
 * Generates health, academic, fitness, professional, and custom reports
 * from accumulated memory and session data.
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

const REPORT_TEMPLATES: Record<string, { title: string; systemPrompt: string; categories: string[] }> = {
  health: {
    title: 'Health & Wellness Report',
    systemPrompt: `Generate a professional health/wellness progress report. Include: sleep patterns, stress levels, exercise frequency, mood trends, medication adherence mentions, notable health events. Format with clear sections and data points. Be factual, not diagnostic.`,
    categories: ['sleep', 'stress', 'exercise', 'mood', 'medication', 'health-events'],
  },
  academic: {
    title: 'Academic Progress Report',
    systemPrompt: `Generate an academic progress report. Include: study sessions, topics covered, weak areas identified, practice test scores, study time patterns, comprehension improvements. Format for sharing with tutors or counselors.`,
    categories: ['study-sessions', 'topics', 'weak-areas', 'scores', 'study-patterns'],
  },
  fitness: {
    title: 'Fitness Progress Report',
    systemPrompt: `Generate a fitness progress report. Include: workout frequency, exercises performed, form feedback from vision sessions, progress notes, consistency patterns. Format for sharing with coaches or trainers.`,
    categories: ['workouts', 'exercises', 'form-feedback', 'progress', 'consistency'],
  },
  professional: {
    title: 'Professional Development Report',
    systemPrompt: `Generate a professional development report. Include: project progress, skills practiced, presentation feedback, goal tracking, productivity patterns. Format for sharing with mentors or coaches.`,
    categories: ['projects', 'skills', 'feedback', 'goals', 'productivity'],
  },
  custom: {
    title: 'Custom Report',
    systemPrompt: `Generate a progress report based on the user's specified categories. Be thorough but concise. Use data points where available.`,
    categories: [],
  },
};

// POST /api/reports/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { userId, reportType, periodDays, recipientName, recipientRole, includeCategories } = req.body;
    if (!userId || !reportType) {
      return res.status(400).json({ error: 'userId and reportType required' });
    }

    const template = REPORT_TEMPLATES[reportType];
    if (!template) {
      return res.status(400).json({ error: `Invalid reportType. Valid: ${Object.keys(REPORT_TEMPLATES).join(', ')}` });
    }

    const db = getSupabase();
    const days = periodDays || 30;

    // Gather data sources
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [memoryResult, usageResult] = await Promise.all([
      db.from('redi_tiered_memory').select('*').eq('user_id', userId).single(),
      db.from('redi_usage').select('*').eq('user_id', userId).gte('start_time', since),
    ]);

    const memoryData = memoryResult.data;
    const usageData = usageResult.data || [];

    // Build context for report generation
    const contextParts = [
      `Report period: last ${days} days`,
      `Recipient: ${recipientName || 'Not specified'} (${recipientRole || 'Not specified'})`,
      `Total sessions in period: ${usageData.length}`,
    ];

    if (memoryData) {
      if (memoryData.layer4_personal_profile) contextParts.push(`Personal profile: ${memoryData.layer4_personal_profile}`);
      if (memoryData.layer3_weekly_patterns) contextParts.push(`Weekly patterns: ${memoryData.layer3_weekly_patterns}`);
      if (memoryData.layer2_session_context) contextParts.push(`Recent context: ${memoryData.layer2_session_context}`);
    }

    // Generate report via Claude
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
        system: template.systemPrompt,
        messages: [{
          role: 'user',
          content: `Generate a ${template.title} for the following user data:\n\n${contextParts.join('\n\n')}\n\nCategories to include: ${(includeCategories || template.categories).join(', ')}\n\nFormat as structured JSON with sections: title, period, sections (array of { heading, content, dataPoints }), summary.`,
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: `Report generation failed: ${err}` });
    }

    const aiData = (await response.json()) as any;
    const reportContent = aiData.content?.[0]?.text || '';

    let parsedReport: any;
    try {
      parsedReport = JSON.parse(reportContent);
    } catch {
      parsedReport = { rawContent: reportContent };
    }

    // Store report
    const { data: saved, error: saveError } = await db.from('redi_reports').insert({
      user_id: userId,
      report_type: reportType,
      period_days: days,
      recipient_name: recipientName || null,
      recipient_role: recipientRole || null,
      content: parsedReport,
    }).select().single();

    if (saveError) {
      return res.status(500).json({ error: saveError.message });
    }

    res.json({ reportId: saved.id, report: parsedReport });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:userId/list
router.get('/:userId/list', async (req: Request, res: Response) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('redi_reports')
      .select('id, report_type, period_days, recipient_name, recipient_role, created_at')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ reports: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:reportId/detail
router.get('/:reportId/detail', async (req: Request, res: Response) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('redi_reports')
      .select('*')
      .eq('id', req.params.reportId)
      .single();

    if (error) return res.status(404).json({ error: 'Report not found' });
    res.json({ report: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
