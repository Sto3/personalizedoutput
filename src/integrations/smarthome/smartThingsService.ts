/**
 * SmartThings Service — Samsung SmartThings API
 * ===============================================
 * Device control, scenes, automation.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const SERVER_URL = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || 'https://personalizedoutput.com';
const SMARTTHINGS_CLIENT_ID = process.env.SMARTTHINGS_CLIENT_ID || '';
const SMARTTHINGS_CLIENT_SECRET = process.env.SMARTTHINGS_CLIENT_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const REDIRECT_URI = `${SERVER_URL}/api/smarthome/smartthings/callback`;
const ST_API = 'https://api.smartthings.com/v1';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function getToken(userId: string): Promise<string | null> {
  const db = getSupabase();
  const { data } = await db
    .from('redi_oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'smartthings')
    .single();

  if (!data) return null;

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // Refresh token
    const response = await fetch('https://auth-global.api.smartthings.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: SMARTTHINGS_CLIENT_ID,
        client_secret: SMARTTHINGS_CLIENT_SECRET,
        refresh_token: data.refresh_token,
      }),
    });

    if (!response.ok) return null;

    const tokenData = (await response.json()) as any;
    await db.from('redi_oauth_tokens').update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || data.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    }).eq('user_id', userId).eq('provider', 'smartthings');

    return tokenData.access_token;
  }

  return data.access_token;
}

// GET /api/smarthome/smartthings/auth
router.get('/auth', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (!SMARTTHINGS_CLIENT_ID) return res.status(503).json({ error: 'SmartThings not configured' });

  const authUrl = `https://auth-global.api.smartthings.com/oauth/authorize?client_id=${SMARTTHINGS_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=r:devices:* x:devices:* r:scenes:* x:scenes:*&state=${userId}`;
  res.redirect(authUrl);
});

// GET /api/smarthome/smartthings/callback
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const userId = req.query.state as string;
    if (!code || !userId) return res.status(400).json({ error: 'Missing code or state' });

    const response = await fetch('https://auth-global.api.smartthings.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: SMARTTHINGS_CLIENT_ID,
        client_secret: SMARTTHINGS_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
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
      provider: 'smartthings',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    });

    res.send('<html><body><h1>SmartThings connected!</h1><p>You can close this window.</p></body></html>');
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/smarthome/smartthings/devices
router.get('/devices', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const token = await getToken(userId);
    if (!token) return res.status(401).json({ error: 'SmartThings not connected' });

    const response = await fetch(`${ST_API}/devices`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) return res.status(response.status).json({ error: 'SmartThings API error' });

    const data = (await response.json()) as any;
    res.json({
      devices: (data.items || []).map((d: any) => ({
        id: d.deviceId,
        name: d.label || d.name,
        type: d.deviceTypeName,
        capabilities: d.components?.[0]?.capabilities?.map((c: any) => c.id) || [],
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/smarthome/smartthings/devices/:deviceId/status
router.get('/devices/:deviceId/status', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const token = await getToken(userId);
    if (!token) return res.status(401).json({ error: 'SmartThings not connected' });

    const response = await fetch(`${ST_API}/devices/${req.params.deviceId}/status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) return res.status(response.status).json({ error: 'Device not found' });

    const data = (await response.json()) as any;
    res.json({ deviceId: req.params.deviceId, status: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/smarthome/smartthings/devices/:deviceId/command
router.post('/devices/:deviceId/command', async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId;
    const { capability, command, args } = req.body;
    if (!userId || !capability || !command) {
      return res.status(400).json({ error: 'userId, capability, command required' });
    }

    const token = await getToken(userId);
    if (!token) return res.status(401).json({ error: 'SmartThings not connected' });

    const response = await fetch(`${ST_API}/devices/${req.params.deviceId}/commands`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commands: [{
          component: 'main',
          capability,
          command,
          arguments: args || [],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `Command failed: ${err}` });
    }

    res.json({ sent: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/smarthome/smartthings/scenes
router.get('/scenes', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const token = await getToken(userId);
    if (!token) return res.status(401).json({ error: 'SmartThings not connected' });

    const response = await fetch(`${ST_API}/scenes`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) return res.status(response.status).json({ error: 'API error' });

    const data = (await response.json()) as any;
    res.json({
      scenes: (data.items || []).map((s: any) => ({
        id: s.sceneId,
        name: s.sceneName,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/smarthome/smartthings/scenes/:sceneId/execute
router.post('/scenes/:sceneId/execute', async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const token = await getToken(userId);
    if (!token) return res.status(401).json({ error: 'SmartThings not connected' });

    const response = await fetch(`${ST_API}/scenes/${req.params.sceneId}/execute`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) return res.status(response.status).json({ error: 'Scene execution failed' });

    res.json({ executed: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
