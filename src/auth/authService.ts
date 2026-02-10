/**
 * Auth Service — User authentication and TOTP 2FA
 * =================================================
 * JWT sessions, TOTP setup/verify (Google Authenticator compatible).
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'redi-jwt-secret-change-in-production';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// Simple JWT implementation (no external dependency)
function createJWT(payload: any, expiresInHours: number = 24): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + expiresInHours * 3600,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJWT(token: string): any | null {
  try {
    const [header, body, signature] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expected) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// TOTP implementation (RFC 6238)
function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString('hex');
}

function generateTOTP(secret: string, time?: number): string {
  const counter = Math.floor((time || Date.now() / 1000) / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex')).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 | hmac[offset + 1] << 16 | hmac[offset + 2] << 8 | hmac[offset + 3]) % 1000000;

  return code.toString().padStart(6, '0');
}

function verifyTOTP(secret: string, code: string): boolean {
  // Check current and adjacent 30s windows for clock skew
  const now = Math.floor(Date.now() / 1000);
  for (const offset of [-30, 0, 30]) {
    if (generateTOTP(secret, now + offset) === code) return true;
  }
  return false;
}

function generateTOTPUri(secret: string, email: string): string {
  // Convert hex secret to base32 for QR code URI
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = Buffer.from(secret, 'hex');
  let base32 = '';
  let bits = 0;
  let value = 0;

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      base32 += base32Chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    base32 += base32Chars[(value << (5 - bits)) & 31];
  }

  return `otpauth://totp/Redi:${encodeURIComponent(email)}?secret=${base32}&issuer=Redi&algorithm=SHA1&digits=6&period=30`;
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const db = getSupabase();

    // Check if user exists
    const { data: existing } = await db.from('redi_users').select('user_id').eq('email', email).single();
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const { data, error } = await db.from('redi_users').insert({
      email,
      phone: phone || null,
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });

    const token = createJWT({ userId: data.user_id, email });

    res.json({ userId: data.user_id, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, totpCode } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const db = getSupabase();
    const { data: user, error } = await db
      .from('redi_users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });

    // If TOTP is enabled, verify
    if (user.totp_enabled) {
      if (!totpCode) return res.status(401).json({ error: 'TOTP code required', totpRequired: true });
      if (!verifyTOTP(user.totp_secret, totpCode)) {
        return res.status(401).json({ error: 'Invalid TOTP code' });
      }
    }

    const token = createJWT({ userId: user.user_id, email: user.email });

    res.json({ userId: user.user_id, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/totp/setup
router.post('/totp/setup', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const db = getSupabase();
    const { data: user } = await db.from('redi_users').select('email').eq('user_id', userId).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = generateTOTPSecret();
    const uri = generateTOTPUri(secret, user.email);

    // Store secret (not enabled yet until verified)
    await db.from('redi_users').update({ totp_secret: secret }).eq('user_id', userId);

    res.json({ secret, qrUri: uri });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/totp/verify — verify and enable TOTP
router.post('/totp/verify', async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: 'userId and code required' });

    const db = getSupabase();
    const { data: user } = await db.from('redi_users').select('totp_secret').eq('user_id', userId).single();
    if (!user?.totp_secret) return res.status(400).json({ error: 'TOTP not set up' });

    if (!verifyTOTP(user.totp_secret, code)) {
      return res.status(401).json({ error: 'Invalid code' });
    }

    await db.from('redi_users').update({ totp_enabled: true }).eq('user_id', userId);

    res.json({ enabled: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/totp/disable
router.post('/totp/disable', async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: 'userId and code required' });

    const db = getSupabase();
    const { data: user } = await db.from('redi_users').select('totp_secret').eq('user_id', userId).single();
    if (!user?.totp_secret) return res.status(400).json({ error: 'TOTP not enabled' });

    if (!verifyTOTP(user.totp_secret, code)) {
      return res.status(401).json({ error: 'Invalid code' });
    }

    await db.from('redi_users').update({ totp_secret: null, totp_enabled: false }).eq('user_id', userId);

    res.json({ disabled: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export JWT helpers for middleware use
export { verifyJWT, createJWT };
export default router;
