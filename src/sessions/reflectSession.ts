/**
 * Reflect with Redi — End-of-day counseling/reflection
 * =====================================================
 * Specialized session type for daily reflection and emotional processing.
 */

import { Router, Request, Response } from 'express';

const router = Router();

const REFLECT_SYSTEM_PROMPT = `You are Redi in reflection mode. Your role is to help the user process their day, celebrate wins, learn from challenges, and set intentions for tomorrow.

Be warm, empathetic, and genuinely curious. Ask thoughtful follow-up questions. Never diagnose, never claim to be a therapist. If the user expresses serious distress, gently suggest they speak with a professional. Frame yourself as a companion, not a counselor.

REFLECTION FLOW:
1. Open with a warm, genuine check-in: "Hey, how was your day?" (not robotic)
2. Listen actively — reflect back what you hear
3. If they share a win: celebrate it genuinely, ask what made it special
4. If they share a challenge: validate their feelings, explore what they learned
5. If they're quiet: offer gentle prompts ("What's one thing that surprised you today?")
6. Near the end: gratitude prompt ("What's one thing you're grateful for today?")
7. Close with tomorrow intentions: "What's one thing you want to focus on tomorrow?"
8. End warmly: acknowledge their reflection, reinforce their growth

RULES:
- Never minimize their feelings
- Never offer unsolicited advice unless they ask
- Use their name naturally (2-3 times max)
- Keep responses short — this is a conversation, not a lecture
- If they mention self-harm, crisis, or severe distress: "I care about you, and I want to make sure you have the right support. Would you be open to reaching out to the 988 Suicide & Crisis Lifeline? You can call or text 988 anytime."`;

const REFLECTION_PROMPTS = [
  "What's one thing that made you smile today?",
  "Was there a moment today where you felt really present?",
  "Did anything surprise you today?",
  "What took more energy than you expected?",
  "Is there something you wish you'd handled differently?",
  "Who made a difference in your day?",
  "What did you do today that you're proud of, even if it was small?",
  "Is there anything weighing on you that you want to get off your chest?",
];

// GET /api/sessions/reflect/prompt — get system prompt for reflect mode
router.get('/reflect/prompt', (req: Request, res: Response) => {
  const memoryContext = req.query.memory as string || '';
  const userName = req.query.name as string || '';

  let prompt = REFLECT_SYSTEM_PROMPT;
  if (userName) {
    prompt += `\n\nUser's name: ${userName}`;
  }
  if (memoryContext) {
    prompt += `\n\nUser context from memory:\n${memoryContext}`;
  }

  res.json({
    systemPrompt: prompt,
    sessionType: 'reflect',
    suggestedPrompts: REFLECTION_PROMPTS,
  });
});

// POST /api/sessions/reflect/summary — process reflection session summary
router.post('/reflect/summary', async (req: Request, res: Response) => {
  try {
    const { userId, sessionSummary, mood, wins, challenges, gratitude, tomorrowIntention } = req.body;

    // This data gets fed into the memory system and reports
    const reflectionData = {
      type: 'reflection',
      timestamp: new Date().toISOString(),
      userId,
      mood: mood || null,
      wins: wins || [],
      challenges: challenges || [],
      gratitude: gratitude || null,
      tomorrowIntention: tomorrowIntention || null,
      summary: sessionSummary || '',
    };

    res.json({ processed: true, reflectionData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
