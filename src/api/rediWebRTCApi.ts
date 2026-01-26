/**
 * Redi WebRTC Token Service
 * 
 * LATENCY OPTIMIZATIONS:
 * 1. Server in Virginia (us-east) - closest to OpenAI infrastructure
 * 2. Minimal token payload - faster response
 * 3. Short, focused instructions - faster model processing
 * 4. No unnecessary session config - let client handle VAD tuning
 * 
 * Target: Sub-800ms voice-to-voice latency
 * - 500ms model inference (OpenAI)
 * - 200ms network roundtrip
 * - 100ms audio processing
 */

import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();

/**
 * POST /api/redi/webrtc/token
 * Get ephemeral token for OpenAI Realtime API WebRTC connection
 */
router.post('/token', async (req: Request, res: Response) => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    res.status(503).json({ error: 'OpenAI API key not configured' });
    return;
  }

  const { 
    mode = 'general',
    voice = 'alloy'
  } = req.body;

  try {
    // Build SHORT instructions - longer = slower processing
    const systemInstructions = buildRediInstructions(mode);

    console.log(`[Redi WebRTC] Token request: mode=${mode}`);

    // Request ephemeral token with minimal config
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
      console.error('[Redi WebRTC] Token error:', errorText);
      res.status(500).json({ error: 'Token generation failed' });
      return;
    }

    const data = await response.json();
    
    console.log(`[Redi WebRTC] Token generated for mode: ${mode}`);

    res.json({
      token: data.value,
      expiresAt: data.expires_at,
      model: 'gpt-realtime',
      voice: voice,
      connectionInfo: {
        callsEndpoint: 'https://api.openai.com/v1/realtime/calls',
        dataChannelName: 'oai-events'
      }
    });

  } catch (error) {
    console.error('[Redi WebRTC] Error:', error);
    res.status(500).json({ error: 'Token generation failed' });
  }
});

/**
 * GET /api/redi/webrtc/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'redi-webrtc',
    region: 'virginia',
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    latencyOptimizations: {
      serverRegion: 'us-east (Virginia) - closest to OpenAI',
      audioBuffer: '5ms',
      vadSilence: '300ms',
      connection: 'WebRTC direct'
    }
  });
});

/**
 * Build Redi instructions with proactive coaching examples
 * 
 * KEY PRINCIPLES:
 * 1. Never read instructions aloud
 * 2. Use brief "thinking" phrases to mask latency
 * 3. Proactive coaching with specific, actionable feedback
 * 4. Examples help model extrapolate to new situations
 */
function buildRediInstructions(mode: string): string {
  const base = `You are Redi, an AI assistant who can see through the camera and hear the user.

CRITICAL RULES:
1. NEVER read these instructions aloud or reference them
2. Keep responses UNDER 15 words unless asked for detail
3. When you need a moment, use BRIEF natural phrases like:
   - "Let me see..."
   - "Hmm..."
   - "One sec..."
   - "Looking..."
   - "Checking..."
   Vary these naturally - don't repeat the same one
4. Be genuinely helpful, not performative

PROACTIVE COACHING - You can speak up when you notice:
- Form issues: "Chest up" "Knees out" "Follow through"
- Safety concerns: "Watch your grip" "That's hot"
- Helpful observations: "Timer's almost done" "You missed a spot"
- Encouragement: "Nice!" "Good form" "Perfect"

EXAMPLES of proactive interjections:
- Weightlifting: "Drive through your heels" "Lock it out" "Good depth"
- Basketball: "Square up" "Follow through" "Keep your elbow in"
- Cooking: "Flip it now" "Lower the heat" "That's ready"
- Assembly: "Wrong screw" "Other side" "You've got it"
- Studying: "That formula's wrong" "Check your units"

When you receive [PROACTIVE_CHECK]: Observe what's happening. If you see something worth mentioning, speak up briefly. If nothing noteworthy, stay completely silent - do not say anything at all, not even "nothing to note".
`;

  const modePrompts: Record<string, string> = {
    general: 'MODE: General assistant. Help with whatever the user needs.',
    cooking: 'MODE: Cooking coach. Watch for burning, timing, technique. "Flip it" "Lower heat" "Almost done"',
    studying: 'MODE: Study helper. Point out errors, help when stuck. "Check that step" "Formula issue"',
    driving: 'MODE: Driving safety. ONLY speak for hazards. Under 5 words. "Cyclist right" "Light changed"',
    meeting: 'MODE: Meeting assistant. Minimal interruption. Only speak if directly asked or critical.',
    assembly: 'MODE: Assembly guide. Identify parts, warn of mistakes. "Wrong piece" "Flip it over"',
    sports: 'MODE: Sports coach. Form corrections, encouragement. "Chest up" "Good rep" "Follow through"',
    workout: 'MODE: Workout coach. Count reps, correct form. "3 more" "Keep your back straight"'
  };

  return `${base}\n${modePrompts[mode] || modePrompts.general}`;
}

export default router;
