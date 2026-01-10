/**
 * Redi Session Manager
 *
 * Manages the lifecycle of Redi sessions including creation, validation,
 * expiration, cleanup, and multi-phone participant tracking.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  RediSession,
  SessionConfig,
  SessionCosts,
  SessionParticipant,
  RediMode,
  VoiceGender
} from './types';

// In-memory session store (can be moved to Redis/Supabase for production)
const sessions = new Map<string, RediSession>();
const sessionCosts = new Map<string, SessionCosts>();
const sessionParticipants = new Map<string, Map<string, SessionParticipant>>();
const joinCodeToSessionId = new Map<string, string>();

// Session expiration check interval
const CLEANUP_INTERVAL_MS = 60000; // 1 minute
const MAX_PARTICIPANTS = 5;

/**
 * Generate a 6-character alphanumeric join code
 */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate unique join code (retry if collision)
 */
function getUniqueJoinCode(): string {
  let code = generateJoinCode();
  let attempts = 0;
  while (joinCodeToSessionId.has(code) && attempts < 10) {
    code = generateJoinCode();
    attempts++;
  }
  return code;
}

/**
 * Create a new Redi session
 */
export function createSession(
  config: SessionConfig,
  hostDeviceId: string,
  stripePaymentId?: string,
  userId?: string
): RediSession {
  const id = uuidv4();
  const joinCode = getUniqueJoinCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.durationMinutes * 60 * 1000);

  const session: RediSession = {
    id,
    joinCode,
    hostDeviceId,
    userId,
    mode: config.mode,
    sensitivity: config.sensitivity,
    voiceGender: config.voiceGender,
    durationMinutes: config.durationMinutes,
    startedAt: now,
    expiresAt,
    status: 'active',
    stripePaymentId,
    audioOutputMode: 'host_only',
    maxParticipants: MAX_PARTICIPANTS
  };

  sessions.set(id, session);
  joinCodeToSessionId.set(joinCode, id);

  sessionCosts.set(id, {
    transcription: 0,
    vision: 0,
    ai: 0,
    voice: 0,
    total: 0
  });

  // Initialize participants map with host
  const participants = new Map<string, SessionParticipant>();
  participants.set(hostDeviceId, {
    deviceId: hostDeviceId,
    isHost: true,
    joinedAt: now,
    lastActiveAt: now
  });
  sessionParticipants.set(id, participants);

  console.log(`[Redi] Session created: ${id} (code: ${joinCode}, ${config.mode}, ${config.durationMinutes}min)`);
  return session;
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): RediSession | undefined {
  return sessions.get(sessionId);
}

/**
 * Get a session by join code
 */
export function getSessionByJoinCode(joinCode: string): RediSession | undefined {
  const normalizedCode = joinCode.toUpperCase().trim();
  const sessionId = joinCodeToSessionId.get(normalizedCode);
  if (!sessionId) return undefined;
  return sessions.get(sessionId);
}

/**
 * Validate that a session exists and is active
 */
export function validateSession(sessionId: string): { valid: boolean; reason?: string; session?: RediSession } {
  const session = sessions.get(sessionId);

  if (!session) {
    return { valid: false, reason: 'Session not found' };
  }

  if (session.status === 'expired') {
    return { valid: false, reason: 'Session has expired' };
  }

  if (session.status === 'ended') {
    return { valid: false, reason: 'Session has ended' };
  }

  // Check if session has exceeded its time limit
  if (new Date() > session.expiresAt) {
    session.status = 'expired';
    return { valid: false, reason: 'Session time limit exceeded' };
  }

  return { valid: true, session };
}

/**
 * Join a session with a join code
 */
export function joinSession(
  joinCode: string,
  deviceId: string,
  deviceName?: string
): { success: boolean; session?: RediSession; reason?: string } {
  const session = getSessionByJoinCode(joinCode);

  if (!session) {
    return { success: false, reason: 'Invalid join code' };
  }

  const validation = validateSession(session.id);
  if (!validation.valid) {
    return { success: false, reason: validation.reason };
  }

  const participants = sessionParticipants.get(session.id);
  if (!participants) {
    return { success: false, reason: 'Session error' };
  }

  // Check if already in session
  if (participants.has(deviceId)) {
    // Update last active time
    const participant = participants.get(deviceId)!;
    participant.lastActiveAt = new Date();
    return { success: true, session };
  }

  // Check participant limit
  if (participants.size >= session.maxParticipants) {
    return { success: false, reason: `Session is full (max ${session.maxParticipants} devices)` };
  }

  // Add new participant
  const now = new Date();
  participants.set(deviceId, {
    deviceId,
    isHost: false,
    joinedAt: now,
    lastActiveAt: now,
    deviceName
  });

  console.log(`[Redi] Device ${deviceId} joined session ${session.id} (${participants.size}/${session.maxParticipants})`);
  return { success: true, session };
}

/**
 * Leave a session
 */
export function leaveSession(sessionId: string, deviceId: string): boolean {
  const participants = sessionParticipants.get(sessionId);
  if (!participants) return false;

  const participant = participants.get(deviceId);
  if (!participant) return false;

  // Host cannot leave - must end session
  if (participant.isHost) {
    return false;
  }

  participants.delete(deviceId);
  console.log(`[Redi] Device ${deviceId} left session ${sessionId}`);
  return true;
}

/**
 * Get all participants in a session
 */
export function getParticipants(sessionId: string): SessionParticipant[] {
  const participants = sessionParticipants.get(sessionId);
  if (!participants) return [];
  return Array.from(participants.values());
}

