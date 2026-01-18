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
  PURCHASES,
  APPLE_PRODUCTS,
  APPLE_SUBSCRIPTION_TIERS,
  getStripePriceId,
  getMinutesForProduct,
  getProductType,
  formatMinutes
} from '../lib/redi/subscriptionTypes';

import {
  upsertSubscription,
  getSubscription,
  canStartSession,
  canUseMinutes,
  deductSession,
  deductMinutes,
  addMinutes,
  grantTrySession,
  resetCredits,
  resetMinutes,
  updateSubscriptionStatus,
  cancelSubscription,
  getSessionBalance,
  getMinuteBalance,
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

import { getV3ConnectionStats } from '../websocket/rediV3Server';
import { isDeepgramConfigured } from '../lib/redi/transcriptionService';
import { isElevenLabsConfigured, getAvailableVoices } from '../lib/redi/voiceService';

const router: Router = express.Router();

// Stripe setup
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// New pricing model - minute based
// Try: $9/15min, Monthly: $59/120min, Unlimited: $99
// Extensions: $4/5min, $7/10min, $10/15min
// Overage: $10/15min

// Prices in cents
const PRICES = {
  try: 900,       // $9.00
  monthly: 5900,  // $59.00/mo
  unlimited: 9900, // $99.00/mo
  extend5: 400,   // $4.00
  extend10: 700,  // $7.00
  extend15: 1000, // $10.00
  overage: 1000   // $10.00
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

  // New pricing model - minute based
  const pricing = {
    // Try Redi - one-time
    try: {
      price: 9,
      currency: 'USD',
      minutes: 15,
      label: 'Try Redi (15 min)',
      productId: 'com.personalizedoutput.redi.try'
    },

    // Subscriptions
    subscriptions: Object.entries(SUBSCRIPTION_TIERS).map(([key, config]) => ({
      id: key,
      name: config.name,
      priceMonthly: config.priceMonthly / 100,
      currency: 'USD',
      minutesIncluded: config.minutesIncluded,
      features: config.features,
      isUnlimited: config.minutesIncluded === -1,
      productId: `com.personalizedoutput.redi.${key}`
    })),

    // Extensions (for adding time during sessions)
    extensions: [
      { id: 'extend5', price: 4, minutes: 5, label: '+5 min', productId: 'com.personalizedoutput.redi.extend5' },
      { id: 'extend10', price: 7, minutes: 10, label: '+10 min', productId: 'com.personalizedoutput.redi.extend10min' },
      { id: 'extend15', price: 10, minutes: 15, label: '+15 min', productId: 'com.personalizedoutput.redi.extend15min' }
    ],

    // Overage (for subscribers who ran out of minutes)
    overage: {
      price: 10,
      minutes: 15,
      label: 'Extra Time (15 min)',
      productId: 'com.personalizedoutput.redi.overage15min'
    }
  };

  res.json({
    modes,
    voices: getAvailableVoices(),
    pricing,
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
      durationMinutes: parseInt(metadata.duration || '15') as 15 | 20 | 30 | 60
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

// ============================================================================
// APPLE IN-APP PURCHASE ENDPOINTS
// ============================================================================

// Apple Product ID mappings are imported from subscriptionTypes.ts
// APPLE_PRODUCTS and APPLE_SUBSCRIPTION_TIERS

/**
 * POST /api/redi/validate-receipt
 * Validate Apple In-App Purchase receipt (called by iOS app)
 *
 * Note: For StoreKit 2, the JWS (JSON Web Signature) is already verified by Apple.
 * We store the transaction for record-keeping and fraud detection.
 */
router.post('/validate-receipt', async (req: Request, res: Response) => {
  const {
    receiptData,      // JWS representation from StoreKit 2
    productId,
    transactionId,
    originalTransactionId,
    userId,
    deviceId
  } = req.body;

  if (!transactionId || !productId) {
    res.status(400).json({ error: 'Missing transactionId or productId' });
    return;
  }

  try {
    const actualUserId = userId || deviceId;
    console.log(`[Redi API] Apple receipt validated: ${productId} for user ${actualUserId}, transaction ${transactionId}`);

    // Get product type
    const productType = getProductType(productId);
    const minutesProvided = getMinutesForProduct(productId);

    if (productType === 'subscription') {
      // Handle subscription validation
      const tier = APPLE_SUBSCRIPTION_TIERS[productId];

      // Create/update subscription record
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1); // Monthly subscription

      upsertSubscription(
        actualUserId,
        tier,
        null,  // No Stripe customer for Apple
        transactionId,
        now,
        periodEnd,
        true  // isApple
      );

      console.log(`[Redi API] Apple subscription validated: ${tier} for user ${actualUserId}`);
    } else if (productType === 'try') {
      // Grant try session minutes
      grantTrySession(actualUserId, transactionId);
      console.log(`[Redi API] Apple try session granted: ${minutesProvided} min for user ${actualUserId}`);
    } else if (productType === 'extension' || productType === 'overage') {
      // Add extension/overage minutes
      addMinutes(actualUserId, minutesProvided, productId, productType);
      console.log(`[Redi API] Apple ${productType} added: ${minutesProvided} min for user ${actualUserId}`);
    }

    res.json({
      valid: true,
      productId,
      transactionId,
      productType,
      minutesProvided
    });

  } catch (error) {
    console.error('[Redi API] Apple receipt validation error:', error);
    // Return success anyway - don't block purchase on our validation errors
    // Apple has already verified the transaction
    res.json({ valid: true });
  }
});

/**
 * POST /api/redi/session/apple
 * Create a Redi session from an Apple In-App Purchase
 *
 * With the new minute-based system, this creates a session that draws from
 * the user's minute balance. Duration is not fixed - it continues until
 * minutes run out or user ends it.
 */
router.post('/session/apple', async (req: Request, res: Response) => {
  const {
    transactionId,
    productId,
    userId,
    deviceId,
    mode: rediMode,
    voiceGender,
    sensitivity,
    requestedDuration  // Optional: user can request max duration
  } = req.body;

  const actualUserId = userId || deviceId;

  if (!actualUserId) {
    res.status(400).json({ error: 'Missing userId or deviceId' });
    return;
  }

  // Check minute balance first
  let balance = getMinuteBalance(actualUserId);

  // If no minutes and we have a productId, try to grant minutes as fallback
  // This handles cases where /validate-receipt call failed or was slow
  if (balance.minutesRemaining <= 0 && productId && transactionId) {
    const productType = getProductType(productId);
    const minutesProvided = getMinutesForProduct(productId);

    console.log(`[Redi API] No balance for user ${actualUserId}, attempting to grant from purchase: ${productId} (${productType})`);

    if (productType === 'try') {
      grantTrySession(actualUserId, transactionId);
    } else if (productType === 'extension' || productType === 'overage') {
      addMinutes(actualUserId, minutesProvided, productId, productType);
    }

    // Re-check balance after granting
    balance = getMinuteBalance(actualUserId);
  }

  if (!balance.canStartSession && balance.minutesRemaining <= 0) {
    res.status(403).json({
      error: 'No minutes available. Purchase time or subscribe.',
      minutesRemaining: balance.minutesRemaining
    });
    return;
  }

  // Validate mode
  if (rediMode && !MODE_CONFIGS[rediMode as RediMode]) {
    res.status(400).json({ error: 'Invalid mode.' });
    return;
  }

  try {
    // Determine session duration based on available minutes
    // Default to 15 minutes (Try Redi duration) unless user requests more
    // Cap at available balance if not unlimited
    const DEFAULT_SESSION_MINUTES = 15;
    let sessionDuration: number;

    if (balance.isUnlimited) {
      // Unlimited subscribers: use requested or default to 30 min
      sessionDuration = requestedDuration || 30;
    } else {
      // Limited minutes: use requested duration, default to 15, cap at balance
      const requested = requestedDuration || DEFAULT_SESSION_MINUTES;
      sessionDuration = Math.min(requested, balance.minutesRemaining);
    }

    // Create session config
    const config: SessionConfig = {
      mode: (rediMode as RediMode) || 'studying',
      sensitivity: sensitivity || 0.5,
      voiceGender: (voiceGender as VoiceGender) || 'female',
      durationMinutes: Math.min(sessionDuration, 60) as 15 | 20 | 30 | 60
    };

    const hostDeviceId = deviceId || uuidv4();

    // Create Redi session
    const session = createSession(
      config,
      hostDeviceId,
      transactionId ? `apple_${transactionId}` : undefined,
      actualUserId
    );

    console.log(`[Redi API] Session created: ${session.id} for user ${actualUserId} (${sessionDuration} min available)`);

    res.json({
      id: session.id,
      sessionId: session.id,
      joinCode: session.joinCode,
      mode: session.mode,
      sensitivity: session.sensitivity,
      voiceGender: session.voiceGender,
      durationMinutes: session.durationMinutes,
      expiresAt: session.expiresAt.toISOString(),
      status: session.status,
      audioOutputMode: session.audioOutputMode,
      maxParticipants: session.maxParticipants,
      participantCount: 1,
      isHost: true,
      websocketUrl: `/ws/redi?sessionId=${session.id}&deviceId=${hostDeviceId}`,
      // Include minute balance info
      minuteBalance: {
        minutesRemaining: balance.minutesRemaining,
        isUnlimited: balance.isUnlimited
      }
    });

  } catch (error) {
    console.error('[Redi API] Session creation error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * POST /api/redi/session/test
 * Create a test session with a special code (for development/testing)
 * Code: REDITEST or custom code from environment variable
 */
router.post('/session/test', async (req: Request, res: Response) => {
  const {
    code,
    userId,
    deviceId,
    mode: rediMode,
    voiceGender,
    sensitivity,
    testMode  // Alternative: just pass testMode: true (for iOS bypass)
  } = req.body;

  // Accept either a code or testMode flag (in development)
  const validCodes = ['REDITEST', 'TESTMODE', process.env.REDI_TEST_CODE].filter(Boolean);
  const isValidCode = code && validCodes.includes(code.toUpperCase());
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (!isValidCode && !(testMode && isDevelopment)) {
    res.status(403).json({ error: 'Invalid test code' });
    return;
  }

  const actualUserId = userId || deviceId || `test-${uuidv4().slice(0, 8)}`;
  const actualDeviceId = deviceId || uuidv4();

  try {
    // Grant 15 minutes for test session
    addMinutes(actualUserId, 15, 'Test session code');

    // Create session config
    const config: SessionConfig = {
      mode: (rediMode as RediMode) || 'studying',
      sensitivity: sensitivity || 0.5,
      voiceGender: (voiceGender as VoiceGender) || 'female',
      durationMinutes: 20 as 20 | 30 | 60  // Will be capped by actual minutes
    };

    // Create session
    const session = createSession(
      config,
      actualDeviceId,
      `test_${Date.now()}`,
      actualUserId
    );

    // Start tracking for history
    startSessionTracking(session.id, actualUserId, config.mode, 15, actualDeviceId);

    console.log(`[Redi API] TEST session created: ${session.id} for user ${actualUserId}`);

    res.json({
      id: session.id,
      sessionId: session.id,
      joinCode: session.joinCode,
      mode: session.mode,
      sensitivity: session.sensitivity,
      voiceGender: session.voiceGender,
      durationMinutes: 15,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: session.status,
      audioOutputMode: session.audioOutputMode,
      maxParticipants: session.maxParticipants,
      participantCount: 1,
      isHost: true,
      websocketUrl: `/ws/redi?sessionId=${session.id}&deviceId=${actualDeviceId}`,
      testMode: true
    });

  } catch (error) {
    console.error('[Redi API] Test session creation error:', error);
    res.status(500).json({ error: 'Failed to create test session' });
  }
});

/**
 * POST /api/redi/session/extend
 * Extend an active session by purchasing more time
 */
router.post('/session/extend', async (req: Request, res: Response) => {
  const { sessionId, userId, productId, transactionId, minutes } = req.body;

  if (!sessionId || !userId) {
    res.status(400).json({ error: 'Missing sessionId or userId' });
    return;
  }

  // Validate session exists and is active
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (session.status !== 'active') {
    res.status(400).json({ error: 'Session is not active' });
    return;
  }

  try {
    // Determine minutes to add
    let minutesToAdd = minutes;
    if (productId) {
      minutesToAdd = getMinutesForProduct(productId);
      const productType = getProductType(productId);

      if (productType === 'extension' || productType === 'overage') {
        // Add purchased minutes to user's balance
        addMinutes(userId, minutesToAdd, productId, productType);
      }
    }

    if (!minutesToAdd || minutesToAdd <= 0) {
      res.status(400).json({ error: 'Invalid minutes to add' });
      return;
    }

    // Extend session expiration
    const newExpiry = new Date(session.expiresAt.getTime() + minutesToAdd * 60 * 1000);
    session.expiresAt = newExpiry;

    const balance = getMinuteBalance(userId);

    console.log(`[Redi API] Session ${sessionId} extended by ${minutesToAdd} min for user ${userId}`);

    res.json({
      success: true,
      sessionId,
      minutesAdded: minutesToAdd,
      newExpiresAt: newExpiry.toISOString(),
      remainingSeconds: Math.max(0, Math.floor((newExpiry.getTime() - Date.now()) / 1000)),
      minuteBalance: {
        minutesRemaining: balance.minutesRemaining,
        isUnlimited: balance.isUnlimited
      }
    });

  } catch (error) {
    console.error('[Redi API] Session extend error:', error);
    res.status(500).json({ error: 'Failed to extend session' });
  }
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
  const connectionStats = getV3ConnectionStats();

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
      minutesIncluded: tierConfig.minutesIncluded
    });

  } catch (error) {
    console.error('[Redi API] Subscription checkout error:', error);
    res.status(500).json({ error: 'Failed to create subscription checkout' });
  }
});

/**
 * GET /api/redi/subscription/balance
 * Get user's minute balance and subscription info
 */
router.get('/subscription/balance', (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId) {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }

  const balance = getMinuteBalance(userId as string);

  res.json({
    userId,
    hasSubscription: balance.hasSubscription,
    tierId: balance.tierId,
    tierName: balance.tierName,
    status: balance.status,
    minutesRemaining: balance.minutesRemaining,
    minutesUsedThisPeriod: balance.minutesUsedThisPeriod,
    isUnlimited: balance.isUnlimited,
    periodEnd: balance.periodEnd?.toISOString() || null,
    canStartSession: balance.canStartSession,
    // Format for display
    minutesRemainingDisplay: formatMinutes(balance.minutesRemaining)
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
    durationMinutes: 15  // Default 15 minute sessions
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

// ============================================================
// VISUAL NAVIGATION ENDPOINT
// ============================================================

/**
 * POST /api/redi/visual-navigation
 * Analyze a forward-facing camera frame to provide landmark-based navigation hints.
 * Transforms "Turn right in 400 feet" into "Turn right at the Shell station ahead"
 */
router.post('/visual-navigation', async (req: Request, res: Response) => {
  const { frame, instruction, context } = req.body;

  if (!frame || !instruction) {
    res.status(400).json({ error: 'Missing frame or instruction' });
    return;
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error('[Visual Nav] OpenAI API key not configured');
    res.status(503).json({ error: 'Vision service not configured' });
    return;
  }

  try {
    // Call GPT-4o vision to analyze the frame
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a navigation assistant helping a driver. Given a forward-facing camera view and a navigation instruction, provide a more helpful landmark-based direction.

Rules:
- Be CONCISE - the driver needs quick, clear guidance
- Focus on VISIBLE landmarks: gas stations, stores, traffic lights, signs, buildings
- If you see a clear landmark near the turn, use it: "Turn right at the Shell station"
- If no obvious landmark, describe what's visible: "Turn right after the red building"
- Never invent landmarks you can't see
- Maximum 10 words
- If you can't see anything helpful, respond with just the original instruction shortened`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Navigation instruction: "${instruction}"\n\nWhat visible landmark can help the driver know where to turn?`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${frame}`,
                  detail: 'low'  // Fast processing for driving context
                }
              }
            ]
          }
        ],
        max_tokens: 50,
        temperature: 0.3  // Low temperature for consistent, factual responses
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Visual Nav] OpenAI API error:', errorText);
      res.status(500).json({ error: 'Vision analysis failed' });
      return;
    }

    const data = await response.json();
    const hint = data.choices?.[0]?.message?.content?.trim() || instruction;

    console.log(`[Visual Nav] "${instruction}" → "${hint}"`);

    res.json({ hint });

  } catch (error) {
    console.error('[Visual Nav] Error:', error);
    // Return original instruction as fallback
    res.json({ hint: instruction });
  }
});

/**
 * Helper: Get display name for mode
 */
function getModeDisplayName(mode: RediMode): string {
  const names: Record<RediMode, string> = {
    general: 'Use Redi for Anything',
    cooking: 'Cooking & Kitchen',
    studying: 'Studying & Learning',
    meeting: 'Meeting & Presentation',
    sports: 'Sports & Movement',
    music: 'Music & Instrument',
    assembly: 'Building & Assembly',
    monitoring: 'Watching Over',
    driving: 'Driving Mode'
  };
  return names[mode] || mode;
}

export default router;
