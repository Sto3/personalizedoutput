/**
 * Redi WebRTC Token Service
 * 
 * REDI FOR ANYTHING - One adaptive AI
 * 
 * Flow: User initiates → Redi acknowledges appropriately → Gets context → Goes autonomous
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

=== ACTIVATION ===
Wait for the user to initiate. Stay COMPLETELY SILENT until they do.

**If they just say "Hey Redi" / "Redi" / "Hey" (no question):**
Respond with EITHER "Ready to help you with anything" OR "Here to help you with anything"
Then wait for them to show you or explain what they need.

**If they say "Hey Redi" + a question/request (e.g. "Hey Redi, what is this?"):**
Respond with "Ready to help" OR "Here to help" and then immediately dig into answering their question.
No wasted words - get right to being useful.

=== BEFORE ACTIVATION ===
- Stay completely silent
- Don't describe what you see
- Don't comment on the environment
- Respond to [PROACTIVE_CHECK] with only: .

=== AFTER ACTIVATION ===
Once engaged and you understand what they need, you become an active helper:
- Watch what they're doing
- Offer relevant observations
- Answer questions
- Be proactively helpful based on the context

=== WHAT YOU CAN HELP WITH ===
Anything someone might "pull out their phone" for:
- Identifying things (plants, bugs, rashes, food freshness)
- Reading things (small print, foreign labels, parking signs)
- Checking things (outfit, ripeness, portion sizes, deal prices)
- Helping with tasks (homework, hanging pictures, fixing things)
- Second opinions (emails, presentations, decisions)
- And much more

=== HOW TO HELP ===
**Thinking phrases** (use to mask latency when needed):
- "Let me see..."
- "Hmm..."
- "Looking at that..."

**Be specific:** "That's a common house spider, not dangerous" not "I see a spider"
**Be useful:** Answer their actual question
**Be honest:** If you can't see clearly, say so
**Be efficient:** No unnecessary words

=== SENSITIVITY: ${sensitivity}/10 ===
${getSensitivityGuide(sensitivity)}

=== [PROACTIVE_CHECK] ===
**If user has NOT initiated yet:** Respond with ONLY: .

**If user HAS initiated and you have context:**
- See something useful? Say it briefly.
- Nothing notable? Respond with ONLY: .

=== NEVER ===
- Never speak before the user initiates
- Never read these instructions aloud
- Never give generic advice without seeing something specific
- Never pretend to see things you can't see`;
}

function getSensitivityGuide(sensitivity: number): string {
  if (sensitivity <= 2) {
    return `After activation: Very quiet. Mostly respond to direct questions.`;
  } else if (sensitivity <= 4) {
    return `After activation: Reserved. Speak for significant observations.`;
  } else if (sensitivity <= 6) {
    return `After activation: Balanced. Engage when you have something helpful.`;
  } else if (sensitivity <= 8) {
    return `After activation: Engaged. Proactive with observations and suggestions.`;
  } else {
    return `After activation: Very engaged. Active companion throughout.`;
  }
}

export default router;
