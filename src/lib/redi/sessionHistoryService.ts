/**
 * Session History Service
 *
 * Tracks and stores Redi session history for user progress viewing.
 */

import { getSupabaseServiceClient, isSupabaseServiceConfigured } from '../supabase/client';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Helper to get supabase client
function getSupabase() {
  if (!isSupabaseServiceConfigured()) {
    throw new Error('Supabase not configured');
  }
  return getSupabaseServiceClient();
}

export interface SessionHistoryEntry {
  id: string;
  userId: string;
  deviceId?: string;
  mode: string;
  durationMinutes: number;
  actualDurationSeconds?: number;
  aiResponsesCount: number;
  userQuestionsCount: number;
  snapshotsAnalyzed: number;
  motionClipsAnalyzed: number;
  aiSummary?: string;
  keyFeedback?: string[];
  startedAt: Date;
  endedAt?: Date;
}

// In-memory tracking for active sessions
const activeSessions = new Map<string, {
  userId: string;
  deviceId?: string;
  mode: string;
  durationMinutes: number;
  startedAt: Date;
  aiResponses: string[];
  userQuestions: string[];
  snapshotsAnalyzed: number;
  motionClipsAnalyzed: number;
  keyFeedback: string[];
}>();

/**
 * Start tracking a new session
 */
export function startSessionTracking(
  sessionId: string,
  userId: string,
  mode: string,
  durationMinutes: number,
  deviceId?: string
): void {
  activeSessions.set(sessionId, {
    userId,
    deviceId,
    mode,
    durationMinutes,
    startedAt: new Date(),
    aiResponses: [],
    userQuestions: [],
    snapshotsAnalyzed: 0,
    motionClipsAnalyzed: 0,
    keyFeedback: []
  });

  console.log(`[Session History] Started tracking session ${sessionId} for user ${userId}`);
}

/**
 * Record an AI response during the session
 */
export function recordAIResponse(sessionId: string, response: string, isKeyFeedback: boolean = false): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  session.aiResponses.push(response);
  if (isKeyFeedback && response.length > 20) {
    session.keyFeedback.push(response);
  }
}

/**
 * Record a user question during the session
 */
export function recordUserQuestion(sessionId: string, question: string): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  session.userQuestions.push(question);
}

/**
 * Record snapshot analysis
 */
export function recordSnapshotAnalysis(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  session.snapshotsAnalyzed++;
}

/**
 * Record visual/snapshot analysis with description
 */
export function recordVisualAnalysis(sessionId: string, description: string): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  session.snapshotsAnalyzed++;

  // If the description contains useful feedback, add to keyFeedback
  if (description.length > 50 && session.keyFeedback.length < 10) {
    const firstSentence = description.split('.')[0] + '.';
    if (firstSentence.length > 20) {
      session.keyFeedback.push(firstSentence);
    }
  }
}

/**
 * Record motion clip analysis with description
 */
export function recordMotionClipAnalysis(sessionId: string, description: string): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  session.motionClipsAnalyzed++;

  // Motion analysis often contains valuable feedback
  if (description.length > 30 && session.keyFeedback.length < 10) {
    const firstSentence = description.split('.')[0] + '.';
    if (firstSentence.length > 20) {
      session.keyFeedback.push(firstSentence);
    }
  }
}

/**
 * End session and save to database
 */
export async function endSessionTracking(sessionId: string): Promise<SessionHistoryEntry | null> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    console.warn(`[Session History] No active session found for ${sessionId}`);
    return null;
  }

  const endedAt = new Date();
  const actualDurationSeconds = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);

  // Generate AI summary of the session
  let aiSummary: string | undefined;
  try {
    aiSummary = await generateSessionSummary(session);
  } catch (error) {
    console.error('[Session History] Failed to generate summary:', error);
  }

  // Prepare entry for database
  const entry = {
    user_id: session.userId,
    device_id: session.deviceId,
    mode: session.mode,
    duration_minutes: session.durationMinutes,
    actual_duration_seconds: actualDurationSeconds,
    ai_responses_count: session.aiResponses.length,
    user_questions_count: session.userQuestions.length,
    snapshots_analyzed: session.snapshotsAnalyzed,
    motion_clips_analyzed: session.motionClipsAnalyzed,
    ai_summary: aiSummary,
    key_feedback: session.keyFeedback.slice(0, 5), // Keep top 5 feedback points
    started_at: session.startedAt.toISOString(),
    ended_at: endedAt.toISOString()
  };

  // Save to Supabase
  try {
    const { data, error } = await getSupabase()
      .from('redi_session_history')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error('[Session History] Failed to save:', error);
    } else {
      console.log(`[Session History] Saved session ${sessionId}`);
    }

    // Clean up
    activeSessions.delete(sessionId);

    return data ? mapToSessionHistoryEntry(data) : null;
  } catch (error) {
    console.error('[Session History] Database error:', error);
    activeSessions.delete(sessionId);
    return null;
  }
}

