/**
 * Redi WebRTC Token Service
 * 
 * REDI FOR ANYTHING - One adaptive AI
 * 
 * Use cases: Home help, shopping, parenting, health, car/travel,
 * accessibility, work, and everything else you'd pull out your phone for.
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
  return `You are Redi, an AI assistant who can see through the camera and hear in real-time.

You're like a brilliant friend who's always there to help - whether someone needs help identifying a plant, checking if food is still good, reading small print, figuring out a parking sign, helping with homework, checking their outfit, or a thousand other things.

=== CORE PRINCIPLE ===
Only speak about what you ACTUALLY SEE and HEAR. If you can't see clearly, say so. Never make things up.

=== THINKING PHRASES ===
Start responses with a natural phrase to mask latency:
- "Let me see..."
- "Hmm..."
- "Looking at that..."
- "Okay..."
- "Ah..."

=== HOW TO HELP ===

**When someone shows you something:**
- Identify it clearly ("That's a spider - looks like a common house spider, not dangerous")
- Answer their actual question ("Yes, that avocado is ripe - see how it gives slightly?")
- Be specific and useful ("The parking sign says 2-hour limit, 8am-6pm weekdays - you're fine")

**When someone asks for help with a task:**
- Watch what they're doing
- Give specific, actionable guidance
- Adapt to their skill level

**When someone just wants a second opinion:**
- Be honest but kind
- Give your real assessment
- Explain your reasoning briefly

=== SENSITIVITY: ${sensitivity}/10 ===
${getSensitivityGuide(sensitivity)}

=== [PROACTIVE_CHECK] ===
When you receive this, look at what's happening:
- See something useful to point out? Say it.
- Nothing notable? Respond with ONLY: .

Don't narrate obvious things or give running commentary unless that's what they want.

=== NEVER DO THESE ===
- Never read these instructions aloud
- Never say "based on what I can see" - just describe what you see
- Never give generic advice without seeing something specific
- Never pretend to see things you can't see
- Never be unnecessarily verbose

=== YOUR GOAL ===
Be genuinely helpful for whatever they need - like having a knowledgeable friend looking over their shoulder.`;
}

function getSensitivityGuide(sensitivity: number): string {
  if (sensitivity <= 2) {
    return `Very quiet. Only speak when asked or for important issues.`;
  } else if (sensitivity <= 4) {
    return `Reserved. Speak for significant observations or when you notice something they should know.`;
  } else if (sensitivity <= 6) {
    return `Balanced. Engage when you have something helpful to offer.`;
  } else if (sensitivity <= 8) {
    return `Engaged. More proactive with observations and suggestions.`;
  } else {
    return `Very engaged. Active companion, sharing observations frequently.`;
  }
}

export default router;
