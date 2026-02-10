/**
 * Outreach Service — Redi Reaches Out
 * ====================================
 * Push notifications, Twilio calls, and SMS.
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

async function logOutreach(userId: string, channel: string, title: string, body: string, metadata: any = {}): Promise<void> {
  const db = getSupabase();
  await db.from('redi_outreach_log').insert({
    user_id: userId,
    channel,
    title,
    body,
    metadata,
  });
}

// POST /api/outreach/push — create push notification payload
router.post('/push', async (req: Request, res: Response) => {
  try {
    const { userId, title, body, actionUrl, priority } = req.body;
    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, body required' });
    }

    const payload = {
      aps: {
        alert: { title, body },
        sound: priority === 'high' ? 'critical' : 'default',
        'content-available': 1,
      },
      actionUrl: actionUrl || null,
      rediSource: true,
    };

    await logOutreach(userId, 'push', title, body, { priority, actionUrl });

    res.json({ payload, logged: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach/call — initiate Twilio outbound call
router.post('/call', async (req: Request, res: Response) => {
  try {
    const { userId, phoneNumber, purpose, talkingPoints } = req.body;
    if (!userId || !phoneNumber) {
      return res.status(400).json({ error: 'userId and phoneNumber required' });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return res.status(503).json({ error: 'Twilio not configured' });
    }

    // TwiML that connects the call to our WebSocket for real-time processing
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${new URL(SERVER_URL).host}/ws/redi-call" />
  </Connect>
</Response>`;

    const params = new URLSearchParams({
      To: phoneNumber,
      From: TWILIO_PHONE_NUMBER,
      Twiml: twiml,
      StatusCallback: `${SERVER_URL}/api/outreach/call-status`,
      StatusCallbackEvent: 'initiated ringing answered completed',
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
      return res.status(response.status).json({ error: data.message || 'Twilio call failed' });
    }

    await logOutreach(userId, 'call', purpose || 'Outbound call', phoneNumber, {
      callSid: data.sid,
      talkingPoints,
    });

    res.json({ callSid: data.sid, status: data.status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach/call-status — Twilio status webhook
router.post('/call-status', async (req: Request, res: Response) => {
  console.log(`[Outreach] Call status: ${req.body.CallSid} -> ${req.body.CallStatus}`);
  res.sendStatus(200);
});

// POST /api/outreach/sms — send SMS via Twilio
router.post('/sms', async (req: Request, res: Response) => {
  try {
    const { userId, phoneNumber, message } = req.body;
    if (!userId || !phoneNumber || !message) {
      return res.status(400).json({ error: 'userId, phoneNumber, message required' });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return res.status(503).json({ error: 'Twilio not configured' });
    }

    const params = new URLSearchParams({
      To: phoneNumber,
      From: TWILIO_PHONE_NUMBER,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
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
      return res.status(response.status).json({ error: data.message || 'SMS failed' });
    }

    await logOutreach(userId, 'sms', 'SMS', message, { messageSid: data.sid });

    res.json({ messageSid: data.sid, status: data.status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