/**
 * Get participant count for a session
 */
export function getParticipantCount(sessionId: string): number {
  const participants = sessionParticipants.get(sessionId);
  return participants?.size || 0;
}

/**
 * Check if device is the host of a session
 */
export function isHost(sessionId: string, deviceId: string): boolean {
  const session = sessions.get(sessionId);
  return session?.hostDeviceId === deviceId;
}

/**
 * Update participant's last active time
 */
export function updateParticipantActivity(sessionId: string, deviceId: string): void {
  const participants = sessionParticipants.get(sessionId);
  const participant = participants?.get(deviceId);
  if (participant) {
    participant.lastActiveAt = new Date();
  }
}

/**
 * Update audio output mode (host only)
 */
export function updateAudioOutputMode(
  sessionId: string,
  deviceId: string,
  mode: 'host_only' | 'all_devices'
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  // Only host can change this
  if (session.hostDeviceId !== deviceId) return false;

  session.audioOutputMode = mode;
  console.log(`[Redi] Session ${sessionId} audio mode changed to ${mode}`);
  return true;
}

/**
 * Get audio output mode for a session
 */
export function getAudioOutputMode(sessionId: string): 'host_only' | 'all_devices' {
  const session = sessions.get(sessionId);
  return session?.audioOutputMode || 'host_only';
}

/**
 * Check if a device should receive audio output
 */
export function shouldReceiveAudio(sessionId: string, deviceId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  if (session.audioOutputMode === 'all_devices') return true;
  return session.hostDeviceId === deviceId;
}

/**
 * Update session sensitivity
 */
export function updateSensitivity(sessionId: string, sensitivity: number): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  session.sensitivity = Math.max(0, Math.min(1, sensitivity));
  console.log(`[Redi] Session ${sessionId} sensitivity updated to ${session.sensitivity}`);
  return true;
}

/**
 * Pause a session
 */
export function pauseSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'active') return false;

  session.status = 'paused';
  console.log(`[Redi] Session ${sessionId} paused`);
  return true;
}

/**
 * Resume a paused session
 */
export function resumeSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'paused') return false;

  // Check if still within time limit
  if (new Date() > session.expiresAt) {
    session.status = 'expired';
    return false;
  }

  session.status = 'active';
  console.log(`[Redi] Session ${sessionId} resumed`);
  return true;
}

/**
 * End a session
 */
export function endSession(sessionId: string): { session: RediSession; costs: SessionCosts } | undefined {
  const session = sessions.get(sessionId);
  const costs = sessionCosts.get(sessionId);

  if (!session || !costs) return undefined;

  session.status = 'ended';

  // Clean up join code mapping
  joinCodeToSessionId.delete(session.joinCode);

  const participantCount = getParticipantCount(sessionId);
  console.log(`[Redi] Session ${sessionId} ended. Participants: ${participantCount}, Total cost: $${costs.total.toFixed(4)}`);

  return { session, costs };
}

/**
 * Get remaining time for a session in seconds
 */
export function getRemainingTime(sessionId: string): number {
  const session = sessions.get(sessionId);
  if (!session) return 0;

  const remaining = Math.max(0, session.expiresAt.getTime() - Date.now());
  return Math.floor(remaining / 1000);
}

/**
 * Track cost for a session
 */
export function trackCost(
  sessionId: string,
  category: 'transcription' | 'vision' | 'ai' | 'voice',
  amount: number
): void {
  const costs = sessionCosts.get(sessionId);
  if (!costs) return;

  costs[category] += amount;
  costs.total = costs.transcription + costs.vision + costs.ai + costs.voice;
}

/**
 * Get costs for a session
 */
export function getSessionCosts(sessionId: string): SessionCosts | undefined {
  return sessionCosts.get(sessionId);
}

/**
 * Get all active sessions (for admin/monitoring)
 */
export function getActiveSessions(): RediSession[] {
  return Array.from(sessions.values()).filter(s => s.status === 'active');
}

/**
 * Cleanup expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, session] of sessions) {
    // Remove sessions that ended or expired more than 1 hour ago
    const sessionEndTime = session.status === 'ended' || session.status === 'expired'
      ? session.expiresAt.getTime()
      : session.expiresAt.getTime();

    if (now - sessionEndTime > 3600000) {
      sessions.delete(id);
      sessionCosts.delete(id);
      sessionParticipants.delete(id);
      joinCodeToSessionId.delete(session.joinCode);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[Redi] Cleaned up ${cleaned} expired sessions`);
  }
}

// Start cleanup interval
setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL_MS);

/**
 * Get session statistics
 */
export function getSessionStats(): {
  active: number;
  total: number;
  totalRevenue: number;
  averageSessionLength: number;
  totalParticipants: number;
} {
  const allSessions = Array.from(sessions.values());
  const activeSessions = allSessions.filter(s => s.status === 'active');

  const totalRevenue = allSessions.reduce((sum, s) => {
    return sum + (s.durationMinutes === 30 ? 26 : 49);
  }, 0);

  const avgLength = allSessions.length > 0
    ? allSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / allSessions.length
    : 0;

  const totalParticipants = activeSessions.reduce((sum, s) => {
    return sum + getParticipantCount(s.id);
  }, 0);

  return {
    active: activeSessions.length,
    total: allSessions.length,
    totalRevenue,
    averageSessionLength: avgLength,
    totalParticipants
  };
}
