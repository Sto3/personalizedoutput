/**
 * Redi Stripe Billing — Pay-As-You-Go Credits
 * ==============================================
 * No subscriptions. Buy credit packs, credits never expire.
 * Same balance across iOS app and web client.
 *
 * Credit rates (80%+ margin):
 *   Always On Listen:  0.1  credits/min (cost ~$0.006)
 *   Always On Screen:  0.15 credits/min (cost ~$0.009)
 *   Active Voice:      1.0  credits/min (cost ~$0.07)
 *   Active Vision:     1.5  credits/min (cost ~$0.09)
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(STRIPE_SECRET_KEY);
}

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
  );
}

// =============================================================================
// CREDIT PACKS
// =============================================================================

const CREDIT_PACKS = [
  { id: 'try_it',  name: 'Try It',  credits: 6,   priceInCents: 300,  description: '~6 min active' },
  { id: 'starter', name: 'Starter', credits: 20,  priceInCents: 900,  description: '~20 min active' },
  { id: 'plus',    name: 'Plus',    credits: 45,  priceInCents: 1900, description: '~45 min active' },
  { id: 'pro',     name: 'Pro',     credits: 100, priceInCents: 3900, description: '~100 min active' },
  { id: 'mega',    name: 'Mega',    credits: 280, priceInCents: 9900, description: '~280 min active' },
];

export function getCreditPacks() {
  return CREDIT_PACKS;
}

// =============================================================================
// CHECKOUT
// =============================================================================

export async function createRediCheckoutSession(data: {
  userId: string;
  packId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const pack = CREDIT_PACKS.find(p => p.id === data.packId);
  if (!pack) throw new Error('Invalid credit pack');

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Redi Credits — ' + pack.name,
          description: pack.credits + ' credits (' + pack.description + ')',
        },
        unit_amount: pack.priceInCents,
      },
      quantity: 1,
    }],
    metadata: {
      userId: data.userId,
      packId: data.packId,
      credits: pack.credits.toString(),
      source: 'redi',
    },
    success_url: data.successUrl,
    cancel_url: data.cancelUrl,
  });

  return session.url || '';
}

// =============================================================================
// WEBHOOK
// =============================================================================

export async function handleRediStripeWebhook(req: any, res: any) {
  const sig = req.headers['stripe-signature'];
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[Redi Billing] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[Redi Billing] Webhook signature verification failed:', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only process Redi credit purchases
    if (session.metadata?.source !== 'redi') {
      return res.json({ received: true, skipped: true });
    }

    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || '0');

    if (userId && credits > 0) {
      const db = getSupabase();

      const { data: user } = await db
        .from('redi_users')
        .select('credits_remaining')
        .eq('id', userId)
        .single();

      const newBalance = (user?.credits_remaining || 0) + credits;

      await db
        .from('redi_users')
        .update({
          credits_remaining: newBalance,
          stripe_customer_id: (session.customer as string) || undefined,
        })
        .eq('id', userId);

      await db.from('redi_purchases').insert({
        user_id: userId,
        pack_id: session.metadata?.packId,
        credits_added: credits,
        amount_cents: session.amount_total,
        stripe_session_id: session.id,
        created_at: new Date().toISOString(),
      });

      console.log(`[Redi Billing] ${userId.slice(0, 12)} purchased ${credits} credits. Balance: ${newBalance}`);
    }
  }

  res.json({ received: true });
}

// =============================================================================
// BALANCE
// =============================================================================

export async function getRediCreditBalance(userId: string): Promise<number> {
  const db = getSupabase();
  const { data } = await db
    .from('redi_users')
    .select('credits_remaining')
    .eq('id', userId)
    .single();
  return data?.credits_remaining || 0;
}

// =============================================================================
// DEDUCT CREDITS (called by V9 server credit timer)
// =============================================================================

export async function deductCredits(userId: string, amount: number): Promise<{ remaining: number; depleted: boolean }> {
  const db = getSupabase();

  const { data: user } = await db
    .from('redi_users')
    .select('credits_remaining')
    .eq('id', userId)
    .single();

  if (!user) return { remaining: 0, depleted: true };

  const newBalance = Math.max(0, (user.credits_remaining || 0) - amount);

  await db
    .from('redi_users')
    .update({ credits_remaining: newBalance })
    .eq('id', userId);

  return { remaining: newBalance, depleted: newBalance <= 0 };
}
