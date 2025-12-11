/**
 * Stripe Service
 *
 * Handles Stripe subscription management, webhooks, and billing.
 */

import Stripe from 'stripe';
import {
  SUBSCRIPTION_TIERS,
  TierName,
} from '../supabase/client';
import {
  getProfile,
  getProfileByEmail,
  updateSubscription,
  cancelSubscription,
  resetUsage,
  qualifyReferral,
} from '../supabase/userService';

// Initialize Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key not configured');
  }

  if (!stripe) {
    stripe = new Stripe(STRIPE_SECRET_KEY);
  }

  return stripe;
}

export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}

// ============================================================
// CUSTOMER MANAGEMENT
// ============================================================

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer | null> {
  if (!isStripeConfigured()) {
    return null;
  }

  const stripe = getStripe();
  const profile = await getProfile(userId);

  // If user already has a Stripe customer ID, retrieve it
  if (profile?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
      if (!customer.deleted) {
        return customer as Stripe.Customer;
      }
    } catch (error) {
      console.error('[Stripe] Error retrieving customer:', error);
    }
  }

  // Create new customer
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });

    return customer;
  } catch (error) {
    console.error('[Stripe] Error creating customer:', error);
    return null;
  }
}

// ============================================================
// CHECKOUT SESSION
// ============================================================

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  tier: TierName,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string | null; error: string | null }> {
  if (!isStripeConfigured()) {
    return { url: null, error: 'Stripe not configured' };
  }

  const tierConfig = SUBSCRIPTION_TIERS[tier];
  if (!tierConfig.stripePriceId) {
    return { url: null, error: `Price ID not configured for tier: ${tier}` };
  }

  const stripe = getStripe();

  try {
    // Get or create customer
    const customer = await getOrCreateCustomer(userId, email);
    if (!customer) {
      return { url: null, error: 'Failed to create customer' };
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: tierConfig.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        tier,
      },
      subscription_data: {
        metadata: {
          userId,
          tier,
        },
      },
    });

    return { url: session.url, error: null };
  } catch (error) {
    console.error('[Stripe] Error creating checkout session:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    };
  }
}

/**
 * Create a customer portal session for managing subscription
 */
export async function createPortalSession(
  userId: string,
  returnUrl: string
): Promise<{ url: string | null; error: string | null }> {
  if (!isStripeConfigured()) {
    return { url: null, error: 'Stripe not configured' };
  }

  const profile = await getProfile(userId);
  if (!profile?.stripe_customer_id) {
    return { url: null, error: 'No subscription found' };
  }

  const stripe = getStripe();

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return { url: session.url, error: null };
  } catch (error) {
    console.error('[Stripe] Error creating portal session:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Failed to create portal session',
    };
  }
}

// ============================================================
// WEBHOOK HANDLING
// ============================================================

