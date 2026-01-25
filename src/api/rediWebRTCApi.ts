/**
 * Redi WebRTC Token Service
 * 
 * Provides ephemeral tokens for iOS to connect directly to OpenAI's Realtime API via WebRTC.
 * 
 * Benefits of WebRTC over WebSocket:
 * - Built-in echo cancellation (AEC) - SOLVES THE ECHO PROBLEM
 * - Lower latency (direct peer connection)
 * - Better audio quality (Opus codec)
 * - More reliable turn detection
 */

import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();

/**
 * POST /api/redi/webrtc/token
 * Get ephemeral token for OpenAI Realtime API WebRTC connection
 * 
 * This endpoint generates a short-lived token that iOS can use to connect
 * directly to OpenAI's Realtime API via WebRTC. The token expires in ~2 minutes.
 */
router.post('/token', async (req: Request, res: Response) => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    res.status(503).json({ error: 'OpenAI API key not configured' });
    return;
  }

  const { 
    userId,
    mode = 'general',
    voice = 'alloy',
    instructions
  } = req.body;

  try {
    // Build system instructions based on mode
    const systemInstructions = instructions || buildRediInstructions(mode);

    // Request ephemeral token from OpenAI
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
          instructions: systemInstructions,
          audio: {
            input: {
              format: { type: 'audio/pcm', rate: 24000 },
              transcription: { model: 'whisper-1' },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
                create_response: true,
                interrupt_response: true
              }
            },
            output: {
              format: { type: 'audio/pcm', rate: 24000 },
              voice: voice
            }
          }
        },
        expires_after: {
          anchor: 'created_at',
          seconds: 120  // 2 minutes (tokens auto-expire)
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Redi WebRTC] OpenAI token error:', errorText);
      res.status(500).json({ error: 'Failed to get ephemeral token' });
      return;
    }

    const data = await response.json();
    
    console.log(`[Redi WebRTC] Token generated for user ${userId || 'anonymous'}, mode: ${mode}`);

    res.json({
      token: data.value,
      expiresAt: data.expires_at,
      model: 'gpt-realtime',
      voice: voice,
      // Include connection info for iOS
      connectionInfo: {
        callsEndpoint: 'https://api.openai.com/v1/realtime/calls',
        dataChannelName: 'oai-events'
      }
    });

  } catch (error) {
    console.error('[Redi WebRTC] Token generation error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

/**
 * GET /api/redi/webrtc/health
 * Health check for WebRTC service
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'redi-webrtc',
    openaiConfigured: !!process.env.OPENAI_API_KEY
  });
});

/**
 * Build Redi system instructions based on mode
 */
function buildRediInstructions(mode: string): string {
  const baseInstructions = `You are Redi, an AI assistant with real-time camera vision. You can see what the user sees through their camera.

RULES:
- Respond naturally and conversationally
- Keep responses SHORT (under 30 words) unless asked for more detail
- When describing what you see, be brief and specific
- Don't say "I can see" - describe directly
- Be helpful, friendly, and proactive`;

  const modeInstructions: Record<string, string> = {
    general: 'Help with whatever the user needs. Answer questions, provide information, assist with tasks.',
    cooking: 'Help with cooking - identify ingredients, suggest recipes, provide cooking tips, warn about safety.',
    studying: 'Help with learning - explain concepts, quiz the user, provide study tips, help with homework.',
    driving: `You are a driving copilot. SAFETY RULES:
- NEVER engage in conversation that distracts the driver
- Keep ALL responses under 10 words
- Only speak when directly asked or for URGENT safety warnings
- If you see a hazard (pedestrian, stopped car, debris), warn immediately
- For navigation questions, give brief landmark-based directions`,
    meeting: 'Help during meetings - take notes, summarize points, suggest questions, track action items.',
    assembly: 'Help with building/assembly - identify parts, explain steps, provide guidance on construction.'
  };

  return `${baseInstructions}\n\n${modeInstructions[mode] || modeInstructions.general}`;
}

export default router;
