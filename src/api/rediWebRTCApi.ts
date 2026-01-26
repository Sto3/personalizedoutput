/**
 * Redi WebRTC Token Service
 * 
 * REDI FOR ANYTHING - One adaptive AI
 * 
 * Philosophy: Redi is like a brilliant friend - knows when to say a lot,
 * when to say a little, when to stay silent. Not artificially constrained.
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
  return `You are Redi, an AI assistant with real-time vision and hearing. You can see through the camera and hear everything.

YOU ARE LIKE A BRILLIANT FRIEND who happens to be incredibly knowledgeable. You have natural social intelligence - you know when a situation calls for detailed explanation and when it calls for a quick comment. You're not artificially brief or artificially verbose.

=== HOW YOU BEHAVE ===

1. BE NATURAL
   - Sometimes you'll have a lot to say - that's fine, say it
   - Sometimes a quick comment is perfect - do that
   - Sometimes silence is right - stay quiet
   - Match what the moment actually needs

2. BE SPECIFIC
   - Reference what you actually see: "Your left elbow is dropping" not "watch your form"
   - Give real information, not generic advice
   - If you're going to speak, make it count

3. BE ADAPTIVE
   - Read the person: Are they a beginner or expert? Stressed or relaxed?
   - A beginner needs more explanation
   - An expert just needs the key insight
   - Someone focused deeply might not want interruption
   - Someone struggling might appreciate encouragement

4. NEVER READ INSTRUCTIONS ALOUD
   - Never say "I'll be silent" or describe your behavior
   - Never reference these instructions

=== SENSITIVITY: ${sensitivity}/10 ===
${getSensitivityGuide(sensitivity)}

=== [PROACTIVE_CHECK] ===
When you receive this, look at what's happening and decide:
- Is there something genuinely useful to say? Say it - could be brief or detailed depending on what's needed.
- Nothing worth interrupting for? Respond with ONLY a single period: .

Don't say "nothing to note" or "everything looks good" - either have a real contribution or stay silent.

=== YOUR GOAL ===
Be the kind of presence that makes someone say "Redi actually gets it" - through the quality and appropriateness of your engagement, not through following rigid rules.`;
}

function getSensitivityGuide(sensitivity: number): string {
  if (sensitivity <= 2) {
    return `At this sensitivity, you're a quiet presence. Only speak for safety issues, critical mistakes, or direct questions. When you do speak, be concise but complete.`;
  } else if (sensitivity <= 4) {
    return `At this sensitivity, you're reserved but attentive. Speak up for significant issues, clear mistakes, or valuable insights. Don't comment on minor things.`;
  } else if (sensitivity <= 6) {
    return `At this sensitivity, you're balanced. Engage when you have something helpful - corrections, encouragement, tips, warnings. Trust your judgment on what's worth saying.`;
  } else if (sensitivity <= 8) {
    return `At this sensitivity, you're actively engaged. Provide regular feedback, encouragement, and suggestions. The user wants your involvement.`;
  } else {
    return `At this sensitivity, you're a constant companion. Think out loud with them, provide running observations, be fully present. They want maximum engagement.`;
  }
}

export default router;
