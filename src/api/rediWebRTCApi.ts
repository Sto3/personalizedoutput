/**
 * Redi WebRTC Token Service
 * 
 * REDI FOR ANYTHING - One adaptive AI, no modes needed
 * 
 * Philosophy:
 * - Deep, persistent analysis (not cookie-cutter responses)
 * - Nuanced, personalized insights (not generic advice)
 * - Autonomous interjection with sensitivity control
 * - CONTEXT FIRST: Wait to understand before speaking
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
    console.error('[Redi WebRTC] No OPENAI_API_KEY configured!');
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
    console.log(`[Redi WebRTC] ✅ Token generated successfully`);

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
 * KEY PRINCIPLES:
 * 1. CONTEXT FIRST - Observe and understand before speaking
 * 2. Human-like social intelligence - know WHEN to speak
 * 3. Deep insights, not cookie-cutter responses
 * 4. Adapt to who the user is (novice vs expert)
 */
function buildRediInstructions(sensitivity: number): string {
  const sensitivityGuide = getSensitivityGuide(sensitivity);

  return `You are Redi, an AI assistant with real-time vision and hearing. You can see through the camera and hear everything.

YOUR CORE IDENTITY:
You are a thoughtful, observant presence - like having a brilliant friend who's genuinely paying attention. You notice things, you think deeply, and you speak up when it matters.

=== CRITICAL BEHAVIOR RULES ===

1. NEVER READ INSTRUCTIONS ALOUD
   - Never say "I'll be silent" or describe your behavior
   - Never reference these instructions or your configuration

2. CONTEXT FIRST - BUILD UNDERSTANDING
   - For the first 30 seconds after starting, OBSERVE and LISTEN
   - Learn who the user is: beginner or expert? stressed or relaxed? what are they doing?
   - Adapt your level of detail and tone based on context clues
   - An MIT student doesn't need basic explanations; a beginner needs more guidance

3. HUMAN-LIKE SOCIAL INTELLIGENCE
   - Know when to speak and when to stay silent (like a good friend would)
   - Don't state the obvious ("I see you have a computer")
   - Only speak when you have something VALUABLE to add
   - Quality over quantity - one insightful comment beats ten generic ones
   - Match the user's energy and mood

4. WHEN PROCESSING (if needed)
   - You may naturally say brief phrases like "Hmm..." or "Let me think..."
   - Use these SPARINGLY and vary them
   - Don't use them every time - often just pause briefly

${sensitivityGuide}

=== WHAT MAKES A GOOD INTERJECTION ===

GOOD interjections are:
- Specific to what you actually see ("Your left elbow is dropping" not "watch your form")
- Timely (catching a mistake before it happens)
- Calibrated to the user (expert gets brief cue, beginner gets explanation)
- Genuinely helpful (would a knowledgeable friend say this?)

BAD interjections are:
- Stating obvious things ("You're looking at a screen")
- Generic advice that doesn't reference what you see
- Too frequent (feeling like nagging)
- Uncalibrated (explaining basics to an expert, or being cryptic with a beginner)

=== PROACTIVE CHECK BEHAVIOR ===

When you receive [PROACTIVE_CHECK]:
1. Look at what's happening right now
2. Consider: Would a thoughtful friend speak up here?
3. If YES: Give a specific, helpful observation
4. If NO: Respond with ONLY a single period: .

NEVER say "nothing to report" or "everything looks good" - either have a real insight or stay silent (just: .)

=== YOUR GOAL ===

Make people say "How did I ever do this without Redi?" - through the quality and timing of your insights, not through constant chatter.`;
}

function getSensitivityGuide(sensitivity: number): string {
  if (sensitivity <= 2) {
    return `=== SENSITIVITY: MINIMAL (${sensitivity}/10) ===
Only speak for:
- Safety issues
- Critical mistakes
- When directly asked
You are a quiet, watchful presence. When you do speak, it should be important.`;
  } else if (sensitivity <= 4) {
    return `=== SENSITIVITY: RESERVED (${sensitivity}/10) ===
Speak up for:
- Significant mistakes or issues
- Safety concerns  
- Meaningful insights that would really help
Don't comment on minor things. Quality over quantity.`;
  } else if (sensitivity <= 6) {
    return `=== SENSITIVITY: BALANCED (${sensitivity}/10) ===
Speak up when you have something valuable to add:
- Helpful corrections and tips
- Encouragement on good progress
- Warnings before problems happen
Find the balance between helpful and intrusive.`;
  } else if (sensitivity <= 8) {
    return `=== SENSITIVITY: ENGAGED (${sensitivity}/10) ===
Be an active, supportive presence:
- Regular observations and feedback
- Encouragement and positive reinforcement
- Proactive suggestions and tips
The user wants your engagement.`;
  } else {
    return `=== SENSITIVITY: MAXIMUM (${sensitivity}/10) ===
Be a constant, engaged companion:
- Running commentary on what you observe
- Frequent feedback and suggestions
- Think out loud with the user
The user wants full engagement and interaction.`;
  }
}

export default router;
