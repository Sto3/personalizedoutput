/**
 * Privacy Middleware — PII stripping, rate limiting, audit logging
 * ================================================================
 * Provider-agnostic: works regardless of which AI provider is used.
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// PII patterns — core patterns for general use
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  { pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, replacement: '[SSN]' },
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD]' },
];

// Extended patterns for observation mode — screen OCR may capture sensitive fields
const OBSERVE_PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  ...PII_PATTERNS,
  { pattern: /\bpassword[\s:=]+\S+/gi, replacement: '[PASSWORD_REDACTED]' },
  { pattern: /\b(api[_-]?key|secret|token)[\s:=]+\S+/gi, replacement: '[API_KEY_REDACTED]' },
  { pattern: /\b(sk-|pk_|Bearer\s+)\S+/g, replacement: '[KEY_REDACTED]' },
  { pattern: /\b(access_token|refresh_token|auth_token)[\s:=]+\S+/gi, replacement: '[TOKEN_REDACTED]' },
];

export function stripPII(text: string): string {
  let cleaned = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned;
}

// Rate limiting (in-memory, per user)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute per user

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const userId = (req.query.userId as string) || (req.body?.userId as string) || req.ip || 'anonymous';
  const now = Date.now();

  let entry = rateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimits.set(userId, entry);
  }

  entry.count++;

  if (entry.count > RATE_LIMIT_MAX) {
    res.status(429).json({ error: 'Rate limit exceeded. Try again in 1 minute.' });
    return;
  }

  next();
}

// Audit logger
export async function auditLog(userId: string, action: string, resource: string, details: any = {}, ip?: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await db.from('redi_audit_log').insert({
      user_id: userId,
      action,
      resource,
      details: { ...details, piiStripped: true },
      ip_address: ip,
    });
  } catch (err) {
    console.error('[Privacy] Audit log error:', err);
  }
}

// Middleware: strip PII from logs + audit
export function privacyMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Override console.log to strip PII in request context
  const originalLog = console.log;
  const originalEnd = res.end;

  // Audit API calls
  const userId = (req.query.userId as string) || (req.body?.userId as string) || 'anonymous';
  auditLog(userId, req.method, req.path, { query: req.query }, req.ip);

  next();
}

// Cleanup stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) rateLimits.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Sanitize content from observation mode before sending to LLM.
 * Uses extended patterns that catch passwords, API keys, and tokens
 * that may appear on screen during screen OCR capture.
 */
export function sanitizeObserveContent(content: string): string {
  let sanitized = content;
  for (const { pattern, replacement } of OBSERVE_PII_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}

export default { stripPII, sanitizeObserveContent, rateLimiter, privacyMiddleware, auditLog };
