/**
 * Homework Rescue - API Endpoints
 *
 * Handles:
 * - Chat personalization flow
 * - Order creation and status
 * - Lesson generation triggers
 * - Remake requests
 * - Referral system
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import {
  createConversationState,
  generateNextMessage,
  finalizeIntake,
  ConversationState
} from '../lib/thoughtEngine/homework/homeworkQuestionnaire';
import {
  lessonQueue,
  createOrder,
  getOrder,
  startLessonGeneration,
  createRemakeOrder
} from '../queues/lessonQueue';
import { HomeworkIntake } from '../lib/thoughtEngine/homework/types';
import { trackEvent } from './analyticsApi';

const router = Router();

// Stripe initialization
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover'
});

// In-memory session storage (use Redis in production)
const sessions: Map<string, ConversationState> = new Map();
const orderSessions: Map<string, string> = new Map(); // orderId -> sessionId

// Product price
const HOMEWORK_RESCUE_PRICE = 2500; // $25.00 in cents

/**
 * Start a new personalization chat session
 */
router.post('/homework-rescue/chat/start', async (req: Request, res: Response) => {
  try {
    const sessionId = uuidv4();
    const state = createConversationState(sessionId);

    // Generate initial greeting
    const { message, updatedState } = await generateNextMessage(state);

    sessions.set(sessionId, updatedState);

    // Track event
    await trackEvent('lesson.intake_started', {
      sessionId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      sessionId,
      message,
      isComplete: false,
      phase: updatedState.currentPhase
    });
  } catch (error: any) {
    console.error('[API] Error starting chat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Continue personalization chat
 */
router.post('/homework-rescue/chat/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ success: false, error: 'Missing sessionId or message' });
    }

    const state = sessions.get(sessionId);
    if (!state) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Generate next message
    const { message: response, updatedState } = await generateNextMessage(state, message);

    sessions.set(sessionId, updatedState);

    // Check if intake is complete
    if (updatedState.isComplete) {
      await trackEvent('lesson.intake_completed', {
        sessionId,
        duration_seconds: Math.round((Date.now() - new Date(state.messageHistory[0]?.timestamp || Date.now()).getTime()) / 1000),
        question_count: state.messageHistory.length
      });
    }

    res.json({
      success: true,
      message: response,
      isComplete: updatedState.isComplete,
      phase: updatedState.currentPhase,
      collectedData: updatedState.collectedData // For debugging/preview
    });
  } catch (error: any) {
    console.error('[API] Error in chat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create Stripe checkout session
 */
router.post('/homework-rescue/checkout', async (req: Request, res: Response) => {
  try {
    const { sessionId, email, referralCode } = req.body;

    if (!sessionId || !email) {
      return res.status(400).json({ success: false, error: 'Missing sessionId or email' });
    }

    const state = sessions.get(sessionId);
    if (!state || !state.isComplete) {
      return res.status(400).json({ success: false, error: 'Personalization not complete' });
    }

    // Create order ID
    const orderId = `hr_${uuidv4().split('-')[0]}`;
    orderSessions.set(orderId, sessionId);

    // Apply referral discount if valid
    let discountPercent = 0;
    if (referralCode) {
      // Validate referral code (simplified - use database in production)
      discountPercent = 10; // 10% off for referred customers
    }

    const finalPrice = Math.round(HOMEWORK_RESCUE_PRICE * (1 - discountPercent / 100));

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Homework Rescue - Personalized Lesson',
              description: `Personalized tutoring lesson for ${state.collectedData.childName}`,
              images: ['https://personalizedoutput.com/images/homework-rescue-product.jpg']
            },
            unit_amount: finalPrice
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.BASE_URL || 'https://personalizedoutput.com'}/homework-rescue/order/${orderId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL || 'https://personalizedoutput.com'}/homework-rescue?canceled=true`,
      customer_email: email,
      metadata: {
        orderId,
        sessionId,
        childName: state.collectedData.childName || '',
        subject: state.collectedData.subject || '',
        topic: state.collectedData.topic || '',
        referralCode: referralCode || ''
      }
    });

    await trackEvent('InitiateCheckout', {
      orderId,
      sessionId,
      value: finalPrice / 100
    });

    res.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      orderId
    });
  } catch (error: any) {
    console.error('[API] Error creating checkout:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Stripe webhook handler
 */
router.post('/webhooks/stripe/homework-rescue', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      endpointSecret as string
    );
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { orderId, sessionId, referralCode } = session.metadata || {};

    if (orderId && sessionId) {
      const state = sessions.get(sessionId);
      if (state && state.isComplete) {
        try {
          // Finalize intake
          const intake = finalizeIntake(state, orderId);

          // Create order
          const order = createOrder(intake, session.customer_email || '', session.id);

          // Start generation
          await startLessonGeneration(orderId, intake, session.customer_email || '');

          // Track purchase
          await trackEvent('CompletePayment', {
            orderId,
            value: (session.amount_total || 0) / 100,
            currency: 'USD',
            subject: intake.subject,
            grade: intake.grade
          });

          // Handle referral credit
          if (referralCode) {
            // Award credit to referrer (implement in referral system)
          }

          console.log(`[Webhook] Order ${orderId} started generation`);
        } catch (error: any) {
          console.error('[Webhook] Error processing order:', error);
        }
      }
    }
  }

  res.json({ received: true });
});

/**
 * Get order status
 */
router.get('/homework-rescue/order/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = getOrder(orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Get job progress from queue
    const job = lessonQueue.getJobByOrderId(orderId);

    res.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        childName: order.intake.childName,
        subject: order.intake.subject,
        topic: order.intake.topic,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
        progress: job?.progress || 0,
        currentStep: job?.currentStep || 'Queued',
        videoUrl: order.videoUrl,
        practiceSheetUrl: order.practiceSheetUrl,
        answerKeyUrl: order.answerKeyUrl,
        parentSummaryUrl: order.parentSummaryUrl
      }
    });
  } catch (error: any) {
    console.error('[API] Error getting order status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Request a remake
 */
router.post('/homework-rescue/order/:orderId/remake', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { reason, feedback, adjustments } = req.body;

    const order = getOrder(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Check if remake already used
    if (order.isRemake) {
      return res.status(400).json({
        success: false,
        error: 'Remake already used for this order'
      });
    }

    // Create updated intake with adjustments
    const updatedIntake: HomeworkIntake = {
      ...order.intake,
      // Apply adjustments
      ...(adjustments?.tone && { tone: adjustments.tone }),
      ...(adjustments?.additionalContext && {
        additionalContext: `${order.intake.additionalContext || ''} ${adjustments.additionalContext}`.trim()
      })
    };

    // Create remake order
    const remakeOrderId = await createRemakeOrder(orderId, updatedIntake, reason);

    await trackEvent('lesson.remake_requested', {
      originalOrderId: orderId,
      remakeOrderId,
      reason
    });

    res.json({
      success: true,
      remakeOrderId,
      message: 'Remake started! We\'ll email you when it\'s ready.'
    });
  } catch (error: any) {
    console.error('[API] Error creating remake:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Submit feedback
 */
router.post('/homework-rescue/order/:orderId/feedback', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { rating, comment, wouldRecommend } = req.body;

    const order = getOrder(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    await trackEvent('lesson.feedback_submitted', {
      orderId,
      rating,
      comment,
      wouldRecommend
    });

    res.json({
      success: true,
      message: 'Thank you for your feedback!'
    });
  } catch (error: any) {
    console.error('[API] Error submitting feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get queue stats (admin)
 */
router.get('/homework-rescue/admin/stats', async (req: Request, res: Response) => {
  try {
    const stats = lessonQueue.getStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