/**
 * Get session history for a user
 */
export async function getUserSessionHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<SessionHistoryEntry[]> {
  try {
    const { data, error } = await getSupabase()
      .from('redi_session_history')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Session History] Failed to fetch:', error);
      return [];
    }

    return (data || []).map(mapToSessionHistoryEntry);
  } catch (error) {
    console.error('[Session History] Database error:', error);
    return [];
  }
}

/**
 * Get session stats for a user
 */
export async function getUserSessionStats(userId: string): Promise<{
  totalSessions: number;
  totalMinutes: number;
  favoriteMode: string | null;
  averageSessionLength: number;
}> {
  try {
    const { data, error } = await getSupabase()
      .from('redi_session_history')
      .select('mode, actual_duration_seconds')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      return {
        totalSessions: 0,
        totalMinutes: 0,
        favoriteMode: null,
        averageSessionLength: 0
      };
    }

    const totalSessions = data.length;
    const totalSeconds = data.reduce((sum, s) => sum + (s.actual_duration_seconds || 0), 0);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const averageSessionLength = Math.floor(totalSeconds / totalSessions / 60);

    // Find favorite mode
    const modeCounts = data.reduce((acc, s) => {
      acc[s.mode] = (acc[s.mode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const favoriteMode = Object.entries(modeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      totalSessions,
      totalMinutes,
      favoriteMode,
      averageSessionLength
    };
  } catch (error) {
    console.error('[Session History] Stats error:', error);
    return {
      totalSessions: 0,
      totalMinutes: 0,
      favoriteMode: null,
      averageSessionLength: 0
    };
  }
}

/**
 * Generate a summary of the session using Claude
 */
async function generateSessionSummary(session: {
  mode: string;
  aiResponses: string[];
  userQuestions: string[];
  keyFeedback: string[];
}): Promise<string> {
  if (session.aiResponses.length === 0 && session.userQuestions.length === 0) {
    return `${getModeDisplayName(session.mode)} session completed.`;
  }

  const prompt = `Summarize this Redi AI session in 1-2 sentences. Be specific about what was practiced/discussed.

Mode: ${getModeDisplayName(session.mode)}
User questions: ${session.userQuestions.slice(0, 5).join('; ') || 'None'}
Key AI feedback given: ${session.keyFeedback.slice(0, 5).join('; ') || 'General guidance'}
Total AI responses: ${session.aiResponses.length}

Write a brief, helpful summary like: "Practiced piano scales with focus on hand positioning. Improved finger independence on the right hand."`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0];
  return text.type === 'text' ? text.text : `${getModeDisplayName(session.mode)} session completed.`;
}

function getModeDisplayName(mode: string): string {
  const modes: Record<string, string> = {
    studying: 'Studying & Learning',
    meeting: 'Meeting & Presentation',
    sports: 'Sports & Movement',
    music: 'Music & Instrument',
    assembly: 'Building & Assembly',
    monitoring: 'Watching Over'
  };
  return modes[mode] || mode;
}

function mapToSessionHistoryEntry(data: any): SessionHistoryEntry {
  return {
    id: data.id,
    userId: data.user_id,
    deviceId: data.device_id,
    mode: data.mode,
    durationMinutes: data.duration_minutes,
    actualDurationSeconds: data.actual_duration_seconds,
    aiResponsesCount: data.ai_responses_count,
    userQuestionsCount: data.user_questions_count,
    snapshotsAnalyzed: data.snapshots_analyzed,
    motionClipsAnalyzed: data.motion_clips_analyzed,
    aiSummary: data.ai_summary,
    keyFeedback: data.key_feedback,
    startedAt: new Date(data.started_at),
    endedAt: data.ended_at ? new Date(data.ended_at) : undefined
  };
}