/**
 * Verify and construct webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[Stripe] Webhook secret not configured');
    return null;
  }

  const stripe = getStripe();

  try {
    return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('[Stripe] Webhook verification failed:', error);
    return null;
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<boolean> {
  console.log(`[Stripe] Processing webhook: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      return handleSubscriptionUpdate(event.data.object as Stripe.Subscription);

    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(event.data.object as Stripe.Subscription);

    case 'invoice.paid':
      return handleInvoicePaid(event.data.object as Stripe.Invoice);

    case 'invoice.payment_failed':
      return handlePaymentFailed(event.data.object as Stripe.Invoice);

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
      return true;
  }
}

/**
 * Handle checkout.session.completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<boolean> {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as TierName;

  if (!userId || !tier) {
    console.error('[Stripe] Missing metadata in checkout session');
    return false;
  }

  console.log(`[Stripe] Checkout completed for user ${userId}, tier: ${tier}`);

  // The subscription update will be handled by customer.subscription.created
  return true;
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<boolean> {
  const userId = subscription.metadata?.userId;
  const tier = (subscription.metadata?.tier || 'starter') as TierName;

  if (!userId) {
    // Try to find user by customer ID
    const customerId = subscription.customer as string;
    console.log(`[Stripe] No userId in metadata, customer: ${customerId}`);
    // In production, you'd look up the user by stripe_customer_id
    return false;
  }

  const periodStart = new Date((subscription as any).current_period_start * 1000);
  const periodEnd = new Date((subscription as any).current_period_end * 1000);

  const success = await updateSubscription(
    userId,
    tier,
    subscription.customer as string,
    subscription.id,
    periodStart,
    periodEnd
  );

  if (success) {
    console.log(`[Stripe] Subscription updated for user ${userId}`);

    // Qualify any referral for this user
    await qualifyReferral(userId);
  }

  return success;
}

/**
 * Handle subscription deleted (cancelled)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<boolean> {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('[Stripe] No userId in subscription metadata');
    return false;
  }

  const success = await cancelSubscription(userId);

  if (success) {
    console.log(`[Stripe] Subscription cancelled for user ${userId}`);
  }

  return success;
}

/**
 * Handle invoice paid (subscription renewed)
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<boolean> {
  // Reset usage on successful payment
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) {
    return true;
  }

  const stripe = getStripe();

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    if (userId) {
      await resetUsage(userId);
      console.log(`[Stripe] Usage reset for user ${userId} after invoice payment`);
    }
  } catch (error) {
    console.error('[Stripe] Error handling invoice.paid:', error);
  }

  return true;
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<boolean> {
  const customerEmail = invoice.customer_email;

  if (customerEmail) {
    console.log(`[Stripe] Payment failed for ${customerEmail}`);
    // In production: send email notification
  }

  return true;
}

// ============================================================
// PRODUCT/PRICE SETUP HELPERS
// ============================================================

/**
 * List all products (for admin/setup)
 */
export async function listProducts(): Promise<Stripe.Product[]> {
  if (!isStripeConfigured()) {
    return [];
  }

  const stripe = getStripe();

  try {
    const products = await stripe.products.list({ active: true });
    return products.data;
  } catch (error) {
    console.error('[Stripe] Error listing products:', error);
    return [];
  }
}

/**
 * List all prices (for admin/setup)
 */
export async function listPrices(): Promise<Stripe.Price[]> {
  if (!isStripeConfigured()) {
    return [];
  }

  const stripe = getStripe();

  try {
    const prices = await stripe.prices.list({ active: true });
    return prices.data;
  } catch (error) {
    console.error('[Stripe] Error listing prices:', error);
    return [];
  }
}

/**
 * Create subscription products and prices
 * Run this once to set up your Stripe products
 */
export async function setupProducts(): Promise<{
  products: Record<TierName, { productId: string; priceId: string }>;
  error: string | null;
}> {
  if (!isStripeConfigured()) {
    return { products: {} as never, error: 'Stripe not configured' };
  }

  const stripe = getStripe();
  const products: Record<string, { productId: string; priceId: string }> = {};

  try {
    for (const [tierKey, tierConfig] of Object.entries(SUBSCRIPTION_TIERS)) {
      // Create product
      const product = await stripe.products.create({
        name: `Personalized Output - ${tierConfig.name}`,
        description: `${tierConfig.outputs} personalized outputs per month`,
        metadata: {
          tier: tierKey,
          outputs: String(tierConfig.outputs),
        },
      });

      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tierConfig.price * 100, // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          tier: tierKey,
        },
      });

      products[tierKey] = {
        productId: product.id,
        priceId: price.id,
      };

      console.log(`[Stripe] Created ${tierKey}: Product ${product.id}, Price ${price.id}`);
    }

    return { products: products as Record<TierName, { productId: string; priceId: string }>, error: null };
  } catch (error) {
    console.error('[Stripe] Error setting up products:', error);
    return {
      products: {} as never,
      error: error instanceof Error ? error.message : 'Failed to setup products',
    };
  }
}
