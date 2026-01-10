/**
 * Redi API Router
 *
 * REST endpoints for session management, payments, subscriptions, and configuration.
 * Supports multi-phone sessions with join codes.
 */

import express, { Request, Response, Router } from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import {
  RediMode,
  VoiceGender,
  SessionConfig,
  MODE_CONFIGS
} from '../lib/redi/types';

import {
  createSession,
  getSession,
  validateSession,
  getSessionCosts,
  getRemainingTime,
  getActiveSessions,
  getSessionStats,
  joinSession,
  getParticipants,
  getParticipantCount,
  isHost,
  getSessionByJoinCode
} from '../lib/redi/sessionManager';

import {
  RediSubscriptionTier,
  SUBSCRIPTION_TIERS,
  ONE_TIME_PURCHASES,
  getStripePriceId
} from '../lib/redi/subscriptionTypes';

import {
  upsertSubscription,
  getSubscription,
  canStartSession,
  deductSession,
  resetCredits,
  updateSubscriptionStatus,
  cancelSubscription,
  grantOneTimeSession,
  getSessionBalance,
  findUserByStripeCustomer,
  findUserByStripeSubscription
} from '../lib/redi/subscriptionService';

import {
  startSessionTracking,
  endSessionTracking,
  getUserSessionHistory,
  getUserSessionStats,
  recordAIResponse,
  recordUserQuestion,
  recordSnapshotAnalysis,
  recordMotionClipAnalysis
} from '../lib/redi/sessionHistoryService';

import { getConnectionStats } from '../websocket/rediSocket';
import { isDeepgramConfigured } from '../lib/redi/transcriptionService';
import { isElevenLabsConfigured, getAvailableVoices } from '../lib/redi/voiceService';

const router: Router = express.Router();

// Stripe setup
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Pricing
const PRICES: Record<string, number> = {
  '20': 1400,   // $14.00 in cents
  '30': 2600,   // $26.00 in cents
  '60': 4900    // $49.00 in cents
};

// Stripe Price IDs (create these in Stripe dashboard)
const STRIPE_PRICE_IDS: Record<string, string> = {
  '20': process.env.STRIPE_REDI_20MIN_PRICE_ID || '',
  '30': process.env.STRIPE_REDI_30MIN_PRICE_ID || '',
  '60': process.env.STRIPE_REDI_60MIN_PRICE_ID || ''
};

/**
 * GET /api/redi/health
 * Health check and configuration status
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      deepgram: isDeepgramConfigured(),
      elevenlabs: isElevenLabsConfigured(),
      stripe: !!stripe,
      anthropic: !!process.env.ANTHROPIC_API_KEY
    }
  });
});

/**
 * GET /api/redi/config
 * Get available modes, voices, pricing, and subscription tiers
 */
router.get('/config', (req: Request, res: Response) => {
  const modes = Object.entries(MODE_CONFIGS).map(([key, config]) => ({
    id: key,
    name: getModeDisplayName(key as RediMode),
    description: config.systemPromptFocus,
    defaultSensitivity: config.defaultSensitivity,
    usesMotionDetection: config.useMotionDetection
  }));

  // One-time purchase pricing
  const oneTimePricing = {
    '20': { price: 14, currency: 'USD', label: '20 minutes', type: 'one_time' },
    '30': { price: 26, currency: 'USD', label: '30 minutes', type: 'one_time' },
    '60': { price: 49, currency: 'USD', label: '60 minutes', type: 'one_time' }
  };

  // Subscription tier pricing
  const subscriptionTiers = Object.entries(SUBSCRIPTION_TIERS).map(([key, config]) => ({
    id: key,
    name: config.name,
    priceMonthly: config.priceMonthly / 100,  // Convert cents to dollars
    currency: 'USD',
    sessionsIncluded: config.sessionsIncluded,
    sessionDuration: config.sessionDuration,
    features: config.features,
    isUnlimited: config.sessionsIncluded === -1
  }));

  res.json({
    modes,
    voices: getAvailableVoices(),
    pricing: {
      oneTime: oneTimePricing,
      subscriptions: subscriptionTiers
    },
    sensitivityRange: { min: 0, max: 1, default: 0.5 },
    maxParticipants: 5
  });
});

