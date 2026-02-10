/**
 * Gmail Service — Gmail integration via OAuth2
 * ==============================================
 * Uses Google OAuth2 for authentication and Gmail API for email operations.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || 'https://personalizedoutput.com';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const REDIRECT_URI = `${SERVER_URL}/api/email/gmail/callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ');

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function getTokens(userId: string): Promise<{ access_token: string; refresh_token: string } | null> {
  const db = getSupabase();
  const { data } = await db
    .from('redi_oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .single();

  if (!data) return null;

  // Check if token needs refresh
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return await refreshAccessToken(userId, data.refresh_token);
  }

  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<{ access_token: string; refresh_token: string } | null> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as any;
  const db = getSupabase();
  await db.from('redi_oauth_tokens').update({
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }).eq('user_id', userId).eq('provider', 'gmail');

  return { access_token: data.access_token, refresh_token: refreshToken };
}

// GET /api/email/gmail/auth — redirect to Google consent screen
router.get('/auth', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth not configured' });
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent&state=${userId}`;

  res.redirect(authUrl);
});

// GET /api/email/gmail/callback — handle OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const userId = req.query.state as string;

    if (!code || !userId) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: `Token exchange failed: ${err}` });
    }

    const tokenData = (await response.json()) as any;
    const db = getSupabase();

    await db.from('redi_oauth_tokens').upsert({
      user_id: userId,
      provider: 'gmail',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    });

    res.send('<html><body><h1>Gmail connected!</h1><p>You can close this window.</p></body></html>');
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/gmail/list — list emails
router.get('/list', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const query = req.query.q as string || '';
    const maxResults = parseInt(req.query.max as string) || 10;

    if (!userId) return res.status(400).json({ error: 'userId required' });

    const tokens = await getTokens(userId);
    if (!tokens) return res.status(401).json({ error: 'Gmail not connected' });

    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${query ? `&q=${encodeURIComponent(query)}` : ''}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    });

    if (!response.ok) return res.status(response.status).json({ error: 'Gmail API error' });

    const data = (await response.json()) as any;
    res.json({ messages: data.messages || [], resultSizeEstimate: data.resultSizeEstimate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/gmail/read/:emailId — read full email
router.get('/read/:emailId', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const tokens = await getTokens(userId);
    if (!tokens) return res.status(401).json({ error: 'Gmail not connected' });

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${req.params.emailId}?format=full`,
      { headers: { 'Authorization': `Bearer ${tokens.access_token}` } },
    );

    if (!response.ok) return res.status(response.status).json({ error: 'Gmail API error' });

    const data = (await response.json()) as any;
    const headers = data.payload?.headers || [];

    res.json({
      id: data.id,
      threadId: data.threadId,
      subject: headers.find((h: any) => h.name === 'Subject')?.value || '',
      from: headers.find((h: any) => h.name === 'From')?.value || '',
      to: headers.find((h: any) => h.name === 'To')?.value || '',
      date: headers.find((h: any) => h.name === 'Date')?.value || '',
      snippet: data.snippet,
      body: data.payload?.body?.data
        ? Buffer.from(data.payload.body.data, 'base64url').toString('utf-8')
        : data.snippet,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/gmail/draft — create draft
router.post('/draft', async (req: Request, res: Response) => {
  try {
    const { userId, to, subject, body } = req.body;
    if (!userId || !to || !subject || !body) {
      return res.status(400).json({ error: 'userId, to, subject, body required' });
    }

    const tokens = await getTokens(userId);
    if (!tokens) return res.status(401).json({ error: 'Gmail not connected' });

    const rawMessage = Buffer.from(
      `To: ${to}\nSubject: ${subject}\nContent-Type: text/plain; charset=utf-8\n\n${body}`,
    ).toString('base64url');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: { raw: rawMessage } }),
    });

    if (!response.ok) return res.status(response.status).json({ error: 'Draft creation failed' });

    const data = (await response.json()) as any;
    res.json({ draftId: data.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/gmail/send — send email (requires user confirmation on iOS)
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { userId, to, subject, body } = req.body;
    if (!userId || !to || !subject || !body) {
      return res.status(400).json({ error: 'userId, to, subject, body required' });
    }

    const tokens = await getTokens(userId);
    if (!tokens) return res.status(401).json({ error: 'Gmail not connected' });

    const rawMessage = Buffer.from(
      `To: ${to}\nSubject: ${subject}\nContent-Type: text/plain; charset=utf-8\n\n${body}`,
    ).toString('base64url');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    if (!response.ok) return res.status(response.status).json({ error: 'Send failed' });

    const data = (await response.json()) as any;
    res.json({ messageId: data.id, sent: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
