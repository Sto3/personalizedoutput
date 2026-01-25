/**
 * WebRTC Token Endpoint for Redi
 * 
 * Generates ephemeral tokens for iOS clients to connect directly to OpenAI
 * via WebRTC. This bypasses the server for audio streaming, reducing latency
 * by 200-300ms and providing better echo cancellation.
 * 
 * Flow:
 * 1. iOS requests ephemeral token from this endpoint
 * 2. Server creates session with OpenAI REST API
 * 3. Returns ephemeral token (valid ~60 seconds)
 * 4. iOS connects directly to OpenAI via WebRTC using token
 * 
 * Created: Jan 25, 2026
 */

import { Router, Request, Response } from 'express';

const router = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// System prompt for Redi
const SYSTEM_PROMPT = `You are Redi, an AI assistant with real-time camera vision.

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
 * The token is pre-configured with Redi's settings.
 */
router.post('/token', async (req: Request, res: Response) => {
  if (!OPENAI_API_KEY) {
    console.error('[WebRTC Token] ❌ OPENAI_API_KEY not configured');
    res.status(503).json({ error: 'OpenAI API key not configured' });
    return;
  }

  const { mode, voice } = req.body;

  try {
    console.log('[WebRTC Token] 🎫 Generating ephemeral token...');

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
          instructions: SYSTEM_PROMPT,
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
                type: 'near_field'  // Better for mobile devices
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
          // Token valid for 10 minutes (default)
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

    // Return the ephemeral token and session info
    res.json({
      token: data.value,
      expiresAt: data.expires_at,
      sessionId: data.session?.id,
      // Include the WebRTC endpoint URL for iOS
      webrtcUrl: 'https://api.openai.com/v1/realtime/calls'
    });

  } catch (error) {
    console.error('[WebRTC Token] ❌ Error:', error);
    res.status(500).json({ error: 'Failed to generate ephemeral token' });
  }
});

/**
 * GET /api/redi/webrtc/health
 * 
 * Health check for WebRTC token service
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    configured: !!OPENAI_API_KEY,
    endpoint: '/api/redi/webrtc/token'
  });
});

export default router;
