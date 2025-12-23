/**
 * Session Service - Supabase-backed session storage
 *
 * Stores thought sessions in Supabase to survive Render deploys.
 * Falls back to filesystem if Supabase is not available.
 */

import { getSupabaseServiceClient, isSupabaseServiceConfigured } from './client';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// TYPES
// ============================================================

export interface ThoughtSessionData {
  session_id: string;
  product_id: string;
  turns: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestampIso: string;
  }>;
  status: 'in_progress' | 'ready_for_generation' | 'completed';
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================
// FILESYSTEM FALLBACK
// ============================================================

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions');

function ensureSessionsDir(): void {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function getSessionFilePath(sessionId: string): string {
  return path.join(SESSIONS_DIR, `${sessionId}.json`);
}

// ============================================================
// SUPABASE OPERATIONS
// ============================================================

/**
 * Save session to Supabase
 */
export async function saveSessionToSupabase(session: ThoughtSessionData): Promise<boolean> {
  if (!isSupabaseServiceConfigured()) {
    return false;
  }

  try {
    const supabase = getSupabaseServiceClient();

    const { error } = await supabase
      .from('thought_sessions')
      .upsert({
        session_id: session.session_id,
        product_id: session.product_id,
        turns: session.turns,
        status: session.status,
        metadata: session.metadata || {},
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id'
      });

    if (error) {
      console.error('[SessionService] Supabase save error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[SessionService] Supabase save exception:', err);
    return false;
  }
}

/**
 * Load session from Supabase
 */
export async function loadSessionFromSupabase(sessionId: string): Promise<ThoughtSessionData | null> {
  if (!isSupabaseServiceConfigured()) {
    return null;
  }

  try {
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from('thought_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Not found is OK
        console.error('[SessionService] Supabase load error:', error.message);
      }
      return null;
    }

    return data as ThoughtSessionData;
  } catch (err) {
    console.error('[SessionService] Supabase load exception:', err);
    return null;
  }
}

/**
 * Delete session from Supabase
 */
export async function deleteSessionFromSupabase(sessionId: string): Promise<boolean> {
  if (!isSupabaseServiceConfigured()) {
    return false;
  }

  try {
    const supabase = getSupabaseServiceClient();

    const { error } = await supabase
      .from('thought_sessions')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('[SessionService] Supabase delete error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[SessionService] Supabase delete exception:', err);
    return false;
  }
}

// ============================================================
// HYBRID OPERATIONS (Supabase + Filesystem)
// ============================================================

/**
 * Save session to both Supabase and filesystem
 */
export async function saveSession(session: ThoughtSessionData): Promise<void> {
  // Always try Supabase first
  const savedToSupabase = await saveSessionToSupabase(session);

  if (savedToSupabase) {
    console.log(`[SessionService] Session ${session.session_id} saved to Supabase`);
  }

  // Also save to filesystem as backup (for local dev)
  try {
    ensureSessionsDir();
    const filepath = getSessionFilePath(session.session_id);
    fs.writeFileSync(filepath, JSON.stringify(session, null, 2), 'utf-8');
  } catch (err) {
    // Filesystem save is optional
    console.log(`[SessionService] Filesystem save skipped: ${err}`);
  }
}

/**
 * Load session from Supabase (preferred) or filesystem (fallback)
 */
export async function loadSession(sessionId: string): Promise<ThoughtSessionData | null> {
  // Try Supabase first
  const supabaseSession = await loadSessionFromSupabase(sessionId);
  if (supabaseSession) {
    console.log(`[SessionService] Session ${sessionId} loaded from Supabase`);
    return supabaseSession;
  }

  // Fall back to filesystem
  try {
    ensureSessionsDir();
    const filepath = getSessionFilePath(sessionId);
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf-8');
      const parsed = JSON.parse(data);
      console.log(`[SessionService] Session ${sessionId} loaded from filesystem`);

      // Migrate to Supabase
      await saveSessionToSupabase({
        session_id: parsed.sessionId || parsed.session_id,
        product_id: parsed.productId || parsed.product_id,
        turns: parsed.turns,
        status: parsed.status,
        metadata: parsed.metadata,
        created_at: parsed.createdAtIso || parsed.created_at,
        updated_at: parsed.updatedAtIso || parsed.updated_at
      });

      return {
        session_id: parsed.sessionId || parsed.session_id,
        product_id: parsed.productId || parsed.product_id,
        turns: parsed.turns,
        status: parsed.status,
        metadata: parsed.metadata,
        created_at: parsed.createdAtIso || parsed.created_at,
        updated_at: parsed.updatedAtIso || parsed.updated_at
      };
    }
  } catch (err) {
    console.log(`[SessionService] Filesystem load failed: ${err}`);
  }

  return null;
}

/**
 * Delete session from both Supabase and filesystem
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await deleteSessionFromSupabase(sessionId);

  try {
    const filepath = getSessionFilePath(sessionId);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (err) {
    // Filesystem delete is optional
  }
}
