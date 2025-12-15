/**
 * Order Service
 *
 * Handles order creation, tracking, and product ordering queries.
 * This is the central service for all order operations - both direct website
 * purchases (Stripe) and legacy Etsy order fulfillment.
 */

import {
  getSupabaseServiceClient,
  isSupabaseServiceConfigured,
  Order,
} from './client';

// ============================================================
// PRODUCT DEFINITIONS
// ============================================================

export type ProductType =
  | 'santa_message'
  | 'vision_board'
  | 'flash_cards'
  | 'learning_session'
  | 'holiday_reset'
  | 'new_year_reset'
  | 'clarity_planner'
  | 'thought_organizer';

export type OrderSource = 'website' | 'etsy' | 'subscription' | 'referral_reward';

export interface ProductInfo {
  id: ProductType;
  name: string;
  description: string;
  price: number; // in cents
  category: 'kids' | 'adults' | 'life_planning';
  slug: string;
  stripePriceId?: string;
  isActive: boolean;
  createdAt: Date; // For new product boost calculation
}

// Product catalog - single source of truth
export const PRODUCTS: Record<ProductType, ProductInfo> = {
  santa_message: {
    id: 'santa_message',
    name: 'Personalized Santa Message',
    description: 'A magical, personalized audio message from Santa Claus',
    price: 1999, // $19.99
    category: 'kids',
    slug: 'santa',
    isActive: true,
    createdAt: new Date('2024-11-01'),
  },
  learning_session: {
    id: 'learning_session',
    name: '30-Minute Learning Session',
    description: 'Personalized lesson that uses what you love to teach what you need',
    price: 2999, // $29.99
    category: 'kids', // Also available for adults
    slug: 'learning-session',
    isActive: true,
    createdAt: new Date('2024-12-01'),
  },
  flash_cards: {
    id: 'flash_cards',
    name: 'Custom Flash Cards',
    description: 'Personalized flashcards based on your interests and learning goals',
    price: 1499, // $14.99
    category: 'kids',
    slug: 'flash-cards',
    isActive: true,
    createdAt: new Date('2024-12-01'),
  },
  vision_board: {
    id: 'vision_board',
    name: 'Custom Vision Board',
    description: 'A beautiful, personalized vision board for your goals',
    price: 2499, // $24.99
    category: 'adults',
    slug: 'vision-board',
    isActive: true,
    createdAt: new Date('2024-11-15'),
  },
  holiday_reset: {
    id: 'holiday_reset',
    name: 'Holiday Reset Planner',
    description: 'Prepare for the new year with a personalized reflection guide',
    price: 1999, // $19.99
    category: 'life_planning',
    slug: 'holiday-reset',
    isActive: true,
    createdAt: new Date('2024-12-01'),
  },
  new_year_reset: {
    id: 'new_year_reset',
    name: 'New Year Reset Planner',
    description: 'Start the year with clarity and intention',
    price: 1999, // $19.99
    category: 'life_planning',
    slug: 'new-year-reset',
    isActive: true,
    createdAt: new Date('2024-12-01'),
  },
  clarity_planner: {
    id: 'clarity_planner',
    name: 'Clarity Planner',
    description: 'A personalized planning system for achieving your goals',
    price: 3499, // $34.99
    category: 'life_planning',
    slug: 'clarity-planner',
    isActive: true,
    createdAt: new Date('2024-12-01'),
  },
  thought_organizer: {
    id: 'thought_organizer',
    name: 'Thought Organizer™',
    description: 'Transform your ideas into actionable insights',
    price: 3999, // $39.99
    category: 'life_planning',
    slug: 'thought-organizer',
    isActive: true,
    createdAt: new Date('2024-12-01'),
  },
};

// ============================================================
// ORDER CREATION
// ============================================================

export interface CreateOrderParams {
  userId?: string;
  productType: ProductType;
  source: OrderSource;
  inputData?: Record<string, unknown>;
  etsyOrderId?: string;
  stripePaymentIntentId?: string;
  email?: string;
}

/**
 * Create a new order
 */
