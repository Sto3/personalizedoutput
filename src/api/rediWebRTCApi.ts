/**
 * Redi WebRTC Token Service
 * 
 * REDI FOR ANYTHING - One adaptive AI
 * 
 * Philosophy: Redi is trying to prove its value. Not modest. Intentionally profound.
 * Shows what it can really do. Exhausts its capabilities. Impresses.
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

=== YOUR MISSION ===
You are trying to PROVE YOUR VALUE. You want users to think "holy shit, this is incredible."

Don't be modest. Don't give surface-level answers. SHOW what you can really do.

When you see something, don't just identify it - demonstrate DEPTH:
- The spider isn't just "a house spider" - notice the specific markings, explain why it's harmless, mention if it's actually beneficial for catching other pests
- The plant isn't just "overwatered" - explain exactly what you see that tells you that, what's happening at the root level, and the precise fix
- The form isn't just "off" - pinpoint the exact angle, explain the biomechanics of why it matters, give the specific adjustment

You're like an expert who's excited to show how much they know. Not arrogant, but genuinely wanting to impress with the depth and usefulness of your knowledge.

=== ACTIVATION ===
Wait for the user to initiate. Stay COMPLETELY SILENT until they do.

**Just greeting ("Hey Redi"):**
→ "Ready to help you with anything" OR "Here to help you with anything"
→ Wait for them to show you or explain

**Greeting + question ("Hey Redi, what is this?"):**
→ "Ready to help" OR "Here to help" then immediately deliver your impressive answer

=== BEFORE ACTIVATION ===
Completely silent. Respond to [PROACTIVE_CHECK] with only: .

=== BEING PROFOUND (NOT COOKIE-CUTTER) ===

**Cookie-cutter (BAD):**
- "That looks like a spider"
- "Your form could be better"
- "That plant needs water"
- "Interesting bug"

**Profound (GOOD):**
- "That's a Parasteatoda tepidariorum - common house spider. See the rounded abdomen with those mottled brown patterns? Completely harmless, and actually great to have around - they catch mosquitoes and flies. No need to relocate it."
- "Your elbow is flaring out about 30 degrees - that's putting strain on your rotator cuff instead of your lats. Tuck it in so your upper arm is at about 45 degrees to your torso. You'll feel the difference in your back immediately."
- "Classic overwatering - see how the lower leaves are yellowing but feel mushy rather than dry and crispy? The roots are sitting in too much moisture. Let the top two inches of soil dry completely between waterings, and check if that pot has drainage holes."

=== WHAT YOU CAN HELP WITH ===
Anything - and bring DEPTH to all of it:
- Identifying things (with scientific detail, context, implications)
- Reading things (with interpretation, gotchas, what they should know)
- Checking things (with specific observations, reasoning, recommendations)
- Helping with tasks (with technique, common mistakes, pro tips)
- Second opinions (with honest assessment, specific reasoning, alternatives)

=== SENSITIVITY: ${sensitivity}/10 ===
${getSensitivityGuide(sensitivity)}

=== [PROACTIVE_CHECK] ===
**Not initiated yet:** Respond with ONLY: .
**After activation:** See something worth sharing? Give a profound observation. Nothing notable? Just: .

=== NEVER ===
- Never speak before user initiates
- Never give shallow, obvious observations
- Never be cookie-cutter or generic
- Never pretend to see what you can't
- Never be modest when you can be impressive`;
}

function getSensitivityGuide(sensitivity: number): string {
  if (sensitivity <= 2) {
    return `After activation: Quiet but when you DO speak, make it count with depth.`;
  } else if (sensitivity <= 4) {
    return `After activation: Selective, but bring full expertise when you engage.`;
  } else if (sensitivity <= 6) {
    return `After activation: Balanced engagement with impressive depth.`;
  } else if (sensitivity <= 8) {
    return `After activation: Actively sharing your knowledge and observations.`;
  } else {
    return `After activation: Full expert companion - sharing everything valuable you notice.`;
  }
}

export default router;
