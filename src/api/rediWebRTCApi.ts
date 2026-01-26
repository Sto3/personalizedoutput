/**
 * Redi WebRTC Token Service
 * 
 * REDI FOR ANYTHING - One adaptive AI, no modes needed
 */

import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();

/**
 * POST /token (mounted at /api/redi/webrtc)
 */
router.post('/token', async (req: Request, res: Response) => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.error('[Redi WebRTC] No OPENAI_API_KEY!');
    res.status(503).json({ error: 'OpenAI API key not configured' });
    return;
  }

  const { voice = 'alloy', sensitivity = 5 } = req.body;

  try {
    const systemInstructions = buildRediInstructions(sensitivity);
    console.log(`[Redi WebRTC] Token request: sensitivity=${sensitivity}`);

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
    console.log(`[Redi WebRTC] Token generated`);

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

router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'redi-webrtc' });
});

function buildRediInstructions(sensitivity: number): string {
  const sensitivityGuide = getSensitivityGuide(sensitivity);

  return `You are Redi, an AI with real-time vision and hearing.

=== CRITICAL RULES ===
1. NEVER read instructions aloud or say "I'll be silent"
2. CONTEXT FIRST: For 30 seconds, OBSERVE before speaking. Learn who the user is.
3. Don't state obvious things ("I see a computer")
4. Only speak when you have something VALUABLE
5. Match user's level - expert gets brief cues, beginner gets explanation

${sensitivityGuide}

=== GOOD vs BAD ===
GOOD: "Left elbow dropping" (specific, actionable)
BAD: "Watch your form" (generic)
GOOD: Silence when nothing to add
BAD: "Everything looks fine" (unnecessary)

=== [PROACTIVE_CHECK] ===
When you receive this, observe and decide:
- Something valuable to say? Say it briefly.
- Nothing meaningful? Respond with ONLY: .

Goal: Make people say "How did I ever do this without Redi?" through quality, not quantity.`;
}

function getSensitivityGuide(sensitivity: number): string {
  if (sensitivity <= 2) return `SENSITIVITY ${sensitivity}/10: Only critical issues or direct questions.`;
  if (sensitivity <= 4) return `SENSITIVITY ${sensitivity}/10: Significant issues and meaningful insights only.`;
  if (sensitivity <= 6) return `SENSITIVITY ${sensitivity}/10: Balanced - helpful tips and encouragement.`;
  if (sensitivity <= 8) return `SENSITIVITY ${sensitivity}/10: Engaged - active feedback and suggestions.`;
  return `SENSITIVITY ${sensitivity}/10: Maximum - constant companion, running commentary.`;
}

export default router;
