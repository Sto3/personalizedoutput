/**
 * Checkout API
 *
 * Handles direct product purchases via Stripe.
 * This is the PRIMARY purchase flow for the website.
 *
 * Flow:
 * 1. Customer clicks "Buy Now" on product page
 * 2. POST /api/checkout/create → Creates Stripe checkout session
 * 3. Customer completes payment on Stripe
 * 4. Stripe webhook → /api/checkout/webhook → Order created in Supabase
 * 5. Customer redirected to success page with order token
 * 6. Customer fills out questionnaire using order token
 * 7. Product generated and delivered
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import {
  createOrder,
  completeOrder,
  getOrder,
  PRODUCTS,
  ProductType,
} from '../lib/supabase/orderService';
import { addToEmailList } from '../lib/supabase/emailListService';
import { sendPurchaseConfirmation } from '../services/emailService';

const router = Router();

// Initialize Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET_CHECKOUT || process.env.STRIPE_WEBHOOK_SECRET || '';
const SITE_URL = process.env.SITE_URL || 'https://personalizedoutput.com';

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key not configured');
  }
  if (!stripe) {
    stripe = new Stripe(STRIPE_SECRET_KEY);
  }
  return stripe;
}

function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}

// VIP emails that get free access (for testing the full user flow)
const VIP_EMAILS = [
  'matthew_riley10@outlook.com',
  'persefit@outlook.com'
];

function isVipEmail(email: string | undefined): boolean {
  if (!email) return false;
  return VIP_EMAILS.includes(email.toLowerCase());
}

// ============================================================
// CREATE CHECKOUT SESSION
// ============================================================

interface CreateCheckoutBody {
  productId: ProductType;
  email?: string;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * POST /api/checkout/create
 * Creates a Stripe checkout session for a one-time product purchase
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: 'Payment processing not available' });
    }

    const { productId, email, successUrl, cancelUrl } = req.body as CreateCheckoutBody;

    // Validate product
    const product = PRODUCTS[productId];
    if (!product || !product.isActive) {
      return res.status(400).json({ error: 'Invalid product' });
    }

    // VIP bypass - free checkout for admin/test emails
    if (isVipEmail(email)) {
      console.log(`[Checkout] VIP bypass for ${email} - ${product.name}`);

      // Create order directly (simulates what webhook does)
      const { order, error: orderError } = await createOrder({
        productType: productId,
        source: 'website',
        email: email!,
        inputData: {
          stripeSessionId: `vip_${Date.now()}`,
          amountPaid: 0,
          vip: true,
          originalPrice: product.price,
        },
      });

      if (order && !orderError) {
        // Add to email list
        try {
          await addToEmailList(email!, 'website_purchase', [productId]);
        } catch (e) {
          console.error('[Checkout] VIP - Failed to add to email list:', e);
        }

        // Send confirmation email
        try {
          let personalizationUrl = `${SITE_URL}/${product.slug}`;
          if (productId === 'santa_message') {
            personalizationUrl = `${SITE_URL}/santa`;
          } else if (productId === 'vision_board') {
            personalizationUrl = `${SITE_URL}/vision-board`;
          }

          await sendPurchaseConfirmation(email!, product.name, {
            orderId: order.id,
            amount: 0,
            accessUrl: personalizationUrl,
          });
          console.log(`[Checkout] VIP confirmation email sent to ${email}`);
        } catch (e) {
          console.error('[Checkout] VIP - Failed to send email:', e);
        }

        // Return success URL directly (bypass Stripe checkout page)
        const successUrl = `${SITE_URL}/purchase/success?session_id=vip_${order.id}`;
        return res.json({
          sessionId: `vip_${order.id}`,
          url: successUrl,
          vip: true
        });
      }
    }

    const stripe = getStripe();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description,
              metadata: {
                productId: product.id,
              },
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || `${SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${SITE_URL}/${product.slug}`,
      metadata: {
        productId: product.id,
        productName: product.name,
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address for fraud prevention
      billing_address_collection: 'required',
    });

    console.log(`[Checkout] Session created: ${session.id} for ${product.name}`);

    return res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[Checkout] Error creating session:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    });
  }
});

// ============================================================
// WEBHOOK HANDLER
// ============================================================

/**
 * POST /api/checkout/webhook
 * Handles Stripe webhook events for completed purchases
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('[Checkout Webhook] Webhook secret not configured');
      return res.status(400).json({ error: 'Webhook not configured' });
    }

    const stripe = getStripe();
    const signature = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('[Checkout Webhook] Signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log(`[Checkout Webhook] Received event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        // Payment successful - may be redundant with checkout.session.completed
        console.log('[Checkout Webhook] Payment succeeded');
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Checkout Webhook] Payment failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`[Checkout Webhook] Unhandled event: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('[Checkout Webhook] Error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const productId = session.metadata?.productId as ProductType;
  const customerEmail = session.customer_details?.email || session.customer_email;
  const paymentIntentId = session.payment_intent as string;

  console.log(`[Checkout] Processing completed session: ${session.id}`);
  console.log(`[Checkout] Product: ${productId}, Email: ${customerEmail}`);

  if (!productId) {
    console.error('[Checkout] No productId in session metadata');
    return;
  }

  // Create order in Supabase
  const { order, error } = await createOrder({
    productType: productId,
    source: 'website',
    email: customerEmail || undefined,
    stripePaymentIntentId: paymentIntentId,
    inputData: {
      stripeSessionId: session.id,
      amountPaid: session.amount_total,
      currency: session.currency,
    },
  });

  if (error) {
    console.error(`[Checkout] Failed to create order: ${error}`);
    return;
  }

  console.log(`[Checkout] Order created: ${order?.id}`);

  // Add customer to email list
  if (customerEmail) {
    try {
      await addToEmailList(
        customerEmail,
        'website_purchase',
        [productId],
        undefined
      );
      console.log(`[Checkout] Added ${customerEmail} to email list`);
    } catch (e) {
      console.error('[Checkout] Failed to add to email list:', e);
    }

    // Send purchase confirmation email
    const product = PRODUCTS[productId];
    if (product && order) {
      try {
        // Build personalization URL based on product type
        let personalizationUrl = `${SITE_URL}/${product.slug}`;
        if (productId === 'santa_message') {
          personalizationUrl = `${SITE_URL}/santa`;
        } else if (productId === 'vision_board') {
          personalizationUrl = `${SITE_URL}/vision-board`;
        }

        await sendPurchaseConfirmation(customerEmail, product.name, {
          orderId: order.id,
          amount: session.amount_total || product.price,
          accessUrl: personalizationUrl,
        });
        console.log(`[Checkout] Confirmation email sent to ${customerEmail}`);
      } catch (e) {
        console.error('[Checkout] Failed to send confirmation email:', e);
      }
    }
  }
}

// ============================================================
// SUCCESS PAGE DATA
// ============================================================

/**
 * GET /api/checkout/session/:sessionId
 * Get session details for the success page
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Handle VIP sessions (format: vip_<orderId>)
    if (sessionId.startsWith('vip_')) {
      const orderId = sessionId.replace('vip_', '');
      const order = await getOrder(orderId);

      if (!order) {
        return res.status(404).json({ error: 'VIP order not found' });
      }

      const product = PRODUCTS[order.product_type as ProductType];
      const customerEmail = order.output_metadata?.email as string | undefined;

      return res.json({
        status: 'paid',
        productId: order.product_type,
        productName: product?.name || 'Unknown Product',
        productSlug: product?.slug,
        customerEmail,
        amountTotal: 0,
        currency: 'usd',
        vip: true
      });
    }

    // Regular Stripe session
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: 'Payment processing not available' });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const productId = session.metadata?.productId as ProductType;
    const product = productId ? PRODUCTS[productId] : null;

    return res.json({
      status: session.payment_status,
      productId,
      productName: product?.name || 'Unknown Product',
      productSlug: product?.slug,
      customerEmail: session.customer_details?.email || session.customer_email,
      amountTotal: session.amount_total,
      currency: session.currency,
    });
  } catch (error) {
    console.error('[Checkout] Error retrieving session:', error);
    return res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// ============================================================
// PRODUCT PRICES (for frontend)
// ============================================================

/**
 * GET /api/checkout/products
 * Get all products with prices for the frontend
 */
router.get('/products', async (_req: Request, res: Response) => {
  const products = Object.values(PRODUCTS)
    .filter(p => p.isActive)
    .map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      priceFormatted: `$${(p.price / 100).toFixed(2)}`,
      category: p.category,
      slug: p.slug,
    }));

  return res.json({ products });
});

/**
 * GET /api/checkout/product/:productId
 * Get a single product with price
 */
router.get('/product/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;
  const product = PRODUCTS[productId as ProductType];

  if (!product || !product.isActive) {
    return res.status(404).json({ error: 'Product not found' });
  }

  return res.json({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    priceFormatted: `$${(product.price / 100).toFixed(2)}`,
    category: product.category,
    slug: product.slug,
  });
});

export default router;
