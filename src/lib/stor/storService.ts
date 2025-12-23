/**
 * Stor Chat Service
 *
 * AI-powered business assistant for the admin dashboard.
 * Handles conversations, context, and sensitivity flagging.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseServiceClient, isSupabaseServiceConfigured } from '../supabase/client';

// ============================================================
// TYPES
// ============================================================

export interface StorMessage {
  id?: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  is_sensitive: boolean;
  created_at?: string;
}

export interface StorSession {
  id: string;
  admin_email: string;
  title?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

// ============================================================
// BUSINESS CONTEXT
// ============================================================

const BUSINESS_CONTEXT = `
You are Stor, an AI business assistant for Personalized Output (personalizedoutput.com).

ABOUT THE BUSINESS:
- Personalized Output creates deeply personalized digital products using AI
- Main products: Vision Boards ($14.99), Thought Organizer Planners ($19.99), Santa Messages ($20)
- Products are instant digital downloads - no shipping
- Target customers: Gift-givers, parents, people looking for meaningful personal gifts
- Unique value prop: Deep personalization through immersive questionnaires that extract real stories

CURRENT PRODUCTS:
1. Vision Board - Beautiful vision boards with AI-generated images based on user's goals
2. Thought Organizer - Deep reflection planners (Holiday Reset, New Year Reset, Clarity Planner)
3. Santa Message - Personalized audio messages from Santa mentioning specific details about the child

TECH STACK:
- Frontend: Custom HTML/CSS/JS served from Express
- Backend: Node.js + Express + TypeScript
- Database: Supabase (Postgres)
- AI: Anthropic Claude for content, ElevenLabs for audio, Ideogram for images
- Payments: Stripe
- Hosting: Render.com
- Domain: personalizedoutput.com

YOUR ROLE:
- Answer questions about the business, strategy, and operations
- Help analyze data and metrics
- Provide insights and recommendations
- Be a thought partner for business decisions
- Flag sensitive information appropriately

GUIDELINES:
- Be concise but thorough
- Use data when available
- Provide actionable recommendations
- Be honest about limitations
- Maintain confidentiality of business data
`;

// ============================================================
// SENSITIVITY DETECTION
// ============================================================

const SENSITIVE_PATTERNS = [
  /password/i,
  /api.?key/i,
  /secret/i,
  /credential/i,
  /stripe.?key/i,
  /customer.?email/i,
  /customer.?name/i,
  /order.?id/i,
  /credit.?card/i,
  /ssn|social.?security/i,
  /phone.?number/i,
  /address/i,
];

export function isSensitiveContent(content: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(content));
}

// ============================================================
// CHAT FUNCTIONS
// ============================================================

/**
 * Create a new chat session
 */
export async function createSession(adminEmail: string): Promise<StorSession | null> {
  if (!isSupabaseServiceConfigured()) {
    console.log('[Stor] Supabase not configured, using in-memory session');
    return {
      id: `session_${Date.now()}`,
      admin_email: adminEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
    };
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('stor_sessions')
    .insert({
      admin_email: adminEmail,
      title: 'New Conversation',
    })
    .select()
    .single();

  if (error) {
    console.error('[Stor] Error creating session:', error);
    return null;
  }

  return data as StorSession;
}

/**
 * Get recent sessions for an admin
 */
export async function getSessions(adminEmail: string, limit = 10): Promise<StorSession[]> {
  if (!isSupabaseServiceConfigured()) {
    return [];
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('stor_sessions')
    .select('*')
    .eq('admin_email', adminEmail)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Stor] Error fetching sessions:', error);
    return [];
  }

  return data as StorSession[];
}

/**
 * Get messages for a session
 */
export async function getMessages(sessionId: string): Promise<StorMessage[]> {
  if (!isSupabaseServiceConfigured()) {
    return [];
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('stor_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Stor] Error fetching messages:', error);
    return [];
  }

  return data as StorMessage[];
}

/**
 * Save a message
 */
export async function saveMessage(message: StorMessage): Promise<StorMessage | null> {
  if (!isSupabaseServiceConfigured()) {
    return { ...message, id: `msg_${Date.now()}`, created_at: new Date().toISOString() };
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('stor_messages')
    .insert({
      session_id: message.session_id,
      role: message.role,
      content: message.content,
      is_sensitive: message.is_sensitive,
    })
    .select()
    .single();

  if (error) {
    console.error('[Stor] Error saving message:', error);
    return null;
  }

  // Update session's updated_at and message_count
  await supabase
    .from('stor_sessions')
    .update({
      updated_at: new Date().toISOString(),
      message_count: await getMessageCount(message.session_id),
    })
    .eq('id', message.session_id);

  return data as StorMessage;
}

async function getMessageCount(sessionId: string): Promise<number> {
  if (!isSupabaseServiceConfigured()) return 0;

  const supabase = getSupabaseServiceClient();
  const { count } = await supabase
    .from('stor_messages')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  return count || 0;
}

/**
 * Chat with Stor (the AI assistant)
 */
export async function chat(
  sessionId: string,
  userMessage: string,
  conversationHistory: StorMessage[] = []
): Promise<{ response: string; isSensitive: boolean }> {
  const anthropic = new Anthropic();

  // Check for sensitive content in user message
  const userSensitive = isSensitiveContent(userMessage);

  // Build messages for Claude
  const messages = [
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: BUSINESS_CONTEXT,
      messages,
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I encountered an issue processing your request.';

    // Check for sensitive content in response
    const responseSensitive = isSensitiveContent(assistantMessage);

    return {
      response: assistantMessage,
      isSensitive: userSensitive || responseSensitive,
    };
  } catch (error) {
    console.error('[Stor] Chat error:', error);
    return {
      response: 'I apologize, but I encountered an error. Please try again.',
      isSensitive: false,
    };
  }
}

// ============================================================
// SQL FOR DATABASE TABLES
// ============================================================

export const STOR_TABLES_SQL = `
-- Stor Sessions Table
CREATE TABLE IF NOT EXISTS stor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stor Messages Table
CREATE TABLE IF NOT EXISTS stor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES stor_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  is_sensitive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stor_sessions_admin ON stor_sessions(admin_email);
CREATE INDEX IF NOT EXISTS idx_stor_sessions_updated ON stor_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_stor_messages_session ON stor_messages(session_id);

-- RLS Policies (optional - tables are accessed via service role)
ALTER TABLE stor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stor_messages ENABLE ROW LEVEL SECURITY;
`;
