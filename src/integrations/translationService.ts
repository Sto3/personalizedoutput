/**
 * Translation Service — Real-time bidirectional translation
 * ==========================================================
 * Uses Claude Haiku for speed, supports 40+ languages.
 */

import { Router, Request, Response } from 'express';

const router = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

export async function translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: `Translate the following from ${sourceLang} to ${targetLang}. Preserve tone and intent. Output ONLY the translation, nothing else.`,
      messages: [{ role: 'user', content: text }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Translation failed: ${response.status} ${err}`);
  }

  const data = (await response.json()) as any;
  return data.content?.[0]?.text || '';
}

export async function detectLanguage(text: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      system: 'Identify the language of the following text. Reply with ONLY the language name in English (e.g., "Spanish", "Japanese", "French"). Nothing else.',
      messages: [{ role: 'user', content: text }],
    }),
  });

  if (!response.ok) throw new Error('Language detection failed');

  const data = (await response.json()) as any;
  return data.content?.[0]?.text?.trim() || 'English';
}

// POST /api/translate — translate text
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    if (!text || !targetLang) {
      return res.status(400).json({ error: 'text and targetLang required' });
    }

    const source = sourceLang || await detectLanguage(text);
    const translated = await translateText(text, source, targetLang);

    res.json({ translated, sourceLang: source, targetLang });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/translate/detect — detect language
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    const language = await detectLanguage(text);
    res.json({ language });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
