/**
 * Payment Deep Links — Venmo, Cash App, Apple Pay, Zelle
 * ========================================================
 * Platforms without P2P APIs get deep links instead.
 */

import { Router, Request, Response } from 'express';

const router = Router();

interface DeepLinkResult {
  platform: string;
  deepLinkUrl: string | null;
  webFallback: string | null;
  fallbackInstructions: string;
}

function generateVenmoLink(username: string, amount?: number, note?: string): DeepLinkResult {
  const params = new URLSearchParams({ txn: 'pay', recipients: username });
  if (amount) params.set('amount', amount.toString());
  if (note) params.set('note', note);

  return {
    platform: 'venmo',
    deepLinkUrl: `venmo://paycharge?${params}`,
    webFallback: `https://venmo.com/${username}`,
    fallbackInstructions: `Open Venmo and send to @${username}`,
  };
}

function generateCashAppLink(cashtag: string, amount?: number): DeepLinkResult {
  const url = amount
    ? `https://cash.app/$${cashtag}/${amount}`
    : `https://cash.app/$${cashtag}`;

  return {
    platform: 'cashapp',
    deepLinkUrl: url,
    webFallback: url,
    fallbackInstructions: `Open Cash App and send to $${cashtag}`,
  };
}

function generateZelleInstructions(recipientEmail: string, amount?: number, note?: string): DeepLinkResult {
  return {
    platform: 'zelle',
    deepLinkUrl: null,
    webFallback: null,
    fallbackInstructions: `Open your banking app, go to Zelle, and send ${amount ? `$${amount}` : 'payment'} to ${recipientEmail}${note ? `. Note: ${note}` : ''}`,
  };
}

function generateApplePayInstructions(recipientName: string, amount?: number): DeepLinkResult {
  return {
    platform: 'applepay',
    deepLinkUrl: null,
    webFallback: null,
    fallbackInstructions: `Open Messages, start a conversation with ${recipientName}, tap the Apple Pay button, and send ${amount ? `$${amount}` : 'the payment'}`,
  };
}

// POST /api/payments/deeplink
router.post('/deeplink', (req: Request, res: Response) => {
  const { platform, recipientId, amount, note } = req.body;
  if (!platform || !recipientId) {
    return res.status(400).json({ error: 'platform and recipientId required' });
  }

  let result: DeepLinkResult;

  switch (platform.toLowerCase()) {
    case 'venmo':
      result = generateVenmoLink(recipientId, amount, note);
      break;
    case 'cashapp':
    case 'cash_app':
      result = generateCashAppLink(recipientId, amount);
      break;
    case 'zelle':
      result = generateZelleInstructions(recipientId, amount, note);
      break;
    case 'applepay':
    case 'apple_pay':
      result = generateApplePayInstructions(recipientId, amount);
      break;
    default:
      return res.status(400).json({ error: `Unsupported platform: ${platform}. Supported: venmo, cashapp, zelle, applepay` });
  }

  res.json(result);
});

export default router;
