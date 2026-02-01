/**
 * WebRTC Token Endpoint for Redi
 * 
 * Generates ephemeral tokens for iOS clients to connect directly to OpenAI
 * via WebRTC. Uses API-AGNOSTIC privacy middleware that works with any provider.
 * 
 * Privacy rules are injected via PrivacyService, not hardcoded here.
 * This allows the same privacy protections to work with:
 * - OpenAI Realtime API (V7)
 * - Cerebras + GPT-4o (V9)
 * - Any future AI provider
 * 
 * Created: Jan 25, 2026
 * Updated: Feb 1, 2026 - Use API-agnostic PrivacyService
 */

import { Router, Request, Response } from 'express';
import PrivacyService from '../services/PrivacyService';

const router = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Base system prompt (privacy rules injected by PrivacyService)
const BASE_SYSTEM_PROMPT = `You are Redi, an AI assistant with real-time camera and screen vision.

RULES:
- Respond naturally to what the user asks
- If they ask what you see, describe the image briefly (10-20 words)
- Be conversational and helpful
- Don't say "I see" - describe directly
- Keep responses SHORT - under 30 words unless asked for more`;

/**
 * POST /api/redi/webrtc/token
 * 
 * Generate an ephemeral token for WebRTC connection to OpenAI Realtime API.
 * Privacy rules are injected based on session state.
 */
router.post('/token', async (req: Request, res: Response) => {
  if (!OPENAI_API_KEY) {
    console.error('[WebRTC Token] ❌ OPENAI_API_KEY not configured');
    res.status(503).json({ error: 'OpenAI API key not configured' });
    return;
  }

  const { mode, voice, screenShareActive, sessionId } = req.body;

  // Generate session ID if not provided
  const sid = sessionId || `session_${Date.now()}`;

  // Update privacy state
  if (screenShareActive !== undefined) {
    PrivacyService.setScreenShareActive(sid, screenShareActive);
  }

  // Inject privacy rules into system prompt (API-AGNOSTIC)
  const instructions = PrivacyService.injectPrivacyRules(BASE_SYSTEM_PROMPT, sid);

  try {
    console.log('[WebRTC Token] 🎫 Generating ephemeral token...');
    console.log(`[WebRTC Token] Session: ${sid}, Screen Share: ${screenShareActive}`);

    // Log audit entry
    PrivacyService.logAudit({
      sessionId: sid,
      action: screenShareActive ? 'screen_share_start' : 'frame_sent',
      provider: 'openai_realtime'
    });

    // Use the new client_secrets endpoint (GA interface)
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
          instructions: instructions, // Privacy-enhanced prompt
          audio: {
            input: {
              format: {
                type: 'audio/pcm',
                rate: 24000
              },
              transcription: {
                model: 'whisper-1'
              },
              noise_reduction: {
                type: 'near_field'
              },
              turn_detection: {
                type: 'semantic_vad',
                eagerness: 'high',
                create_response: true,
                interrupt_response: true
              }
            },
            output: {
              format: {
                type: 'audio/pcm',
                rate: 24000
              },
              voice: voice || 'alloy',
              speed: 1.0
            }
          },
        },
        expiration: {
          ttl_seconds: 600  // 10 minutes
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WebRTC Token] ❌ OpenAI error:', response.status, errorText);
      res.status(response.status).json({ 
        error: 'Failed to generate token',
        details: errorText 
      });
      return;
    }

    const data = await response.json();
    
    console.log('[WebRTC Token] ✅ Token generated, expires at:', new Date(data.expires_at * 1000).toISOString());

    res.json({
      token: data.value,
      expiresAt: data.expires_at,
      sessionId: sid,
      webrtcUrl: 'https://api.openai.com/v1/realtime/calls'
    });

  } catch (error) {
    console.error('[WebRTC Token] ❌ Error:', error);
    res.status(500).json({ error: 'Failed to generate ephemeral token' });
  }
});

/**
 * POST /api/redi/webrtc/privacy
 * Update privacy state for a session
 */
router.post('/privacy', (req: Request, res: Response) => {
  const { sessionId, paused, screenShareActive } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId required' });
    return;
  }

  if (paused !== undefined) {
    PrivacyService.setPrivacyPause(sessionId, paused);
    PrivacyService.logAudit({
      sessionId,
      action: paused ? 'privacy_pause' : 'privacy_resume'
    });
  }

  if (screenShareActive !== undefined) {
    PrivacyService.setScreenShareActive(sessionId, screenShareActive);
    PrivacyService.logAudit({
      sessionId,
      action: screenShareActive ? 'screen_share_start' : 'screen_share_end'
    });
  }

  const state = PrivacyService.getPrivacyState(sessionId);
  
  res.json({
    success: true,
    state: {
      isPaused: state.isPaused,
      screenShareActive: state.screenShareActive
    }
  });
});

/**
 * GET /api/redi/webrtc/privacy/:sessionId
 * Get current privacy state
 */
router.get('/privacy/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const state = PrivacyService.getPrivacyState(sessionId);
  
  res.json({
    isPaused: state.isPaused,
    screenShareActive: state.screenShareActive,
    shouldSendFrames: PrivacyService.shouldSendFrame(sessionId)
  });
});

/**
 * GET /api/redi/webrtc/health
 * Health check for WebRTC token service
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    configured: !!OPENAI_API_KEY,
    endpoint: '/api/redi/webrtc/token',
    privacyService: 'enabled'
  });
});

export default router;
