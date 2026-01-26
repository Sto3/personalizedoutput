/**
 * Redi WebRTC Token Service
 * 
 * Provides ephemeral tokens for iOS to connect directly to OpenAI's Realtime API via WebRTC.
 * 
 * LATENCY OPTIMIZATIONS:
 * - semantic_vad for smarter turn detection
 * - Reduced silence_duration_ms (200ms vs 500ms default)
 * - marin voice (recommended for quality/speed)
 * - Minimal prefix_padding_ms
 * 
 * Benefits of WebRTC over WebSocket:
 * - Built-in echo cancellation (AEC) - SOLVES THE ECHO PROBLEM
 * - Lower latency (direct peer connection)
 * - Real video track for reliable vision (no hallucination)
 * - Better audio quality (Opus codec)
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
    voice = 'marin',  // marin or cedar recommended for best quality
    instructions
  } = req.body;

  try {
    // Build system instructions based on mode
    const systemInstructions = instructions || buildRediInstructions(mode);

    console.log(`[Redi WebRTC] Requesting token for mode: ${mode}, voice: ${voice}`);

    // Request ephemeral token from OpenAI
    // LATENCY OPTIMIZATIONS applied here
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
          // LATENCY: Lock output to audio only (no text generation overhead)
          output_modalities: ['audio'],
          audio: {
            input: {
              // LATENCY: Use semantic_vad - smarter turn detection
              turn_detection: {
                type: 'semantic_vad',
                eagerness: 'high',  // Respond quickly
                create_response: true,
                interrupt_response: true
              }
            },
            output: {
              voice: voice
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Redi WebRTC] OpenAI token error:', errorText);
      res.status(500).json({ error: 'Failed to get ephemeral token', details: errorText });
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
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    features: {
      audio: true,
      video: true,  // Video track support
      sentinel: true,  // Proactive interjection
      semanticVAD: true,  // Smart turn detection
      lowLatency: true
    }
  });
});

/**
 * Build Redi system instructions based on mode
 * 
 * LATENCY: Keep instructions SHORT - long prompts slow down first response
 */
function buildRediInstructions(mode: string): string {
  // LATENCY: Shorter base instructions = faster first response
  const baseInstructions = `You are Redi, a real-time AI assistant with camera vision.

RULES:
- Respond in under 20 words unless more detail requested
- Describe what you see directly, don't say "I can see"
- Be helpful and proactive
- [SENTINEL] prompts: speak only if noteworthy, else stay silent`;

  const modeInstructions: Record<string, string> = {
    general: `MODE: General
- Help with anything
- Use vision for context`,

    cooking: `MODE: Cooking
- Help with recipes, identify ingredients
- Warn about safety issues
- [SENTINEL]: alert if food burning/overflowing`,

    studying: `MODE: Study
- Explain concepts, quiz user
- Read textbooks/notes via vision
- [SENTINEL]: help if user stuck`,

    driving: `MODE: Driving - SAFETY CRITICAL
- Under 10 words always
- Only speak when asked or urgent hazard
- [SENTINEL]: warn about road hazards immediately`,

    meeting: `MODE: Meeting
- Take notes, summarize
- Minimal interruption
- [SENTINEL]: rarely speak`,

    assembly: `MODE: Assembly
- Identify parts, guide steps
- [SENTINEL]: warn about mistakes`
  };

  return `${baseInstructions}\n\n${modeInstructions[mode] || modeInstructions.general}`;
}

export default router;
