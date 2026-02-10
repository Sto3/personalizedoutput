/**
 * Web Search — Tavily API integration
 * ====================================
 * Real-time web search for current information.
 */

import { Router, Request, Response } from 'express';

const router = Router();

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

// Patterns that indicate web search is needed
const SEARCH_TRIGGER_PATTERNS = [
  /\b(weather|forecast|temperature)\b/i,
  /\b(news|latest|current|today|tonight|this week)\b/i,
  /\b(score|scores|game|match|won|lost|playing)\b/i,
  /\b(price|cost|how much|stock|market)\b/i,
  /\b(what time does .+ (close|open))\b/i,
  /\b(is .+ open)\b/i,
  /\b(who won|who is winning)\b/i,
  /\b(hours|schedule|when does)\b/i,
  /\b(reviews? (of|for))\b/i,
  /\b(directions? to|how (do I|to) get to)\b/i,
];

export function needsWebSearch(text: string): boolean {
  return SEARCH_TRIGGER_PATTERNS.some((p) => p.test(text));
}

export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  if (!TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY not set');
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: maxResults,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Tavily search failed: ${response.status} ${err}`);
  }

  const data = (await response.json()) as any;

  return (data.results || []).map((r: any) => ({
    title: r.title || '',
    url: r.url || '',
    content: r.content || '',
    score: r.score || 0,
  }));
}

export function formatSearchResultsForLLM(results: SearchResult[]): string {
  if (results.length === 0) return 'No web search results found.';

  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}\nSource: ${r.url}`)
    .join('\n\n');
}

// GET /api/search — search the web
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const maxResults = parseInt(req.query.max as string) || 5;

    if (!query) return res.status(400).json({ error: 'q parameter required' });

    const results = await searchWeb(query, maxResults);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/search/check — check if query needs web search
router.get('/check', (req: Request, res: Response) => {
  const text = req.query.text as string || '';
  res.json({ needsSearch: needsWebSearch(text) });
});

export default router;
