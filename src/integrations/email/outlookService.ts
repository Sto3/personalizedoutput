/**
 * Outlook Service — Microsoft Graph API integration
 * ===================================================
 * OAuth2 via Microsoft identity platform.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const MS_CLIENT_ID = process.env.MS_CLIENT_ID || '';
const MS_CLIENT_SECRET = process.env.MS_CLIENT_SECRET || '';
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || 'https://personalizedoutput.com';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const REDIRECT_URI = `${SERVER_URL}/api/email/outlook/callback`;
const SCOPES = 'Mail.Read Mail.Send Mail.ReadWrite offline_access';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function getTokens(userId: string): Promise<{ access_token: string; refresh_token: string } | null> {
  const db = getSupabase();
  const { data } = await db
    .from('redi_oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'outlook')
    .single();

  if (!data) return null;

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return await refreshAccessToken(userId, data.refresh_token);
  }

  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<{ access_token: string; refresh_token: string } | null> {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: SCOPES,
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as any;
  const db = getSupabase();
  await db.from('redi_oauth_tokens').update({
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }).eq('user_id', userId).eq('provider', 'outlook');

  return { access_token: data.access_token, refresh_token: data.refresh_token || refreshToken };
}

// GET /api/email/outlook/auth
router.get('/auth', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  if (!MS_CLIENT_ID) {
    return res.status(503).json({ error: 'Microsoft OAuth not configured' });
  }

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MS_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&state=${userId}`;

  res.redirect(authUrl);
});

// GET /api/email/outlook/callback
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const userId = req.query.state as string;

    if (!code || !userId) return res.status(400).json({ error: 'Missing code or state' });

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: SCOPES,
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
      provider: 'outlook',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    });

    res.send('<html><body><h1>Outlook connected!</h1><p>You can close this window.</p></body></html>');
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/outlook/list
router.get('/list', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const maxResults = parseInt(req.query.max as string) || 10;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const tokens = await getTokens(userId);
    if (!tokens) return res.status(401).json({ error: 'Outlook not connected' });

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$orderby=receivedDateTime desc`,
      { headers: { 'Authorization': `Bearer ${tokens.access_token}` } },
    );

    if (!response.ok) return res.status(response.status).json({ error: 'Graph API error' });

    const data = (await response.json()) as any;
    res.json({ messages: data.value || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/outlook/read/:emailId
router.get('/read/:emailId', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const tokens = await getTokens(userId);
    if (!tokens) return res.status(401).json({ error: 'Outlook not connected' });

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${req.params.emailId}`,
      { headers: { 'Authorization': `Bearer ${tokens.access_token}` } },
    );

    if (!response.ok) return res.status(response.status).json({ error: 'Graph API error' });

    const data = (await response.json()) as any;
    res.json({
      id: data.id,
      subject: data.subject,
      from: data.from?.emailAddress?.address || '',
      to: (data.toRecipients || []).map((r: any) => r.emailAddress?.address).join(', '),
      date: data.receivedDateTime,
      body: data.body?.content || '',
      bodyType: data.body?.contentType || 'text',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/outlook/draft
router.post('/draft', async (req: Request, res: Response) => {
  try {
    const { userId, to, subject, body } = req.body;
    if (!userId || !to || !subject || !body) {
      return res.status(400).json({ error: 'userId, to, subject, body required' });
    }

    const tokens = await getTokens(userId);
    if (!tokens) return res.status(401).json({ error: 'Outlook not connected' });

    const response = await fetch('https://graph.microsoft.com/v1.0/me/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject,
        body: { contentType: 'Text', content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      }),
    });

    if (!response.ok) return res.status(response.status).json({ error: 'Draft creation failed' });

    const data = (await response.json()) as any;
    res.json({ draftId: data.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/outlook/send
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { userId, to, subject, body } = req.body;
    if (!userId || !to || !subject || !body) {
      return res.status(400).json({ error: 'userId, to, subject, body required' });
    }

    const tokens = await getTokens(userId);
    if (!tokens) return res.status(401).json({ error: 'Outlook not connected' });

    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'Text', content: body },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      }),
    });

    if (!response.ok) return res.status(response.status).json({ error: 'Send failed' });
    res.json({ sent: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
