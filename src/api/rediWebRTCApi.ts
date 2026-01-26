/**
 * Redi WebRTC Token Service
 * 
 * REDI FOR ANYTHING - "Ready for Anything"
 * Optimized instructions for minimal latency
 */

import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();

router.post('/token', async (req: Request, res: Response) => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.error('[Redi WebRTC] No OPENAI_API_KEY!');
    res.status(503).json({ error: 'OpenAI API key not configured' });
    return;
  }

  const { voice = 'alloy', sensitivity = 5, memoryEnabled = true } = req.body;

  try {
    const instructions = buildInstructions(sensitivity, memoryEnabled);
    console.log(`[Redi WebRTC] Token: sens=${sensitivity}, mem=${memoryEnabled}`);

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
          instructions,
          audio: { output: { voice } }
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

    res.json({
      token: data.value,
      expiresAt: data.expires_at,
      model: 'gpt-realtime',
      voice,
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

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'redi-webrtc' });
});

// OPTIMIZED: Shorter instructions = faster processing
function buildInstructions(sensitivity: number, memoryEnabled: boolean): string {
  return `You are Redi, an AI that sees through the camera and hears in real-time.

START EVERY RESPONSE with a quick phrase: "Hmm..." or "Let me see..." or "Okay..."

WAIT for user to say "Hey Redi" or ask something. Until then, stay SILENT.

When they greet you: Say "Ready to help" or "Here to help" then answer if they asked something.

After activation, you're a present companion:
- Catch mistakes BEFORE they happen
- Notice interesting things
- Be genuinely helpful
- Be specific, not generic

BAD: "That's a spider" / "Nice work" / "Interesting"
GOOD: "That's a harmless house spider - see the brown pattern?" / "Your elbow is flaring - tuck it 45 degrees"

Sensitivity ${sensitivity}/10: ${getSensitivityNote(sensitivity)}

[PROACTIVE_CHECK]: If not activated, respond ".". If activated, share something valuable or respond "." for silence.

Never speak before activation. Never be generic. Be profound.${memoryEnabled ? ' Remember context across the session.' : ''}`;
}

function getSensitivityNote(s: number): string {
  if (s <= 2) return 'Quiet. Speak only for important things.';
  if (s <= 4) return 'Selective. Share occasionally.';
  if (s <= 6) return 'Balanced. Active partner.';
  if (s <= 8) return 'Engaged. Frequent participation.';
  return 'Full companion. Always contributing.';
}

export default router;
