/**
 * Stor Chat API
 *
 * REST API for the Stor AI business assistant.
 */

import { Router, Request, Response } from 'express';
import {
  createSession,
  getSessions,
  getMessages,
  saveMessage,
  chat,
  StorMessage,
} from '../lib/stor/storService';

const router = Router();

/**
 * Create a new chat session
 * POST /api/stor/sessions
 */
router.post('/sessions', async (req: Request, res: Response) => {
  const adminEmail = (req as any).admin?.email;

  if (!adminEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const session = await createSession(adminEmail);

  if (!session) {
    return res.status(500).json({ error: 'Failed to create session' });
  }

  res.json({ session });
});

/**
 * Get recent sessions
 * GET /api/stor/sessions
 */
router.get('/sessions', async (req: Request, res: Response) => {
  const adminEmail = (req as any).admin?.email;

  if (!adminEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const limit = parseInt(req.query.limit as string) || 10;
  const sessions = await getSessions(adminEmail, limit);

  res.json({ sessions });
});

/**
 * Get messages for a session
 * GET /api/stor/sessions/:sessionId/messages
 */
router.get('/sessions/:sessionId/messages', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const messages = await getMessages(sessionId);

  res.json({ messages });
});

/**
 * Send a message and get AI response
 * POST /api/stor/chat
 */
router.post('/chat', async (req: Request, res: Response) => {
  const adminEmail = (req as any).admin?.email;

  if (!adminEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message are required' });
  }

  try {
    // Get conversation history
    const history = await getMessages(sessionId);

    // Save user message
    const userMessage: StorMessage = {
      session_id: sessionId,
      role: 'user',
      content: message,
      is_sensitive: false,
    };
    await saveMessage(userMessage);

    // Get AI response
    const { response, isSensitive } = await chat(sessionId, message, history);

    // Save assistant message
    const assistantMessage: StorMessage = {
      session_id: sessionId,
      role: 'assistant',
      content: response,
      is_sensitive: isSensitive,
    };
    const savedMessage = await saveMessage(assistantMessage);

    res.json({
      message: savedMessage,
      isSensitive,
    });
  } catch (error) {
    console.error('[StorApi] Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

export default router;
