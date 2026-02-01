/**
 * AuthService.ts
 * 
 * AUTHENTICATION SERVICE FOR REDI
 * 
 * Supports multiple authentication methods:
 * - TOTP (RFC 6238) - Compatible with ALL authenticator apps:
 *   - Google Authenticator
 *   - Authy
 *   - 1Password
 *   - Microsoft Authenticator
 *   - Duo Mobile
 *   - LastPass Authenticator
 *   - Any RFC 6238 compliant app
 * 
 * - Email OTP (Magic Link / Code)
 * - SMS OTP (via Twilio - future)
 * - Apple Sign-In (iOS native - handled client-side)
 * 
 * Created: Feb 1, 2026
 */

import crypto from 'crypto';
import { Router, Request, Response } from 'express';

const router = Router();

// In production, use a proper database
interface User {
  id: string;
  email: string;
  phone?: string;
  totpSecret?: string;
  totpEnabled: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

interface PendingVerification {
  userId: string;
  code: string;
  type: 'email' | 'sms' | 'totp_setup';
  expiresAt: Date;
}

// In-memory storage (use database in production)
const users = new Map<string, User>();
const pendingVerifications = new Map<string, PendingVerification>();
const sessions = new Map<string, { userId: string; expiresAt: Date }>();

// ============================================
// TOTP (Time-based One-Time Password) - RFC 6238
// ============================================

/**
 * Generate a random secret for TOTP
 * Base32 encoded, 20 bytes (160 bits) as recommended by RFC 6238
 */
function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Base32 encoding (RFC 4648)
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decoding
 */
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanInput = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleanInput.length; i++) {
    const idx = alphabet.indexOf(cleanInput[i]);
    if (idx === -1) continue;
    
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Generate TOTP code for a given secret and time
 * Implements RFC 6238 / RFC 4226
 */
function generateTOTP(secret: string, timeStep: number = 30, digits: number = 6): string {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));

  const secretBuffer = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(timeBuffer);
  const hash = hmac.digest();

  // Dynamic truncation (RFC 4226)
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = 
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Verify TOTP code
 * Allows 1 step before/after current time to account for clock drift
 */
function verifyTOTP(secret: string, code: string, window: number = 1): boolean {
  for (let i = -window; i <= window; i++) {
    const timeStep = Math.floor(Date.now() / 1000 / 30) + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(timeStep));

    const secretBuffer = base32Decode(secret);
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const binary = 
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');
    
    if (otp === code) {
      return true;
    }
  }
  return false;
}

/**
 * Generate TOTP URI for QR code (otpauth:// format)
 * This URI can be scanned by ANY authenticator app
 */
function generateTOTPUri(secret: string, email: string, issuer: string = 'Redi'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

// ============================================
// Email OTP
// ============================================

/**
 * Generate a 6-digit email verification code
 */
function generateEmailCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send email verification code (placeholder - use Resend in production)
 */
async function sendEmailCode(email: string, code: string): Promise<boolean> {
  // TODO: Integrate with Resend API
  console.log(`[Auth] Sending email code ${code} to ${email}`);
  // In production:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ ... });
  return true;
}

// ============================================
// API Routes
// ============================================

/**
 * POST /api/auth/register
 * Register a new user with email
 */
router.post('/register', async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email required' });
    return;
  }

  // Check if user exists
  const existingUser = Array.from(users.values()).find(u => u.email === email);
  if (existingUser) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  // Create user
  const userId = crypto.randomUUID();
  const user: User = {
    id: userId,
    email,
    totpEnabled: false,
    emailVerified: false,
    createdAt: new Date()
  };
  users.set(userId, user);

  // Send verification code
  const code = generateEmailCode();
  pendingVerifications.set(userId, {
    userId,
    code,
    type: 'email',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  });

  await sendEmailCode(email, code);

  res.json({ 
    userId,
    message: 'Verification code sent to email'
  });
});

/**
 * POST /api/auth/verify-email
 * Verify email with code
 */
