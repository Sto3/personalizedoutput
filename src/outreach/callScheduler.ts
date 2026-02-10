/**
 * Call Scheduler — Proactive outreach scheduling
 * ===============================================
 * Manages time-based, event-based, and pattern-based triggers.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function isInQuietHours(quietStart: string, quietEnd: string): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const [startH, startM] = quietStart.split(':').map(Number);
  const [endH, endM] = quietEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes > endMinutes) {
    // Overnight quiet hours (e.g., 22:00 - 08:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// GET /api/outreach/schedule/:userId
router.get('/schedule/:userId', async (req: Request, res: Response) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('redi_outreach_schedule')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ schedules: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/outreach/schedule/:userId — update/create schedule
router.put('/schedule/:userId', async (req: Request, res: Response) => {
  try {
    const { triggerType, triggerConfig, channel, enabled, quietHoursStart, quietHoursEnd, maxFrequency } = req.body;

    const db = getSupabase();
    const { data, error } = await db.from('redi_outreach_schedule').upsert({
      user_id: req.params.userId,
      trigger_type: triggerType || 'time_based',
      trigger_config: triggerConfig || {},
      channel: channel || 'push',
      enabled: enabled !== false,
      quiet_hours_start: quietHoursStart || '22:00',
      quiet_hours_end: quietHoursEnd || '08:00',
      max_frequency: maxFrequency || 'daily',
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ schedule: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach/trigger — manually trigger outreach (testing)
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const { userId, channel, message } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Check quiet hours
    const db = getSupabase();
    const { data: schedules } = await db
      .from('redi_outreach_schedule')
      .select('quiet_hours_start, quiet_hours_end')
      .eq('user_id', userId)
      .limit(1)
      .single();

    const quietStart = schedules?.quiet_hours_start || '22:00';
    const quietEnd = schedules?.quiet_hours_end || '08:00';

    if (isInQuietHours(quietStart, quietEnd)) {
      return res.json({ triggered: false, reason: 'quiet_hours', quietStart, quietEnd });
    }

    // Log the trigger
    await db.from('redi_outreach_log').insert({
      user_id: userId,
      channel: channel || 'push',
      title: 'Manual trigger',
      body: message || 'Redi check-in',
      metadata: { manual: true },
    });

    res.json({ triggered: true, channel: channel || 'push', message: message || 'Redi check-in' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
