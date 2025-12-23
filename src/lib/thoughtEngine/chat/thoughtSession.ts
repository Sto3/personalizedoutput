/**
 * Thought Session Model
 *
 * Core data model for chat-based thought organization sessions.
 * Supports Santa messages, Holiday Reset, and New Year Reset products.
 *
 * Now uses Supabase for persistence (survives Render deploys)
 * with filesystem fallback for local development.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  saveSession,
  loadSession,
  deleteSession as deleteSessionFromStore,
  ThoughtSessionData
} from '../../supabase/sessionService';

// ============================================================
// TYPES
// ============================================================

export type ProductId = 'santa_message' | 'holiday_reset' | 'new_year_reset' | string;

export type SessionStatus = 'in_progress' | 'ready_for_generation' | 'completed';

export interface ThoughtTurn {
  role: 'user' | 'assistant';
  content: string;
  timestampIso: string;
}

export interface ThoughtSession {
  sessionId: string;
  productId: ProductId;
  createdAtIso: string;
  updatedAtIso: string;
  turns: ThoughtTurn[];
  status: SessionStatus;
  metadata?: Record<string, unknown>;
}

// ============================================================
// PERSISTENCE CONFIGURATION (for fallback)
// ============================================================

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions');

function ensureSessionsDir(): void {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

// ============================================================
// CONVERSION HELPERS
// ============================================================

function toStorageFormat(session: ThoughtSession): ThoughtSessionData {
  return {
    session_id: session.sessionId,
    product_id: session.productId,
    turns: session.turns,
    status: session.status,
    metadata: session.metadata,
    created_at: session.createdAtIso,
    updated_at: session.updatedAtIso
  };
}

function fromStorageFormat(data: ThoughtSessionData): ThoughtSession {
  return {
    sessionId: data.session_id,
    productId: data.product_id,
    turns: data.turns,
    status: data.status,
    metadata: data.metadata,
    createdAtIso: data.created_at,
    updatedAtIso: data.updated_at
  };
}

// ============================================================
// CRUD OPERATIONS
// ============================================================

/**
 * Create a new thought session for a product
 */
export function createThoughtSession(productId: ProductId): ThoughtSession {
  const now = new Date().toISOString();
  const session: ThoughtSession = {
    sessionId: uuidv4(),
    productId,
    createdAtIso: now,
    updatedAtIso: now,
    turns: [],
    status: 'in_progress'
  };

  // Save immediately (async, but don't block)
  saveSession(toStorageFormat(session)).catch(err => {
    console.error(`[ThoughtSession] Background save failed:`, err);
  });

  console.log(`[ThoughtSession] Created session ${session.sessionId} for ${productId}`);
  return session;
}

/**
 * Get a thought session by ID (async - now loads from Supabase)
 */
export async function getThoughtSessionAsync(sessionId: string): Promise<ThoughtSession | null> {
  const data = await loadSession(sessionId);
  if (!data) {
    console.log(`[ThoughtSession] Session not found: ${sessionId}`);
    return null;
  }
  return fromStorageFormat(data);
}

/**
 * Get a thought session by ID (sync - filesystem only, for backwards compat)
 */
export function getThoughtSession(sessionId: string): ThoughtSession | null {
  ensureSessionsDir();

  const filepath = path.join(SESSIONS_DIR, `${sessionId}.json`);

  if (!fs.existsSync(filepath)) {
    // Don't log - async version will try Supabase
    return null;
  }

  try {
    const data = fs.readFileSync(filepath, 'utf-8');
    const parsed = JSON.parse(data);

    // Handle both snake_case (from Supabase save) and camelCase (legacy) formats
    if (parsed.session_id) {
      // Convert from snake_case (ThoughtSessionData format)
      return {
        sessionId: parsed.session_id,
        productId: parsed.product_id,
        turns: parsed.turns,
        status: parsed.status,
        metadata: parsed.metadata,
        createdAtIso: parsed.created_at,
        updatedAtIso: parsed.updated_at
      };
    }

    // Already in camelCase (ThoughtSession format)
    return parsed as ThoughtSession;
  } catch (error) {
    console.error(`[ThoughtSession] Error reading session ${sessionId}:`, error);
    return null;
  }
}

/**
 * Save a thought session (async - saves to Supabase + filesystem)
 */
export async function saveThoughtSession(session: ThoughtSession): Promise<void> {
  session.updatedAtIso = new Date().toISOString();
  await saveSession(toStorageFormat(session));
  console.log(`[ThoughtSession] Saved session ${session.sessionId}`);
}

/**
 * Save a thought session (sync - filesystem only)
 */
export function saveThoughtSessionSync(session: ThoughtSession): void {
  ensureSessionsDir();

  session.updatedAtIso = new Date().toISOString();
  const filepath = path.join(SESSIONS_DIR, `${session.sessionId}.json`);

  try {
    fs.writeFileSync(filepath, JSON.stringify(session, null, 2), 'utf-8');
    // Also trigger async Supabase save
    saveSession(toStorageFormat(session)).catch(err => {
      console.error(`[ThoughtSession] Background Supabase save failed:`, err);
    });
  } catch (error) {
    console.error(`[ThoughtSession] Error saving session ${session.sessionId}:`, error);
    throw error;
  }
}

/**
 * Delete a thought session
 */
export async function deleteThoughtSession(sessionId: string): Promise<boolean> {
  try {
    await deleteSessionFromStore(sessionId);
    console.log(`[ThoughtSession] Deleted session ${sessionId}`);
    return true;
  } catch (error) {
    console.error(`[ThoughtSession] Error deleting session ${sessionId}:`, error);
    return false;
  }
}

/**
 * List all sessions (for debugging/admin) - filesystem only
 */
export function listAllSessions(): ThoughtSession[] {
  ensureSessionsDir();

  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
  const sessions: ThoughtSession[] = [];

  for (const file of files) {
    try {
      const data = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8');
      sessions.push(JSON.parse(data));
    } catch (error) {
      console.error(`[ThoughtSession] Error reading ${file}:`, error);
    }
  }

  return sessions.sort((a, b) =>
    new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime()
  );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Add a turn to a session
 */
export function addTurn(
  session: ThoughtSession,
  role: 'user' | 'assistant',
  content: string
): ThoughtSession {
  session.turns.push({
    role,
    content,
    timestampIso: new Date().toISOString()
  });
  return session;
}

/**
 * Get the conversation as a formatted string (for prompts)
 */
export function getConversationTranscript(session: ThoughtSession): string {
  return session.turns
    .map(turn => `${turn.role === 'user' ? 'Parent' : 'Guide'}: ${turn.content}`)
    .join('\n\n');
}

/**
 * Extract key information from conversation for generation
 */
export function extractConversationContext(session: ThoughtSession): Record<string, string[]> {
  const context: Record<string, string[]> = {
    userStatements: [],
    assistantObservations: [],
    mentionedNames: [],
    emotionalThemes: [],
    specificMoments: []
  };

  for (const turn of session.turns) {
    if (turn.role === 'user') {
      context.userStatements.push(turn.content);

      // Extract names (simple pattern matching)
      const nameMatches = turn.content.match(/\b[A-Z][a-z]+\b/g);
      if (nameMatches) {
        context.mentionedNames.push(...nameMatches.filter(n =>
          !['I', 'The', 'This', 'That', 'When', 'What', 'How', 'Why', 'She', 'He', 'They', 'We', 'My', 'Our'].includes(n)
        ));
      }
    } else {
      context.assistantObservations.push(turn.content);
    }
  }

  // Dedupe names
  context.mentionedNames = [...new Set(context.mentionedNames)];

  return context;
}
