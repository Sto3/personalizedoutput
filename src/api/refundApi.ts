/**
 * Refund API
 *
 * Handles automatic refund processing via Stripe.
 * No questions asked policy - validates order ownership and processes refund.
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getOrder, updateOrderStatus } from '../lib/supabase/orderService';

const router = Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

let stripe: Stripe | null = null;

function getStripe(): Stripe | null {
  if (!STRIPE_SECRET_KEY) return null;
  if (!stripe) {
    stripe = new Stripe(STRIPE_SECRET_KEY);
  }
  return stripe;
}

/**
 * POST /api/refund/request
 * Process a refund request
 */
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { orderId, email } = req.body;

    if (!orderId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Order ID and email are required'
      });
    }

    console.log(`[Refund] Processing refund request for order: ${orderId}, email: ${email}`);

    // Get the order
    const order = await getOrder(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found. Please check your order ID.'
      });
    }

    // Get email and payment info from order metadata
    const orderEmail = order.output_metadata?.email as string | undefined;
    const stripeSessionId = order.input_data?.stripeSessionId as string | undefined;
    const amountPaid = order.input_data?.amountPaid as number | undefined;
    const isVipOrder = order.input_data?.vip === true;

    // Verify email matches
    if (!orderEmail || orderEmail.toLowerCase() !== email.toLowerCase()) {
      console.log(`[Refund] Email mismatch: ${orderEmail} vs ${email}`);
      return res.status(403).json({
        success: false,
        error: 'Email does not match the order. Please use the email you used for purchase.'
      });
    }

    // Check if already refunded
    if (order.status === 'refunded') {
      return res.status(400).json({
        success: false,
        error: 'This order has already been refunded.'
      });
    }

    // Handle VIP orders (free, no actual payment to refund)
    if (isVipOrder || stripeSessionId?.startsWith('vip_') || amountPaid === 0) {
      await updateOrderStatus(orderId, 'refunded');
      console.log(`[Refund] VIP order marked as refunded: ${orderId}`);

      return res.json({
        success: true,
        message: 'Your order has been cancelled.'
      });
    }

    // Get Stripe instance
    const stripeClient = getStripe();
    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        error: 'Refund processing is temporarily unavailable. Please contact support.'
      });
    }

    // Find the payment intent from the checkout session
    let paymentIntentId: string | null = null;

    if (stripeSessionId && !stripeSessionId.startsWith('vip_')) {
      try {
        const session = await stripeClient.checkout.sessions.retrieve(stripeSessionId);
        paymentIntentId = session.payment_intent as string;
      } catch (e) {
        console.error(`[Refund] Could not retrieve Stripe session: ${e}`);
      }
    }

    if (!paymentIntentId) {
      // Try to find by customer email and amount
      console.log(`[Refund] Searching for payment by email: ${email}, amount: ${amountPaid}`);

      try {
        const paymentIntents = await stripeClient.paymentIntents.list({
          limit: 100,
        });

        // Find matching payment
        const matchingPayment = paymentIntents.data.find(pi => {
          const receiptEmail = pi.receipt_email?.toLowerCase();
          const searchEmail = email.toLowerCase();

          // Match by email and amount
          return receiptEmail === searchEmail &&
                 pi.amount === amountPaid &&
                 pi.status === 'succeeded';
        });

        if (matchingPayment) {
          paymentIntentId = matchingPayment.id;
        }
      } catch (e) {
        console.error(`[Refund] Error searching payments: ${e}`);
      }
    }

    if (!paymentIntentId) {
      console.error(`[Refund] Could not find payment for order: ${orderId}`);
      return res.status(400).json({
        success: false,
        error: 'Could not locate the payment for this order. Please contact support at support@personalizedoutput.com'
      });
    }

    // Process the refund
    try {
      const refund = await stripeClient.refunds.create({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer'
      });

      console.log(`[Refund] Refund created: ${refund.id} for payment: ${paymentIntentId}`);

      // Update order status
      await updateOrderStatus(orderId, 'refunded');

      return res.json({
        success: true,
        message: 'Your refund has been processed! You\'ll see it on your statement within 5-10 business days.',
        refundId: refund.id
      });

    } catch (refundError: any) {
      console.error(`[Refund] Stripe refund error: ${refundError.message}`);

      // Check for specific error types
      if (refundError.code === 'charge_already_refunded') {
        await updateOrderStatus(orderId, 'refunded');
        return res.json({
          success: true,
          message: 'This order was already refunded. Check your statement.'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Unable to process refund. Please contact support at support@personalizedoutput.com'
      });
    }

  } catch (error) {
    console.error('[Refund] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again or contact support.'
    });
  }
});

export default router;
