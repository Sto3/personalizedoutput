/**
 * Spotify Service — Full Spotify integration via OAuth2 + Web API
 * ================================================================
 * Playback control, search, playlists, recommendations.
 * Playback control requires Spotify Premium.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || 'https://personalizedoutput.com';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const REDIRECT_URI = `${SERVER_URL}/api/music/spotify/callback`;
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-modify-public playlist-modify-private user-library-read';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function getTokens(userId: string): Promise<{ access_token: string } | null> {
  const db = getSupabase();
  const { data } = await db
    .from('redi_oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'spotify')
    .single();

  if (!data) return null;

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return await refreshToken(userId, data.refresh_token);
  }

  return { access_token: data.access_token };
}

async function refreshToken(userId: string, refreshToken: string): Promise<{ access_token: string } | null> {
  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as any;
  const db = getSupabase();

  await db.from('redi_oauth_tokens').update({
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }).eq('user_id', userId).eq('provider', 'spotify');

  return { access_token: data.access_token };
}

async function spotifyApi(userId: string, endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const tokens = await getTokens(userId);
  if (!tokens) throw new Error('Spotify not connected');

  const options: RequestInit = {
    method,
    headers: { 'Authorization': `Bearer ${tokens.access_token}` },
  };

  if (body) {
    (options.headers as any)['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, options);

  if (response.status === 204) return {};
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Spotify API error ${response.status}: ${err}`);
  }

  return response.json();
}

// GET /api/music/spotify/auth
router.get('/auth', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (!SPOTIFY_CLIENT_ID) return res.status(503).json({ error: 'Spotify not configured' });

  const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&state=${userId}`;
  res.redirect(authUrl);
});

// GET /api/music/spotify/callback
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const userId = req.query.state as string;
    if (!code || !userId) return res.status(400).json({ error: 'Missing code or state' });

    const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
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
      provider: 'spotify',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    });

    res.send('<html><body><h1>Spotify connected!</h1><p>You can close this window.</p></body></html>');
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/music/spotify/search
router.get('/search', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const query = req.query.q as string;
    if (!userId || !query) return res.status(400).json({ error: 'userId and q required' });

    const data = await spotifyApi(userId, `/search?q=${encodeURIComponent(query)}&type=track&limit=10`);
    res.json({ tracks: data.tracks?.items || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/music/spotify/play
router.post('/play', async (req: Request, res: Response) => {
  try {
    const { userId, uri } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const body = uri ? { uris: [uri] } : undefined;
    await spotifyApi(userId, '/me/player/play', 'PUT', body);
    res.json({ playing: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/music/spotify/pause
router.post('/pause', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    await spotifyApi(userId, '/me/player/pause', 'PUT');
    res.json({ paused: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/music/spotify/next
router.post('/next', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    await spotifyApi(userId, '/me/player/next', 'POST');
    res.json({ skipped: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/music/spotify/now-playing
router.get('/now-playing', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const data = await spotifyApi(userId, '/me/player/currently-playing');
    res.json({
      isPlaying: data.is_playing || false,
      track: data.item ? {
        name: data.item.name,
        artist: data.item.artists?.map((a: any) => a.name).join(', '),
        album: data.item.album?.name,
        uri: data.item.uri,
      } : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/music/spotify/playlist
router.post('/playlist', async (req: Request, res: Response) => {
  try {
    const { userId, name, description, trackUris } = req.body;
    if (!userId || !name) return res.status(400).json({ error: 'userId and name required' });

    // Get user's Spotify ID
    const me = await spotifyApi(userId, '/me');

    // Create playlist
    const playlist = await spotifyApi(userId, `/users/${me.id}/playlists`, 'POST', {
      name,
      description: description || 'Created by Redi',
      public: false,
    });

    // Add tracks if provided
    if (trackUris?.length) {
      await spotifyApi(userId, `/playlists/${playlist.id}/tracks`, 'POST', {
        uris: trackUris,
      });
    }

    res.json({ playlistId: playlist.id, url: playlist.external_urls?.spotify });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/music/spotify/recommendations
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const seedTracks = req.query.seed_tracks as string || '';
    const seedGenres = req.query.seed_genres as string || '';
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const params = new URLSearchParams({ limit: '20' });
    if (seedTracks) params.set('seed_tracks', seedTracks);
    if (seedGenres) params.set('seed_genres', seedGenres);

    const data = await spotifyApi(userId, `/recommendations?${params}`);
    res.json({ tracks: data.tracks || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
