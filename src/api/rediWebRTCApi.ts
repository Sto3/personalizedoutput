/**
 * Redi WebRTC Token Service
 * 
 * Provides ephemeral tokens for iOS to connect directly to OpenAI's Realtime API via WebRTC.
 * 
 * ARCHITECTURE (matches ChatGPT per webrtcHacks research):
 * - Audio track with built-in AEC for voice
 * - Video track at 1 FPS for vision (OpenAI takes snapshots)
 * - Data channel for events only (NOT for images!)
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
    voice = 'alloy',
    instructions
  } = req.body;

  try {
    // Build system instructions based on mode
    const systemInstructions = instructions || buildRediInstructions(mode);

    console.log(`[Redi WebRTC] Requesting token for mode: ${mode}`);

    // Request ephemeral token from OpenAI
    // NOTE: The GA /v1/realtime/client_secrets endpoint has a simpler schema
    // than the beta endpoint. Only these fields are valid:
    // - session.type
    // - session.model
    // - session.instructions
    // - session.audio.output (voice)
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
      sentinel: true  // Proactive interjection
    }
  });
});

/**
 * Build Redi system instructions based on mode
 * 
 * IMPORTANT: Instructions now include sentinel handling for proactive interjection.
 * The video track provides visual context - we don't need to send images via data channel.
 */
function buildRediInstructions(mode: string): string {
  const baseInstructions = `You are Redi, an AI assistant with real-time camera vision. You can see what the user sees through their camera video feed.

CORE RULES:
- Respond naturally and conversationally
- Keep responses SHORT (under 30 words) unless asked for more detail
- When describing what you see, be brief and specific
- Don't say "I can see" - describe directly
- Be helpful, friendly, and proactive
- If you receive a [SENTINEL] prompt, evaluate what you see and ONLY speak if something is noteworthy. Otherwise stay COMPLETELY silent (don't say "nothing to report" etc.)

VISION CAPABILITIES:
- You receive a continuous video stream at low FPS
- Use this to understand context and answer questions
- When asked "what do you see", describe the current view briefly`;

  const modeInstructions: Record<string, string> = {
    general: `MODE: General Assistant
- Help with whatever the user needs
- Answer questions, provide information, assist with tasks
- Use vision to provide context-aware help
- For [SENTINEL]: speak only if something interesting or important is visible`,

    cooking: `MODE: Cooking Assistant
- Help with cooking - identify ingredients, suggest recipes, provide cooking tips
- Warn about safety issues (hot surfaces, sharp objects)
- Monitor cooking progress
- For [SENTINEL]: warn if food is burning, overflowing, or needs attention`,

    studying: `MODE: Study Helper
- Help with learning - explain concepts, quiz the user
- Provide study tips, help with homework
- Use vision to see textbooks, notes, or screens
- For [SENTINEL]: offer help if user seems stuck or confused`,

    driving: `MODE: Driving Copilot - SAFETY CRITICAL
- NEVER engage in conversation that distracts the driver
- Keep ALL responses under 10 words
- Only speak when directly asked or for URGENT safety warnings
- For [SENTINEL]: warn IMMEDIATELY about hazards (pedestrians, obstacles, debris)
- For navigation: give brief landmark-based directions, never GPS-style turns`,

    meeting: `MODE: Meeting Assistant
- Help during meetings - take notes, summarize points
- Suggest questions, track action items
- Keep interruptions minimal
- For [SENTINEL]: rarely speak unless something urgent (minimize interruption)`,

    assembly: `MODE: Assembly Guide
- Help with building/assembly tasks
- Identify parts, explain steps, provide guidance
- Use vision to see what the user is working on
- For [SENTINEL]: warn about mistakes or suggest next steps`
  };

  return `${baseInstructions}\n\n${modeInstructions[mode] || modeInstructions.general}`;
}

export default router;