/**
 * POST /api/redi/checkout
 * Create Stripe checkout session for Redi
 */
router.post('/checkout', async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(503).json({ error: 'Payment system not configured' });
    return;
  }

  const {
    duration,
    mode: rediMode,
    voiceGender,
    sensitivity,
    deviceId,
    successUrl,
    cancelUrl
  } = req.body;

  // Validate duration
  if (duration !== 20 && duration !== 30 && duration !== 60) {
    res.status(400).json({ error: 'Invalid duration. Must be 20, 30, or 60.' });
    return;
  }

  // Validate mode
  if (!MODE_CONFIGS[rediMode as RediMode]) {
    res.status(400).json({ error: 'Invalid mode.' });
    return;
  }

  try {
    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'apple_pay', 'google_pay'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Redi - ${duration} Minute Session`,
            description: `${getModeDisplayName(rediMode as RediMode)} mode with ${voiceGender} voice`,
            images: ['https://personalizedoutput.com/images/redi-logo.png']
          },
          unit_amount: PRICES[duration.toString()]
        },
        quantity: 1
      }],
      metadata: {
        product: 'redi',
        duration: duration.toString(),
        mode: rediMode,
        voiceGender: voiceGender || 'female',
        sensitivity: (sensitivity || 0.5).toString(),
        deviceId: deviceId || uuidv4()
      },
      success_url: successUrl || `${process.env.BASE_URL || 'https://personalizedoutput.com'}/redi/session?checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.BASE_URL || 'https://personalizedoutput.com'}/redi`
    } as any);

    res.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id
    });

  } catch (error) {
    console.error('[Redi API] Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/redi/session
 * Create a Redi session after successful payment
 */
router.post('/session', async (req: Request, res: Response) => {
  const { checkoutSessionId, deviceId } = req.body;

  if (!checkoutSessionId) {
    res.status(400).json({ error: 'Missing checkoutSessionId' });
    return;
  }

  if (!stripe) {
    res.status(503).json({ error: 'Payment system not configured' });
    return;
  }

  try {
    // Retrieve Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);

    if (checkoutSession.payment_status !== 'paid') {
      res.status(402).json({ error: 'Payment not completed' });
      return;
    }

    // Extract session config from metadata
    const metadata = checkoutSession.metadata || {};
    const config: SessionConfig = {
      mode: (metadata.mode as RediMode) || 'studying',
      sensitivity: parseFloat(metadata.sensitivity || '0.5'),
      voiceGender: (metadata.voiceGender as VoiceGender) || 'female',
      durationMinutes: parseInt(metadata.duration || '30') as 20 | 30 | 60
    };

    // Use deviceId from request or from checkout metadata
    const hostDeviceId = deviceId || metadata.deviceId || uuidv4();

    // Create Redi session
    const session = createSession(
      config,
      hostDeviceId,
      checkoutSession.payment_intent as string
    );

    res.json({
      sessionId: session.id,
      joinCode: session.joinCode,
      mode: session.mode,
      sensitivity: session.sensitivity,
      voiceGender: session.voiceGender,
      durationMinutes: session.durationMinutes,
      expiresAt: session.expiresAt.toISOString(),
      audioOutputMode: session.audioOutputMode,
      maxParticipants: session.maxParticipants,
      isHost: true,
      websocketUrl: `/ws/redi?sessionId=${session.id}&deviceId=${hostDeviceId}`
    });

  } catch (error) {
    console.error('[Redi API] Session creation error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * POST /api/redi/join
 * Join an existing session by code
 */
router.post('/join', (req: Request, res: Response) => {
  const { joinCode, deviceId, deviceName } = req.body;

  if (!joinCode) {
    res.status(400).json({ error: 'Missing joinCode' });
    return;
  }

  const actualDeviceId = deviceId || uuidv4();

  const result = joinSession(joinCode, actualDeviceId, deviceName);

  if (!result.success) {
    res.status(400).json({ error: result.reason });
    return;
  }

  const session = result.session!;

  res.json({
    sessionId: session.id,
    mode: session.mode,
    sensitivity: session.sensitivity,
    voiceGender: session.voiceGender,
    durationMinutes: session.durationMinutes,
    remainingSeconds: getRemainingTime(session.id),
    audioOutputMode: session.audioOutputMode,
    participantCount: getParticipantCount(session.id),
    maxParticipants: session.maxParticipants,
    isHost: false,
    websocketUrl: `/ws/redi?joinCode=${joinCode}&deviceId=${actualDeviceId}`
  });
});

/**
 * GET /api/redi/session/:sessionId
 * Get session status
 */
router.get('/session/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { deviceId } = req.query;

  const validation = validateSession(sessionId);
  if (!validation.valid) {
    res.status(404).json({ error: validation.reason });
    return;
  }

  const session = validation.session!;
  const costs = getSessionCosts(sessionId);
  const participants = getParticipants(sessionId);

  res.json({
    sessionId: session.id,
    joinCode: session.joinCode,
    mode: session.mode,
    status: session.status,
    sensitivity: session.sensitivity,
    voiceGender: session.voiceGender,
    remainingSeconds: getRemainingTime(sessionId),
    audioOutputMode: session.audioOutputMode,
    participantCount: participants.length,
    maxParticipants: session.maxParticipants,
    participants: participants.map(p => ({
      deviceId: p.deviceId,
      isHost: p.isHost,
      deviceName: p.deviceName
    })),
    isHost: deviceId ? isHost(sessionId, deviceId as string) : undefined,
    costs: costs || { total: 0 }
  });
});

/**
 * GET /api/redi/session/code/:joinCode
 * Get session info by join code (for previewing before joining)
 */
router.get('/session/code/:joinCode', (req: Request, res: Response) => {
  const { joinCode } = req.params;

  const session = getSessionByJoinCode(joinCode);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const validation = validateSession(session.id);
  if (!validation.valid) {
    res.status(400).json({ error: validation.reason });
    return;
  }

  res.json({
    mode: session.mode,
    durationMinutes: session.durationMinutes,
    remainingSeconds: getRemainingTime(session.id),
    participantCount: getParticipantCount(session.id),
    maxParticipants: session.maxParticipants,
    canJoin: getParticipantCount(session.id) < session.maxParticipants
  });
});

/**
 * POST /api/redi/session/:sessionId/end
 * End a session early
 */
router.post('/session/:sessionId/end', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const costs = getSessionCosts(sessionId);

  res.json({
    message: 'Session ended',
    sessionId,
    finalCosts: costs
  });
});

/**
 * GET /api/redi/stats
 * Get aggregate statistics (admin only)
 */
router.get('/stats', (req: Request, res: Response) => {
  // In production, add admin authentication here
  const sessionStats = getSessionStats();
  const connectionStats = getConnectionStats();

  res.json({
    sessions: sessionStats,
    connections: connectionStats,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// SUBSCRIPTION ENDPOINTS
// ============================================================================

/**
 * POST /api/redi/subscribe
 * Create Stripe subscription checkout session
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(503).json({ error: 'Payment system not configured' });
    return;
  }

  const { tier, userId, successUrl, cancelUrl } = req.body;

  // Validate tier
  if (!SUBSCRIPTION_TIERS[tier as RediSubscriptionTier]) {
    res.status(400).json({ error: 'Invalid subscription tier. Must be starter, regular, or unlimited.' });
    return;
  }

  const tierConfig = SUBSCRIPTION_TIERS[tier as RediSubscriptionTier];
  const priceId = getStripePriceId(tier as RediSubscriptionTier);

  if (!priceId) {
    res.status(500).json({ error: `Stripe price ID not configured for tier: ${tier}` });
    return;
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      metadata: {
        product: 'redi_subscription',
        tier,
        userId: userId || uuidv4()
      },
      subscription_data: {
        metadata: {
          product: 'redi_subscription',
          tier,
          userId: userId || uuidv4()
        }
      },
      success_url: successUrl || `${process.env.BASE_URL || 'https://personalizedoutput.com'}/redi/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.BASE_URL || 'https://personalizedoutput.com'}/redi`
    });

    res.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      tier,
      priceMonthly: tierConfig.priceMonthly / 100,
      sessionsIncluded: tierConfig.sessionsIncluded
    });

  } catch (error) {
    console.error('[Redi API] Subscription checkout error:', error);
    res.status(500).json({ error: 'Failed to create subscription checkout' });
  }
});

/**
 * GET /api/redi/subscription/balance
 * Get user's session balance and subscription info
 */
router.get('/subscription/balance', (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId) {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }

  const balance = getSessionBalance(userId as string);

  res.json({
    userId,
    ...balance,
    periodEnd: balance.periodEnd?.toISOString() || null
  });
});

/**
 * POST /api/redi/subscription/cancel
 * Cancel a subscription (takes effect at end of billing period)
 */
router.post('/subscription/cancel', async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(503).json({ error: 'Payment system not configured' });
    return;
  }

  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }

  const subscription = getSubscription(userId);
  if (!subscription || !subscription.stripeSubscriptionId) {
    res.status(404).json({ error: 'No active subscription found' });
    return;
  }

  try {
    // Cancel at end of period (user keeps access until then)
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    res.json({
      message: 'Subscription will be canceled at the end of the current billing period',
      periodEnd: subscription.currentPeriodEnd?.toISOString()
    });

  } catch (error) {
    console.error('[Redi API] Subscription cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/redi/session/start
 * Start a session using subscription credits (deducts from allowance)
 */
router.post('/session/start', async (req: Request, res: Response) => {
  const { userId, deviceId, mode, voiceGender, sensitivity } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }

  // Check if user can start a session
  const canStart = canStartSession(userId);
  if (!canStart.canStart) {
    res.status(403).json({
      error: canStart.reason,
      sessionsRemaining: canStart.sessionsRemaining || 0
    });
    return;
  }

  // Create session config
  const config: SessionConfig = {
    mode: (mode as RediMode) || 'studying',
    sensitivity: sensitivity || 0.5,
    voiceGender: (voiceGender as VoiceGender) || 'female',
    durationMinutes: 30  // Subscription sessions are 30 min
  };

  const hostDeviceId = deviceId || uuidv4();

  // Create the session
  const session = createSession(config, hostDeviceId, undefined, userId);

  // Deduct from allowance
  deductSession(userId, session.id);

  // Get updated balance
  const balance = getSessionBalance(userId);

  res.json({
    sessionId: session.id,
    joinCode: session.joinCode,
    mode: session.mode,
    sensitivity: session.sensitivity,
    voiceGender: session.voiceGender,
    durationMinutes: session.durationMinutes,
    expiresAt: session.expiresAt.toISOString(),
    audioOutputMode: session.audioOutputMode,
    maxParticipants: session.maxParticipants,
    isHost: true,
    websocketUrl: `/ws/redi?sessionId=${session.id}&deviceId=${hostDeviceId}`,
    subscription: {
      sessionsRemaining: balance.sessionsRemaining,
      isUnlimited: balance.isUnlimited
    }
  });
});

/**
 * POST /api/redi/webhook
 * Stripe webhook handler for Redi payments and subscriptions
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(503).json({ error: 'Payment system not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_REDI_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Redi API] Webhook secret not configured');
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    switch (event.type) {
      // One-time payment completed
      case 'checkout.session.completed':
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        if (checkoutSession.metadata?.product === 'redi') {
          console.log(`[Redi API] One-time payment completed for checkout ${checkoutSession.id}`);
          // Session will be created when client calls /session endpoint
        }
        break;

      case 'payment_intent.payment_failed':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Redi API] Payment failed: ${paymentIntent.id}`);
        break;

      // Subscription created
      case 'customer.subscription.created':
        const newSubscription = event.data.object as any;
        if (newSubscription.metadata?.product === 'redi_subscription') {
          const userId = newSubscription.metadata.userId;
          const tier = newSubscription.metadata.tier as RediSubscriptionTier;
          const customerId = newSubscription.customer as string;

          upsertSubscription(
            userId,
            tier,
            customerId,
            newSubscription.id,
            new Date(newSubscription.current_period_start * 1000),
            new Date(newSubscription.current_period_end * 1000)
          );

          console.log(`[Redi API] Subscription created: ${tier} for user ${userId}`);
        }
        break;

      // Subscription updated (plan change, etc.)
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object as any;
        if (updatedSubscription.metadata?.product === 'redi_subscription') {
          const userId = updatedSubscription.metadata.userId ||
            findUserByStripeSubscription(updatedSubscription.id);

          if (userId) {
            // Check if subscription is being canceled at period end
            if (updatedSubscription.cancel_at_period_end) {
              console.log(`[Redi API] Subscription will cancel at period end for user ${userId}`);
            } else {
              // Update subscription details
              const tier = updatedSubscription.metadata.tier as RediSubscriptionTier;
              const customerId = updatedSubscription.customer as string;

              upsertSubscription(
                userId,
                tier,
                customerId,
                updatedSubscription.id,
                new Date(updatedSubscription.current_period_start * 1000),
                new Date(updatedSubscription.current_period_end * 1000)
              );
            }

            // Update status based on Stripe status
            if (updatedSubscription.status === 'past_due') {
              updateSubscriptionStatus(userId, 'past_due');
            } else if (updatedSubscription.status === 'unpaid') {
              updateSubscriptionStatus(userId, 'unpaid');
            }
          }
        }
        break;

      // Subscription deleted/canceled
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as any;
        if (deletedSubscription.metadata?.product === 'redi_subscription') {
          const userId = deletedSubscription.metadata.userId ||
            findUserByStripeSubscription(deletedSubscription.id);

          if (userId) {
            cancelSubscription(userId);
            console.log(`[Redi API] Subscription deleted for user ${userId}`);
          }
        }
        break;

      // Invoice paid (billing cycle renewal)
      case 'invoice.paid':
        const paidInvoice = event.data.object as any;
        if (paidInvoice.subscription) {
          // Fetch the subscription to get metadata
          const subId = typeof paidInvoice.subscription === 'string'
            ? paidInvoice.subscription
            : paidInvoice.subscription.id;

          const subscription = await stripe.subscriptions.retrieve(subId) as any;

          if (subscription.metadata?.product === 'redi_subscription') {
            const userId = subscription.metadata.userId ||
              findUserByStripeSubscription(subId);

            if (userId) {
              // Reset credits for new billing cycle
              resetCredits(
                userId,
                new Date(subscription.current_period_start * 1000),
                new Date(subscription.current_period_end * 1000)
              );

              console.log(`[Redi API] Credits reset for user ${userId} (billing cycle renewal)`);
            }
          }
        }
        break;

      // Invoice payment failed
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as any;
        if (failedInvoice.subscription) {
          const subId = typeof failedInvoice.subscription === 'string'
            ? failedInvoice.subscription
            : failedInvoice.subscription.id;

          const userId = findUserByStripeSubscription(subId);
          if (userId) {
            updateSubscriptionStatus(userId, 'past_due');
            console.log(`[Redi API] Payment failed for user ${userId}`);
          }
        }
        break;
    }

    res.json({ received: true });

  } catch (error) {
    console.error('[Redi API] Webhook error:', error);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
});

// ============================================================
// SESSION HISTORY ENDPOINTS
// ============================================================

/**
 * GET /api/redi/history
 * Get session history for a user
 */
router.get('/history', async (req: Request, res: Response) => {
  const { userId, limit, offset } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const history = await getUserSessionHistory(
      userId,
      parseInt(limit as string) || 20,
      parseInt(offset as string) || 0
    );

    res.json({ history });
  } catch (error) {
    console.error('[Redi API] History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch session history' });
  }
});

/**
 * GET /api/redi/history/stats
 * Get session stats for a user
 */
router.get('/history/stats', async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const stats = await getUserSessionStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('[Redi API] Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch session stats' });
  }
});

/**
 * Helper: Get display name for mode
 */
function getModeDisplayName(mode: RediMode): string {
  const names: Record<RediMode, string> = {
    studying: 'Studying & Learning',
    meeting: 'Meeting & Presentation',
    sports: 'Sports & Movement',
    music: 'Music & Instrument',
    assembly: 'Building & Assembly',
    monitoring: 'Watching Over'
  };
  return names[mode] || mode;
}

export default router;
