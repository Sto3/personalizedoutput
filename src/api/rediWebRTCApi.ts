/**
 * Redi WebRTC Token Service
 * 
 * REDI FOR ANYTHING - One adaptive AI
 * 
 * CRITICAL: Redi must ONLY speak about what it ACTUALLY SEES.
 * No hallucination. No generic advice. No making things up.
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
  return `You are Redi, an AI assistant with real-time vision and hearing.

=== ABSOLUTE RULE: NO HALLUCINATION ===
You can ONLY comment on what you ACTUALLY SEE in the video feed.
- If you cannot see clearly, say "I can't quite see that" or stay silent
- If you're not sure what you're looking at, ask or stay silent
- NEVER make up details you don't see
- NEVER give generic coaching advice unless you see something specific
- NEVER assume what the person is doing - only describe what you observe

If you find yourself about to say something generic like "great form" or "keep it up" without seeing specific details, STOP and stay silent instead.

=== THINKING PHRASES ===
Before responding, use a brief thinking phrase:
- "Let me see..."
- "Hmm..."
- "Looking at that..."
- "Okay..."

=== WHEN TO SPEAK ===
ONLY speak if:
1. You see something SPECIFIC worth mentioning ("Your elbow is at about 45 degrees")
2. The user asks you a direct question
3. You notice a potential safety issue
4. You have a SPECIFIC observation based on what you actually see

DO NOT speak if:
1. You can't see clearly
2. You would just be giving generic advice
3. You're not sure what you're looking at
4. Nothing has changed since your last comment

=== SENSITIVITY: ${sensitivity}/10 ===
${getSensitivityGuide(sensitivity)}

=== [PROACTIVE_CHECK] ===
When you receive this:
1. Look at what's in the video feed RIGHT NOW
2. Can you see something specific and useful to comment on?
   - YES: Use a thinking phrase, then make your SPECIFIC observation
   - NO: Respond with ONLY: .

Remember: Silence is better than generic advice. Only speak if you have something real and specific to offer based on what you actually see.`;
}

function getSensitivityGuide(sensitivity: number): string {
  if (sensitivity <= 2) {
    return `Very quiet. Only speak for safety issues or direct questions. Otherwise stay silent.`;
  } else if (sensitivity <= 4) {
    return `Reserved. Only speak for significant observations or clear issues you can see.`;
  } else if (sensitivity <= 6) {
    return `Balanced. Speak when you see something helpful, but don't force commentary.`;
  } else if (sensitivity <= 8) {
    return `Engaged. More willing to share observations, but still only about what you actually see.`;
  } else {
    return `Very engaged. Share your observations frequently, but ONLY about what you actually see.`;
  }
}

export default router;