export async function createOrder(params: CreateOrderParams): Promise<{ order: Order | null; error: string | null }> {
  if (!isSupabaseServiceConfigured()) {
    return { order: null, error: 'Supabase not configured' };
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: params.userId,
      product_type: params.productType,
      source: params.source,
      status: 'pending',
      input_data: params.inputData,
      etsy_order_id: params.etsyOrderId,
      output_metadata: {
        stripe_payment_intent_id: params.stripePaymentIntentId,
        email: params.email,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('[OrderService] Error creating order:', error);
    return { order: null, error: error.message };
  }

  console.log(`[OrderService] Order created: ${data.id} for ${params.productType}`);
  return { order: data as Order, error: null };
}

/**
 * Update order status to processing
 */
export async function markOrderProcessing(orderId: string): Promise<boolean> {
  if (!isSupabaseServiceConfigured()) return false;

  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from('orders')
    .update({ status: 'processing' })
    .eq('id', orderId);

  if (error) {
    console.error('[OrderService] Error marking order processing:', error);
    return false;
  }

  return true;
}

/**
 * Complete an order with output information
 */
export async function completeOrder(
  orderId: string,
  outputUrl: string,
  outputMetadata?: Record<string, unknown>
): Promise<boolean> {
  if (!isSupabaseServiceConfigured()) return false;

  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'completed',
      output_url: outputUrl,
      output_metadata: outputMetadata,
      completed_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('[OrderService] Error completing order:', error);
    return false;
  }

  console.log(`[OrderService] Order completed: ${orderId}`);
  return true;
}

/**
 * Mark order as failed
 */
export async function failOrder(orderId: string, reason: string): Promise<boolean> {
  if (!isSupabaseServiceConfigured()) return false;

  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'failed',
      output_metadata: { error: reason },
    })
    .eq('id', orderId);

  if (error) {
    console.error('[OrderService] Error failing order:', error);
    return false;
  }

  return true;
}

// ============================================================
// ORDER RETRIEVAL
// ============================================================

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<Order | null> {
  if (!isSupabaseServiceConfigured()) return null;

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('[OrderService] Error fetching order:', error);
    return null;
  }

  return data as Order;
}

/**
 * Get order by Etsy order ID
 */
export async function getOrderByEtsyId(etsyOrderId: string): Promise<Order | null> {
  if (!isSupabaseServiceConfigured()) return null;

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('etsy_order_id', etsyOrderId)
    .single();

  if (error) {
    return null; // Not found is expected
  }

  return data as Order;
}

/**
 * Check if Etsy order has been used
 */
export async function hasEtsyOrderBeenUsed(etsyOrderId: string): Promise<boolean> {
  const order = await getOrderByEtsyId(etsyOrderId);
  return order !== null && order.status === 'completed';
}

/**
 * Get orders for a user
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
  if (!isSupabaseServiceConfigured()) return [];

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[OrderService] Error fetching user orders:', error);
    return [];
  }

  return data as Order[];
}

// ============================================================
// DYNAMIC PRODUCT ORDERING (Sales-Weighted)
// ============================================================

export interface ProductWithScore extends ProductInfo {
  salesScore: number;
  recentSales: number;
}

/**
 * Get products ordered by weighted recent sales
 *
 * Weighting formula:
 * - Last 7 days: 2x weight
 * - Days 8-30: 1x weight
 * - New products (<14 days): Get median baseline score
 */
export async function getProductsOrderedBySales(): Promise<ProductWithScore[]> {
  if (!isSupabaseServiceConfigured()) {
    // Fallback: return products in default order
    return Object.values(PRODUCTS)
      .filter(p => p.isActive)
      .map(p => ({ ...p, salesScore: 0, recentSales: 0 }));
  }

  const supabase = getSupabaseServiceClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Get sales counts for last 7 days
  const { data: last7Days } = await supabase
    .from('orders')
    .select('product_type')
    .eq('status', 'completed')
    .gte('completed_at', sevenDaysAgo.toISOString());

  // Get sales counts for days 8-30
  const { data: days8to30 } = await supabase
    .from('orders')
    .select('product_type')
    .eq('status', 'completed')
    .gte('completed_at', thirtyDaysAgo.toISOString())
    .lt('completed_at', sevenDaysAgo.toISOString());

  // Calculate scores per product
  const scores: Record<string, { last7: number; days8to30: number }> = {};

  // Initialize all products
  Object.keys(PRODUCTS).forEach(productType => {
    scores[productType] = { last7: 0, days8to30: 0 };
  });

  // Count last 7 days
  (last7Days || []).forEach(order => {
    if (scores[order.product_type]) {
      scores[order.product_type].last7++;
    }
  });

  // Count days 8-30
  (days8to30 || []).forEach(order => {
    if (scores[order.product_type]) {
      scores[order.product_type].days8to30++;
    }
  });

  // Calculate weighted scores
  const productsWithScores: ProductWithScore[] = Object.values(PRODUCTS)
    .filter(p => p.isActive)
    .map(product => {
      const productScores = scores[product.id] || { last7: 0, days8to30: 0 };
      let salesScore = (productScores.last7 * 2) + productScores.days8to30;

      // New product boost: if created within last 14 days, give baseline score
      if (product.createdAt > fourteenDaysAgo) {
        // Calculate median score of other products
        const otherScores = Object.entries(scores)
          .filter(([key]) => key !== product.id)
          .map(([_, s]) => (s.last7 * 2) + s.days8to30)
          .sort((a, b) => a - b);

        const medianScore = otherScores.length > 0
          ? otherScores[Math.floor(otherScores.length / 2)]
          : 10; // Default boost if no other sales

        // Use max of actual score or median (ensures new products get visibility)
        salesScore = Math.max(salesScore, medianScore);
      }

      return {
        ...product,
        salesScore,
        recentSales: productScores.last7 + productScores.days8to30,
      };
    });

  // Sort by sales score (descending)
  productsWithScores.sort((a, b) => b.salesScore - a.salesScore);

  return productsWithScores;
}

