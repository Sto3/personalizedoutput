/**
 * PrivacyService.ts
 * 
 * API-AGNOSTIC PRIVACY MIDDLEWARE
 * 
 * This service handles privacy protections BEFORE data is sent to ANY AI provider.
 * It is designed to work with:
 * - OpenAI Realtime API (current V7)
 * - Cerebras + GPT-4o (V9 dual-brain)
 * - Any future AI provider
 * 
 * Features:
 * - Privacy pause state management
 * - System prompt injection with privacy rules
 * - Audit logging
 * - Frame filtering (future: blur sensitive regions)
 * 
 * Created: Feb 1, 2026
 */

// Privacy rules that get injected into ANY AI provider's system prompt
export const PRIVACY_RULES = `
CRITICAL PRIVACY RULES - YOU MUST FOLLOW THESE:
1. NEVER read, mention, or acknowledge passwords, PINs, or security codes visible on screen
2. NEVER read, mention, or acknowledge credit card numbers, CVVs, or financial account numbers
3. NEVER read, mention, or acknowledge social security numbers or government IDs
4. NEVER read, mention, or acknowledge private keys, API keys, or authentication tokens
5. NEVER read, mention, or acknowledge email addresses in login forms
6. If you see a login page, password field, or payment form, say "I notice you're on a sensitive page - I'll look away until you're done"
7. If asked to read credentials or sensitive data, politely refuse
8. Treat any text in password-style input fields (dots/asterisks) as invisible
9. If you see banking, medical, or legal documents, only describe them generically without reading specifics
`;

export const SCREEN_SHARE_RULES = `
SCREEN SHARE MODE ACTIVE:
- You are viewing the user's computer screen
- Be extra vigilant about privacy - do not read any sensitive information
- Periodically remind the user that screen sharing is active
- If you see login pages, banking sites, or sensitive documents, mention you're "looking away"
`;

// Privacy state management
interface PrivacyState {
  isPaused: boolean;
  pausedAt?: Date;
  sessionId: string;
  screenShareActive: boolean;
}

const privacyStates = new Map<string, PrivacyState>();

/**
 * Get or create privacy state for a session
 */
export function getPrivacyState(sessionId: string): PrivacyState {
  if (!privacyStates.has(sessionId)) {
    privacyStates.set(sessionId, {
      isPaused: false,
      sessionId,
      screenShareActive: false
    });
  }
  return privacyStates.get(sessionId)!;
}

/**
 * Set privacy pause state
 */
export function setPrivacyPause(sessionId: string, paused: boolean): void {
  const state = getPrivacyState(sessionId);
  state.isPaused = paused;
  state.pausedAt = paused ? new Date() : undefined;
  
  console.log(`[Privacy] Session ${sessionId}: Privacy ${paused ? 'PAUSED' : 'RESUMED'}`);
}

/**
 * Set screen share active state
 */
export function setScreenShareActive(sessionId: string, active: boolean): void {
  const state = getPrivacyState(sessionId);
  state.screenShareActive = active;
  
  console.log(`[Privacy] Session ${sessionId}: Screen share ${active ? 'ACTIVE' : 'INACTIVE'}`);
}

/**
 * Check if frames should be sent (returns false if privacy paused)
 */
export function shouldSendFrame(sessionId: string): boolean {
  const state = getPrivacyState(sessionId);
  return !state.isPaused;
}

/**
 * Inject privacy rules into any system prompt
 * This works with ANY AI provider
 */
export function injectPrivacyRules(basePrompt: string, sessionId: string): string {
  const state = getPrivacyState(sessionId);
  
  let prompt = basePrompt;
  
  // Always add base privacy rules
  prompt += '\n\n' + PRIVACY_RULES;
  
  // Add screen share rules if active
  if (state.screenShareActive) {
    prompt += '\n\n' + SCREEN_SHARE_RULES;
  }
  
  return prompt;
}

/**
 * Clean up privacy state when session ends
 */
export function cleanupPrivacyState(sessionId: string): void {
  privacyStates.delete(sessionId);
  console.log(`[Privacy] Session ${sessionId}: Cleaned up`);
}

/**
 * Audit log entry (for future: store in database)
 */
export interface AuditLogEntry {
  timestamp: Date;
  sessionId: string;
  action: 'frame_sent' | 'frame_blocked' | 'privacy_pause' | 'privacy_resume' | 'screen_share_start' | 'screen_share_end';
  provider?: string;
  metadata?: Record<string, any>;
}

const auditLog: AuditLogEntry[] = [];

/**
 * Log an audit entry
 */
export function logAudit(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const fullEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date()
  };
  
  auditLog.push(fullEntry);
  
  // Keep only last 1000 entries in memory (would go to database in production)
  if (auditLog.length > 1000) {
    auditLog.shift();
  }
  
  console.log(`[Audit] ${entry.action} - Session: ${entry.sessionId}${entry.provider ? ` - Provider: ${entry.provider}` : ''}`);
}

/**
 * Get recent audit entries for a session
 */
export function getAuditLog(sessionId: string, limit: number = 100): AuditLogEntry[] {
  return auditLog
    .filter(e => e.sessionId === sessionId)
    .slice(-limit);
}

export default {
  PRIVACY_RULES,
  SCREEN_SHARE_RULES,
  getPrivacyState,
  setPrivacyPause,
  setScreenShareActive,
  shouldSendFrame,
  injectPrivacyRules,
  cleanupPrivacyState,
  logAudit,
  getAuditLog
};
