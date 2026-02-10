/**
 * Calling Service — Redi makes calls on behalf of the user
 * =========================================================
 * Outbound calls to businesses, restaurants, doctors, etc.
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

// In-memory call tracking
const activeCalls = new Map<string, {
  userId: string;
  callSid: string;
  targetNumber: string;
  targetName: string;
  purpose: string;
  constraints: any;
  userDisplayName: string;
  status: string;
  startTime: number;
  summary: string | null;
}>();

// POST /api/calling/initiate — start a call on behalf of user
router.post('/initiate', async (req: Request, res: Response) => {
  try {
    const { userId, targetNumber, targetName, purpose, constraints, userDisplayName } = req.body;
    if (!userId || !targetNumber || !purpose) {
      return res.status(400).json({ error: 'userId, targetNumber, purpose required' });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return res.status(503).json({ error: 'Twilio not configured' });
    }

    // TwiML connects to our call WebSocket with context
    const callContext = encodeURIComponent(JSON.stringify({
      userId,
      targetName: targetName || 'Unknown',
      purpose,
      constraints: constraints || {},
      userDisplayName: userDisplayName || 'my client',
    }));

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${new URL(SERVER_URL).host}/ws/redi-call?context=${callContext}" />
  </Connect>
</Response>`;

    const params = new URLSearchParams({
      To: targetNumber,
      From: TWILIO_PHONE_NUMBER,
      Twiml: twiml,
      StatusCallback: `${SERVER_URL}/api/calling/status`,
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
      return res.status(response.status).json({ error: data.message || 'Call failed' });
    }

    activeCalls.set(data.sid, {
      userId,
      callSid: data.sid,
      targetNumber,
      targetName: targetName || 'Unknown',
      purpose,
      constraints: constraints || {},
      userDisplayName: userDisplayName || 'my client',
      status: 'initiated',
      startTime: Date.now(),
      summary: null,
    });

    res.json({ callId: data.sid, status: 'initiated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calling/status — Twilio status webhook
router.post('/status', async (req: Request, res: Response) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  const call = activeCalls.get(CallSid);
  if (call) {
    call.status = CallStatus;
    if (CallStatus === 'completed') {
      console.log(`[Calling] Call ${CallSid} completed (${CallDuration}s)`);
    }
  }
  res.sendStatus(200);
});

// GET /api/calling/:callId/status
router.get('/:callId/status', async (req: Request, res: Response) => {
  const call = activeCalls.get(req.params.callId);
  if (!call) {
    return res.status(404).json({ error: 'Call not found' });
  }
  res.json({
    callId: call.callSid,
    status: call.status,
    targetName: call.targetName,
    purpose: call.purpose,
    durationSeconds: Math.round((Date.now() - call.startTime) / 1000),
  });
});

// POST /api/calling/:callId/abort — end call early
router.post('/:callId/abort', async (req: Request, res: Response) => {
  try {
    const call = activeCalls.get(req.params.callId);
    if (!call) return res.status(404).json({ error: 'Call not found' });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${req.params.callId}.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': getTwilioAuth(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ Status: 'completed' }).toString(),
      },
    );

    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to abort call' });
    }

    call.status = 'aborted';
    res.json({ callId: req.params.callId, status: 'aborted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calling/:callId/summary
router.get('/:callId/summary', async (req: Request, res: Response) => {
  const call = activeCalls.get(req.params.callId);
  if (!call) return res.status(404).json({ error: 'Call not found' });

  res.json({
    callId: call.callSid,
    targetName: call.targetName,
    purpose: call.purpose,
    status: call.status,
    durationSeconds: Math.round((Date.now() - call.startTime) / 1000),
    summary: call.summary || 'Call summary not yet available',
  });
});

export default router;
