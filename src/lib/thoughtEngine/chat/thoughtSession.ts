/**
 * Thought Session Model
 *
 * Core data model for chat-based thought organization sessions.
 * Supports Santa messages, Holiday Reset, and New Year Reset products.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
// PERSISTENCE CONFIGURATION
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
// CRUD OPERATIONS
// ============================================================

/**
 * Create a new thought session for a product
 */
export function createThoughtSession(productId: ProductId): ThoughtSession {
  ensureSessionsDir();

  const now = new Date().toISOString();
  const session: ThoughtSession = {
    sessionId: uuidv4(),
    productId,
    createdAtIso: now,
    updatedAtIso: now,
    turns: [],
    status: 'in_progress'
  };

  // Save immediately
  saveThoughtSessionSync(session);

  console.log(`[ThoughtSession] Created session ${session.sessionId} for ${productId}`);
  return session;
}

/**
 * Get a thought session by ID
 */
export function getThoughtSession(sessionId: string): ThoughtSession | null {
  ensureSessionsDir();

  const filepath = getSessionFilePath(sessionId);

  if (!fs.existsSync(filepath)) {
    console.log(`[ThoughtSession] Session not found: ${sessionId}`);
    return null;
  }

  try {
    const data = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(data) as ThoughtSession;
  } catch (error) {
    console.error(`[ThoughtSession] Error reading session ${sessionId}:`, error);
    return null;
  }
}

/**
 * Save a thought session (async)
 */
export async function saveThoughtSession(session: ThoughtSession): Promise<void> {
  ensureSessionsDir();

  session.updatedAtIso = new Date().toISOString();
  const filepath = getSessionFilePath(session.sessionId);

  try {
    await fs.promises.writeFile(filepath, JSON.stringify(session, null, 2), 'utf-8');
    console.log(`[ThoughtSession] Saved session ${session.sessionId}`);
  } catch (error) {
    console.error(`[ThoughtSession] Error saving session ${session.sessionId}:`, error);
    throw error;
  }
}

/**
 * Save a thought session (sync)
 */
export function saveThoughtSessionSync(session: ThoughtSession): void {
  ensureSessionsDir();

  session.updatedAtIso = new Date().toISOString();
  const filepath = getSessionFilePath(session.sessionId);

  try {
    fs.writeFileSync(filepath, JSON.stringify(session, null, 2), 'utf-8');
  } catch (error) {
    console.error(`[ThoughtSession] Error saving session ${session.sessionId}:`, error);
    throw error;
  }
}

/**
 * Delete a thought session
 */
export function deleteThoughtSession(sessionId: string): boolean {
  const filepath = getSessionFilePath(sessionId);

  if (!fs.existsSync(filepath)) {
    return false;
  }

  try {
    fs.unlinkSync(filepath);
    console.log(`[ThoughtSession] Deleted session ${sessionId}`);
    return true;
  } catch (error) {
    console.error(`[ThoughtSession] Error deleting session ${sessionId}:`, error);
    return false;
  }
}

/**
 * List all sessions (for debugging/admin)
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
