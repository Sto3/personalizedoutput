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
  | 'video_learning_session'
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
  category: 'kids' | 'learning' | 'adults' | 'life_planning';
  slug: string;
  stripePriceId?: string;
  isActive: boolean;
  createdAt: Date; // For new product boost calculation
}

// ============================================================
// PRODUCT SUBCATEGORIES
// ============================================================

export interface ProductSubcategory {
  id: string;
  name: string;
  description: string;
  parentProduct: ProductType;
  suggestedTitle?: string;  // For personalized titles like "Jane's 2025 Glow-Up"
}

export const VISION_BOARD_SUBCATEGORIES: ProductSubcategory[] = [
  { id: 'new_year_2025', name: 'New Year 2025 Goals', description: 'Manifest your best year yet', parentProduct: 'vision_board', suggestedTitle: "{name}'s 2025 Vision" },
  { id: 'birthday', name: 'Birthday Vision Board', description: 'Celebrate your new chapter', parentProduct: 'vision_board', suggestedTitle: "{name}'s Birthday Vision" },
  { id: 'relationship', name: 'Relationship Goals', description: 'Visualize your ideal partnership', parentProduct: 'vision_board', suggestedTitle: "{name}'s Love Vision" },
  { id: 'career_levelup', name: 'Career Level-Up', description: 'Climb to the next level professionally', parentProduct: 'vision_board', suggestedTitle: "{name}'s Career Level-Up" },
  { id: 'job_search', name: 'Job Search Vision', description: 'Attract your dream opportunity', parentProduct: 'vision_board', suggestedTitle: "{name}'s Dream Job Vision" },
  { id: 'graduate', name: 'Just Graduated', description: 'Launch into your new beginning', parentProduct: 'vision_board', suggestedTitle: "{name}'s Post-Grad Vision" },
  { id: 'health_wellness', name: 'Health & Wellness', description: 'Your healthiest self awaits', parentProduct: 'vision_board', suggestedTitle: "{name}'s Wellness Vision" },
  { id: 'one_month_reset', name: '1-Month Reset', description: 'Focused transformation in 30 days', parentProduct: 'vision_board', suggestedTitle: "{name}'s 30-Day Reset" },
  { id: 'one_week_motivation', name: '1-Week Motivation', description: 'Quick boost to crush this week', parentProduct: 'vision_board', suggestedTitle: "{name}'s Power Week" },
  { id: 'glow_up', name: 'Glow-Up Board', description: 'Your complete transformation vision', parentProduct: 'vision_board', suggestedTitle: "{name}'s 2025 Glow-Up" },
  { id: 'financial', name: 'Financial Goals', description: 'Build your wealth vision', parentProduct: 'vision_board', suggestedTitle: "{name}'s Money Vision" },
  { id: 'self_love', name: 'Self-Love Board', description: 'Celebrate and nurture yourself', parentProduct: 'vision_board', suggestedTitle: "{name}'s Self-Love Vision" },
  { id: 'general', name: 'General Vision Board', description: 'For any vision or goal not listed above', parentProduct: 'vision_board', suggestedTitle: "{name}'s Vision Board" },
];

export const THOUGHT_ORGANIZER_SUBCATEGORIES: ProductSubcategory[] = [
  { id: 'breakup', name: 'Breakup Processing', description: 'Navigate heartbreak with clarity', parentProduct: 'thought_organizer' },
  { id: 'career_crossroads', name: 'Career Crossroads', description: 'Find direction at a career turning point', parentProduct: 'thought_organizer' },
  { id: 'grief_loss', name: 'Grief & Loss', description: 'Process loss with gentle guidance', parentProduct: 'thought_organizer' },
  { id: 'divorce', name: 'Divorce Recovery', description: 'Rebuild and rediscover yourself', parentProduct: 'thought_organizer' },
  { id: 'empty_nest', name: 'Empty Nest Transition', description: 'Redefine your purpose and identity', parentProduct: 'thought_organizer' },
  { id: 'retirement', name: 'Retirement Planning', description: 'Design your next chapter', parentProduct: 'thought_organizer' },
  { id: 'major_decision', name: 'Major Life Decision', description: 'Get clarity on a big choice', parentProduct: 'thought_organizer' },
  { id: 'new_chapter', name: 'New Chapter', description: 'Embrace a fresh start', parentProduct: 'thought_organizer' },
  { id: 'new_parent', name: 'New Parent Clarity', description: 'Navigate parenthood overwhelm', parentProduct: 'thought_organizer' },
  { id: 'relationship_checkin', name: 'Relationship Check-In', description: 'Evaluate and improve your relationship', parentProduct: 'thought_organizer' },
  { id: 'health_journey', name: 'Health Journey', description: 'Process health challenges with clarity', parentProduct: 'thought_organizer' },
  { id: 'financial_reset', name: 'Financial Reset', description: 'Get clear on money and goals', parentProduct: 'thought_organizer' },
  { id: 'general', name: 'General Clarity Session', description: 'For any life situation not listed above', parentProduct: 'thought_organizer' },
];

export const ALL_SUBCATEGORIES = [...VISION_BOARD_SUBCATEGORIES, ...THOUGHT_ORGANIZER_SUBCATEGORIES];

export function getSubcategoriesForProduct(productType: ProductType): ProductSubcategory[] {
  return ALL_SUBCATEGORIES.filter(sub => sub.parentProduct === productType);
}

// Product catalog - single source of truth
export const PRODUCTS: Record<ProductType, ProductInfo> = {
  santa_message: {
    id: 'santa_message',
    name: 'Personalized Santa',
    description: 'A deeply personal audio experience from Santa Claus',
    price: 1999, // $19.99
    category: 'kids',
    slug: 'santa',
    isActive: true,
    createdAt: new Date('2024-11-01'),
  },
  learning_session: {
    id: 'learning_session',
    name: '30-Minute Audio Lesson',
    description: 'Personalized audio lesson that uses what you love to teach what you need',
    price: 2299, // $22.99
    category: 'learning',
    slug: 'learning-session',
    isActive: true,
    createdAt: new Date('2024-12-01'),
  },
  video_learning_session: {
    id: 'video_learning_session',
    name: '30-Minute Video Lesson',
    description: 'Personalized video lesson with visuals that brings learning to life',
    price: 3299, // $32.99
    category: 'learning',
    slug: 'video-lesson',
    isActive: true,
    createdAt: new Date('2024-12-15'),
  },
  flash_cards: {
    id: 'flash_cards',
    name: 'Custom Flash Cards',
    description: 'Personalized flashcards based on your interests and learning goals',
    price: 1499, // $14.99
    category: 'learning',
    slug: 'flash-cards',
    isActive: true,
    createdAt: new Date('2024-12-01'),
  },
  vision_board: {
    id: 'vision_board',
    name: 'Custom Vision Board',
    description: 'A beautiful, personalized vision board for your goals',
    price: 1499, // $14.99
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
    price: 1999, // $19.99
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

/**
 * Update order status (generic)
 */
export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  if (!isSupabaseServiceConfigured()) return false;

  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) {
    console.error('[OrderService] Error updating order status:', error);
    return false;
  }

  console.log(`[OrderService] Order ${orderId} status updated to: ${status}`);
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