router.post('/verify-email', (req: Request, res: Response) => {
  const { userId, code } = req.body;

  const verification = pendingVerifications.get(userId);
  if (!verification || verification.type !== 'email') {
    res.status(400).json({ error: 'No pending verification' });
    return;
  }

  if (verification.expiresAt < new Date()) {
    pendingVerifications.delete(userId);
    res.status(400).json({ error: 'Code expired' });
    return;
  }

  if (verification.code !== code) {
    res.status(400).json({ error: 'Invalid code' });
    return;
  }

  // Mark email as verified
  const user = users.get(userId);
  if (user) {
    user.emailVerified = true;
  }

  pendingVerifications.delete(userId);

  // Create session
  const sessionToken = crypto.randomUUID();
  sessions.set(sessionToken, {
    userId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  });

  res.json({ 
    success: true,
    sessionToken,
    message: 'Email verified'
  });
});

/**
 * POST /api/auth/setup-totp
 * Initialize TOTP setup - returns secret and QR code URI
 */
router.post('/setup-totp', (req: Request, res: Response) => {
  const { sessionToken } = req.body;

  const session = sessions.get(sessionToken);
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const user = users.get(session.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Generate new TOTP secret
  const secret = generateTOTPSecret();
  
  // Store temporarily (will be confirmed after verification)
  pendingVerifications.set(session.userId, {
    userId: session.userId,
    code: secret, // Store secret as code temporarily
    type: 'totp_setup',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  // Generate URI for QR code
  const uri = generateTOTPUri(secret, user.email);

  res.json({
    secret, // User can also enter manually
    uri,    // For QR code scanning
    message: 'Scan QR code with your authenticator app, then verify with a code'
  });
});

/**
 * POST /api/auth/confirm-totp
 * Confirm TOTP setup by verifying first code
 */
router.post('/confirm-totp', (req: Request, res: Response) => {
  const { sessionToken, code } = req.body;

  const session = sessions.get(sessionToken);
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const verification = pendingVerifications.get(session.userId);
  if (!verification || verification.type !== 'totp_setup') {
    res.status(400).json({ error: 'No pending TOTP setup' });
    return;
  }

  const secret = verification.code; // We stored secret here
  
  // Verify the code
  if (!verifyTOTP(secret, code)) {
    res.status(400).json({ error: 'Invalid code. Make sure your authenticator is synced.' });
    return;
  }

  // Save TOTP secret to user
  const user = users.get(session.userId);
  if (user) {
    user.totpSecret = secret;
    user.totpEnabled = true;
  }

  pendingVerifications.delete(session.userId);

  res.json({
    success: true,
    message: 'Two-factor authentication enabled'
  });
});

/**
 * POST /api/auth/login
 * Login with email (step 1)
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = Array.from(users.values()).find(u => u.email === email);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // If TOTP is enabled, require it
  if (user.totpEnabled) {
    res.json({
      userId: user.id,
      requiresTOTP: true,
      message: 'Enter code from authenticator app'
    });
    return;
  }

  // Otherwise, send email code
  const code = generateEmailCode();
  pendingVerifications.set(user.id, {
    userId: user.id,
    code,
    type: 'email',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  await sendEmailCode(email, code);

  res.json({
    userId: user.id,
    requiresTOTP: false,
    message: 'Verification code sent to email'
  });
});

/**
 * POST /api/auth/verify-totp
 * Verify TOTP code for login
 */
router.post('/verify-totp', (req: Request, res: Response) => {
  const { userId, code } = req.body;

  const user = users.get(userId);
  if (!user || !user.totpSecret) {
    res.status(400).json({ error: 'TOTP not enabled for this user' });
    return;
  }

  if (!verifyTOTP(user.totpSecret, code)) {
    res.status(400).json({ error: 'Invalid code' });
    return;
  }

  // Create session
  const sessionToken = crypto.randomUUID();
  sessions.set(sessionToken, {
    userId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  res.json({
    success: true,
    sessionToken
  });
});

/**
 * POST /api/auth/verify-session
 * Verify if a session token is valid
 */
router.post('/verify-session', (req: Request, res: Response) => {
  const { sessionToken } = req.body;

  const session = sessions.get(sessionToken);
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ valid: false });
    return;
  }

  const user = users.get(session.userId);
  
  res.json({
    valid: true,
    userId: session.userId,
    email: user?.email,
    totpEnabled: user?.totpEnabled
  });
});

/**
 * POST /api/auth/logout
 * Invalidate session
 */
router.post('/logout', (req: Request, res: Response) => {
  const { sessionToken } = req.body;
  sessions.delete(sessionToken);
  res.json({ success: true });
});

export default router;
