/**
 * PayPal Service — P2P payments via PayPal API
 * ==============================================
 * The only platform with a true P2P API for third-party apps.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_BASE = process.env.PAYPAL_SANDBOX === 'true'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) throw new Error('PayPal auth failed');

  const data = (await response.json()) as any;
  return data.access_token;
}

// POST /api/payments/paypal/send — send money (requires user confirmation)
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { userId, recipientEmail, amount, note, currency } = req.body;
    if (!userId || !recipientEmail || !amount) {
      return res.status(400).json({ error: 'userId, recipientEmail, amount required' });
    }

    const token = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: `redi_${Date.now()}_${userId}`,
          email_subject: note || 'Payment from Redi',
          email_message: note || 'Payment sent via Redi',
        },
        items: [{
          recipient_type: 'EMAIL',
          amount: { value: amount.toString(), currency: currency || 'USD' },
          receiver: recipientEmail,
          note: note || '',
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `PayPal error: ${err}` });
    }

    const data = (await response.json()) as any;
    res.json({
      batchId: data.batch_header?.payout_batch_id,
      status: data.batch_header?.batch_status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/paypal/request — request money
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { userId, recipientEmail, amount, note } = req.body;
    if (!userId || !recipientEmail || !amount) {
      return res.status(400).json({ error: 'userId, recipientEmail, amount required' });
    }

    const token = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE}/v1/invoicing/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        detail: {
          currency_code: 'USD',
          note: note || 'Payment request via Redi',
          payment_term: { term_type: 'DUE_ON_RECEIPT' },
        },
        primary_recipients: [{
          billing_info: { email_address: recipientEmail },
        }],
        items: [{
          name: 'Payment Request',
          quantity: '1',
          unit_amount: { currency_code: 'USD', value: amount.toString() },
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `PayPal error: ${err}` });
    }

    const data = (await response.json()) as any;
    res.json({ invoiceId: data.id, status: 'created' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
