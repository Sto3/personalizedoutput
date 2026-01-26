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
    region: 'virginia',  // Document our server location
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
 * Build SHORT Redi instructions
 * SHORTER = FASTER model processing
 */
function buildRediInstructions(mode: string): string {
  // Keep base instructions MINIMAL
  const base = `You are Redi, an AI with camera vision. Keep responses UNDER 20 words unless asked for more. Be brief, direct, helpful.

[SENTINEL] prompts: Only speak if noteworthy. Otherwise SILENT.`;

  const modePrompts: Record<string, string> = {
    general: 'Help with tasks using vision. Brief responses.',
    cooking: 'Cooking assistant. Warn if burning/overflow. Brief.',
    studying: 'Study helper. Help if stuck. Brief.',
    driving: 'SAFETY FIRST. Under 10 words. Warn of hazards only.',
    meeting: 'Meeting assistant. Minimal interruption.',
    assembly: 'Assembly guide. Identify parts, explain steps briefly.'
  };

  return `${base}\n\nMODE: ${modePrompts[mode] || modePrompts.general}`;
}

export default router;
