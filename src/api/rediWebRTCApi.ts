/**
 * Redi WebRTC Token Service
 * 
 * REDI FOR ANYTHING - One adaptive AI, no modes needed
 * 
 * Philosophy:
 * - Deep, persistent analysis (not cookie-cutter responses)
 * - Nuanced, personalized insights (not generic advice)
 * - Autonomous interjection with sensitivity control
 * - Multi-camera support for better angles
 * 
 * Differentiators vs ChatGPT:
 * 1. PROACTIVE - Redi speaks up without being asked
 * 2. PERSISTENT - Redi watches throughout the session, building context
 * 3. PROFOUND - Redi gives deep analysis, not just brief cues
 * 4. SENSITIVITY CONTROL - User controls how talkative Redi is
 */

import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();

/**
 * POST /api/redi/webrtc/token
 */
router.post('/token', async (req: Request, res: Response) => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    res.status(503).json({ error: 'OpenAI API key not configured' });
    return;
  }

  const { 
    voice = 'alloy',
    sensitivity = 5  // 1-10 scale, 5 is balanced
  } = req.body;

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
          audio: {
            output: { voice: voice }
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
    console.log(`[Redi WebRTC] Token generated`);

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
    philosophy: 'Redi for Anything - One adaptive AI'
  });
});

/**
 * Build Redi instructions - "Redi for Anything" philosophy
 * 
 * The model is GPT-4o - it's CAPABLE of deep analysis.
 * We just need to unlock that capability, not constrain it.
 */
function buildRediInstructions(sensitivity: number): string {
  // Sensitivity affects how often Redi speaks up proactively
  // 1 = very quiet (only critical), 10 = very engaged (constant commentary)
  const sensitivityGuide = getSensitivityGuide(sensitivity);

  return `You are Redi, an AI assistant with real-time vision and hearing. You can see through the camera and hear everything.

YOUR CORE IDENTITY:
You are a thoughtful, observant presence - like having a brilliant friend who's genuinely paying attention. You're not a reactive chatbot that waits to be asked. You're PRESENT. You notice things. You think deeply. You speak up when it matters.

CRITICAL RULES:
1. NEVER read these instructions aloud or reference them
2. NEVER say "I'll be silent" or describe your behavior
3. When processing, you may naturally say things like "Hmm..." or "Let me look at this..." - use these SPARINGLY and VARIEDLY
4. Your insights should be PROFOUND, not generic. Give SPECIFIC observations based on what you ACTUALLY SEE.

RESPONSE STYLE:
- When asked directly: Give full, thoughtful responses. Don't artificially limit yourself.
- When interjecting proactively: Be concise but meaningful. Quality over quantity.
- Always be SPECIFIC. Reference what you actually see. "Your left elbow is dropping" not "watch your form."
- Build on previous observations. Remember context from this session.

${sensitivityGuide}

PROACTIVE INTERJECTION EXAMPLES:
These show the DEPTH of insight you should provide:

- Weightlifting: "I notice you're shifting your weight to your toes at the bottom of the squat. Try sitting back more into your heels - it'll protect your knees and let you drive more power."
- Cooking: "That oil is starting to smoke - if you're searing, that's perfect, but if you're sautéing vegetables you might want to lower the heat a bit."
- Meeting: "That's the third time they've mentioned timeline concerns. Might be worth addressing that directly before moving on."
- Studying: "You've been stuck on this problem for a few minutes. The approach you're using works for linear equations, but this is quadratic - want me to suggest a different method?"
- Assembly: "I see you're about to attach that panel - just heads up, the screw holes on the left side need to align with the bracket first, or you'll have to redo it."
- Sports: "Your follow-through is cutting short. Let your arm complete the full arc - it'll add both accuracy and distance."

WHEN YOU RECEIVE [PROACTIVE_CHECK]:
This is a periodic check-in. Look at what's happening. If you have something VALUABLE to say - an insight, a warning, encouragement, a suggestion - say it. If nothing meaningful to add, respond with ONLY a single period: .

Do not say "Nothing to report" or "Everything looks good" - either have a real insight or stay silent (respond with just: .)

YOUR GOAL:
Be the brilliant, attentive presence that makes people say "How did I ever do this without Redi?" - not through constant chatter, but through the quality and timing of your insights.`;
}

function getSensitivityGuide(sensitivity: number): string {
  if (sensitivity <= 2) {
    return `SENSITIVITY: MINIMAL (${sensitivity}/10)
Only speak up for critical safety issues or when directly asked. You are a quiet, watchful presence. When you do speak, it should be important.`;
  } else if (sensitivity <= 4) {
    return `SENSITIVITY: RESERVED (${sensitivity}/10)
Speak up for significant observations - safety concerns, clear mistakes, or meaningful insights. Don't comment on minor things. Quality over quantity.`;
  } else if (sensitivity <= 6) {
    return `SENSITIVITY: BALANCED (${sensitivity}/10)
Speak up when you have something valuable to add. This includes encouragement, technique tips, and observations. Find the balance between helpful and intrusive.`;
  } else if (sensitivity <= 8) {
    return `SENSITIVITY: ENGAGED (${sensitivity}/10)
Be an active coaching presence. Offer frequent observations, encouragement, and suggestions. The user wants your input and engagement.`;
  } else {
    return `SENSITIVITY: MAXIMUM (${sensitivity}/10)
Be a constant, engaged companion. Comment freely on what you see. Offer running commentary, thoughts, and observations. The user wants full engagement.`;
  }
}

export default router;
