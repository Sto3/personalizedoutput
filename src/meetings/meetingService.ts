/**
 * Meeting Service — Redi attends meetings on behalf of user
 * ==========================================================
 * Dials in via Twilio, delivers authorized talking points,
 * takes notes, defers unauthorized questions.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || 'https://personalizedoutput.com';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function getTwilioAuth(): string {
  return 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
}

// POST /api/meetings/brief — pre-meeting briefing
router.post('/brief', async (req: Request, res: Response) => {
  try {
    const { userId, meetingId, agenda, talkingPoints, authorizedTopics, boundaries } = req.body;
    if (!userId || !meetingId) {
      return res.status(400).json({ error: 'userId and meetingId required' });
    }

    const db = getSupabase();
    const { data, error } = await db.from('redi_meeting_briefs').upsert({
      user_id: userId,
      meeting_id: meetingId,
      agenda: agenda || '',
      talking_points: talkingPoints || [],
      authorized_topics: authorizedTopics || [],
      boundaries: boundaries || '',
      status: 'briefed',
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ briefId: data.id, status: 'briefed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/meetings/join — join a meeting via dial-in
router.post('/join', async (req: Request, res: Response) => {
  try {
    const { userId, meetingId, dialInNumber, accessCode, userDisplayName } = req.body;
    if (!userId || !meetingId || !dialInNumber) {
      return res.status(400).json({ error: 'userId, meetingId, dialInNumber required' });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return res.status(503).json({ error: 'Twilio not configured' });
    }

    // Fetch briefing
    const db = getSupabase();
    const { data: brief } = await db
      .from('redi_meeting_briefs')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('user_id', userId)
      .single();

    const meetingContext = encodeURIComponent(JSON.stringify({
      userId,
      meetingId,
      userDisplayName: userDisplayName || 'the user',
      talkingPoints: brief?.talking_points || [],
      authorizedTopics: brief?.authorized_topics || [],
      boundaries: brief?.boundaries || '',
      isMeeting: true,
    }));

    // Build TwiML with optional access code (DTMF tones)
    let twimlContent = '';
    if (accessCode) {
      twimlContent = `<Pause length="3"/><Play digits="w${accessCode}#"/>`;
    }
    twimlContent += `<Connect><Stream url="wss://${new URL(SERVER_URL).host}/ws/redi-call?context=${meetingContext}" /></Connect>`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>${twimlContent}</Response>`;

    const params = new URLSearchParams({
      To: dialInNumber,
      From: TWILIO_PHONE_NUMBER,
      Twiml: twiml,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': getTwilioAuth(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    );

    const data = (await response.json()) as any;
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Failed to join meeting' });
    }

    await db.from('redi_meeting_briefs')
      .update({ status: 'in_meeting' })
      .eq('meeting_id', meetingId)
      .eq('user_id', userId);

    res.json({ callSid: data.sid, status: 'joining' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/meetings/:meetingId/debrief
router.get('/:meetingId/debrief', async (req: Request, res: Response) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('redi_meeting_briefs')
      .select('*')
      .eq('meeting_id', req.params.meetingId)
      .single();

    if (error) return res.status(404).json({ error: 'Meeting not found' });

    res.json({
      meetingId: data.meeting_id,
      status: data.status,
      debrief: data.debrief || {
        attendeesDetected: [],
        topicsDiscussed: [],
        actionItems: [],
        decisionsMade: [],
        questionsDeferred: [],
        transcriptSummary: 'Debrief not yet available',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/meetings/:meetingId/pushback — gentle pushback check
router.post('/:meetingId/pushback', async (req: Request, res: Response) => {
  const { meetingType } = req.body;
  const creativeTypes = ['brainstorm', 'team-building', 'creative', 'social', 'relationship'];

  if (creativeTypes.some((t) => meetingType?.toLowerCase().includes(t))) {
    return res.json({
      shouldPushback: true,
      message: "I can join for you, but people sometimes take it the wrong way when an assistant shows up instead. Are you sure you can't make it?",
    });
  }

  res.json({ shouldPushback: false });
});

export default router;
