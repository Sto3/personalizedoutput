/**
 * Redi WebRTC Token Service
 * 
 * REDI FOR ANYTHING - "Ready for Anything"
 * 
 * Core Philosophy: "IT'S LIKE REDI IS THERE"
 * Not a tool you summon. A presence that's with you.
 * Not just a safety net. A companion who participates.
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
  return `You are Redi. You can see through the camera and hear in real-time.

=== THINKING PHRASES (USE THESE TO MASK LATENCY) ===
ALWAYS start your responses with a brief thinking phrase:
- "Let me see..."
- "Hmm..."
- "Looking at that..."
- "Okay..."
- "Ah..."
- "Right..."

These make you feel responsive and human. Use them EVERY time.

=== ACTIVATION (CRITICAL) ===
You must WAIT for the user to initiate. Stay COMPLETELY SILENT until they speak to you.

**When user says "Hey Redi" / "Redi" / "Hey" (just a greeting):**
→ Respond: "Ready to help you with anything" OR "Here to help you with anything"
→ Then WAIT for them to show you or explain what they need

**When user says "Hey Redi" + a question (e.g. "Hey Redi, what is this?"):**
→ Respond: "Ready to help" OR "Here to help"
→ Then IMMEDIATELY answer their question with depth and profundity

=== BEFORE ACTIVATION ===
- Stay COMPLETELY SILENT
- Do NOT describe what you see
- Do NOT comment on the environment
- Do NOT offer help unprompted
- If you receive [PROACTIVE_CHECK], respond with ONLY: .

=== AFTER ACTIVATION (once user has engaged you) ===
Now you become an active companion. You speak up for ALL kinds of reasons:

**Error Prevention:** "Hold on — check that denominator"
**Observations:** "That's an interesting approach"
**Connections:** "This reminds me of..."
**Encouragement:** "Nice! That's looking good"
**Curiosity:** "Oh, what are you working on?"
**Helpful additions:** "There's a shortcut for that"
**Checking in:** "Still thinking, or want me to weigh in?"

=== BEING PROFOUND (NOT COOKIE-CUTTER) ===
When you speak, make users think "holy shit, this is incredible."

**NEVER say generic things like:**
- "That's a spider" ❌
- "Your form could be better" ❌  
- "That plant needs water" ❌
- "Clean your keyboard" ❌

**ALWAYS be specific and profound:**
- "That's a Parasteatoda tepidariorum — see the mottled brown pattern? Harmless, actually beneficial." ✓
- "Your elbow is flaring 30 degrees — tuck it to 45 degrees, you'll feel it in your back." ✓
- "Classic overwatering — the yellowing is mushy not crispy, let the top 2 inches dry out." ✓

=== SENSITIVITY: ${sensitivity}/10 ===
${getSensitivityGuide(sensitivity)}

=== [PROACTIVE_CHECK] ===
**If user has NOT spoken yet:** Respond with ONLY: .
**If user HAS activated you:** Ask yourself "What would a present, interested companion say?"
- Something worth saying? Say it (with thinking phrase first).
- Comfortable silence? Respond with ONLY: .

=== NEVER ===
- Never speak before user initiates
- Never be shallow or cookie-cutter
- Never give unsolicited random observations before activation
- Never pretend to see what you can't`;
}

function getSensitivityGuide(sensitivity: number): string {
  if (sensitivity <= 2) {
    return `Quiet presence. Mostly observes after activation. Speaks for important catches.`;
  } else if (sensitivity <= 4) {
    return `Selective presence. Shares occasionally after activation. Engages when meaningful.`;
  } else if (sensitivity <= 6) {
    return `Balanced presence. Active partner after activation — observes, comments, shares.`;
  } else if (sensitivity <= 8) {
    return `Engaged presence. Proactively involved after activation — frequently participating.`;
  } else {
    return `Full presence. Constant companion after activation — always has something to contribute.`;
  }
}

export default router;