/**
 * Get products by category, ordered by sales
 */
export async function getProductsByCategory(category: 'kids' | 'adults' | 'life_planning'): Promise<ProductWithScore[]> {
  const allProducts = await getProductsOrderedBySales();
  return allProducts.filter(p => p.category === category);
}

// ============================================================
// STATISTICS
// ============================================================

export interface OrderStats {
  totalOrders: number;
  completedOrders: number;
  ordersByProduct: Record<string, number>;
  revenueByProduct: Record<string, number>;
  last7DaysOrders: number;
  last30DaysOrders: number;
}

/**
 * Get order statistics
 */
export async function getOrderStats(): Promise<OrderStats> {
  const defaultStats: OrderStats = {
    totalOrders: 0,
    completedOrders: 0,
    ordersByProduct: {},
    revenueByProduct: {},
    last7DaysOrders: 0,
    last30DaysOrders: 0,
  };

  if (!isSupabaseServiceConfigured()) return defaultStats;

  const supabase = getSupabaseServiceClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all completed orders
  const { data: orders } = await supabase
    .from('orders')
    .select('product_type, status, completed_at')
    .eq('status', 'completed');

  if (!orders) return defaultStats;

  const stats: OrderStats = {
    totalOrders: orders.length,
    completedOrders: orders.length,
    ordersByProduct: {},
    revenueByProduct: {},
    last7DaysOrders: 0,
    last30DaysOrders: 0,
  };

  orders.forEach(order => {
    // Count by product
    stats.ordersByProduct[order.product_type] = (stats.ordersByProduct[order.product_type] || 0) + 1;

    // Calculate revenue
    const product = PRODUCTS[order.product_type as ProductType];
    if (product) {
      stats.revenueByProduct[order.product_type] =
        (stats.revenueByProduct[order.product_type] || 0) + product.price;
    }

    // Count recent orders
    if (order.completed_at) {
      const completedAt = new Date(order.completed_at);
      if (completedAt >= sevenDaysAgo) {
        stats.last7DaysOrders++;
      }
      if (completedAt >= thirtyDaysAgo) {
        stats.last30DaysOrders++;
      }
    }
  });

  return stats;
}

// ============================================================
// MIGRATION HELPER
// ============================================================

/**
 * Record a legacy Etsy order completion in Supabase
 * Call this when an Etsy order is fulfilled to sync data
 */
export async function recordEtsyOrderCompletion(
  etsyOrderId: string,
  productType: ProductType,
  email: string,
  outputUrl: string,
  inputData?: Record<string, unknown>
): Promise<boolean> {
  // Check if already recorded
  const existing = await getOrderByEtsyId(etsyOrderId);
  if (existing) {
    console.log(`[OrderService] Etsy order ${etsyOrderId} already recorded`);
    return true;
  }

  const { order, error } = await createOrder({
    productType,
    source: 'etsy',
    etsyOrderId,
    email,
    inputData,
  });

  if (error || !order) {
    console.error(`[OrderService] Failed to record Etsy order: ${error}`);
    return false;
  }

  // Mark as completed immediately (it's already fulfilled)
  await completeOrder(order.id, outputUrl, {
    source: 'etsy_migration',
    email,
    completed_externally: true,
  });

  console.log(`[OrderService] Etsy order recorded: ${etsyOrderId} → ${order.id}`);
  return true;
}
