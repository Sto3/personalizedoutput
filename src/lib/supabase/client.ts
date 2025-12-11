/**
 * Supabase Client Configuration
 *
 * Provides authenticated Supabase clients for:
 * - Server-side operations (service role)
 * - Client-side operations (anon key)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validate configuration
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function isSupabaseServiceConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

// Client for browser/public operations (respects RLS)
let anonClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  if (!anonClient) {
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }

  return anonClient;
}

// Service client for server-side operations (bypasses RLS)
let serviceClient: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient {
  if (!isSupabaseServiceConfigured()) {
    throw new Error('Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY.');
  }

  if (!serviceClient) {
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return serviceClient;
}

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  referral_code: string;
  referred_by?: string;
  subscription_tier: 'free' | 'starter' | 'regular' | 'power';
  subscription_status: 'inactive' | 'active' | 'cancelled' | 'past_due';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  monthly_outputs_used: number;
  monthly_outputs_limit: number;
  current_period_start?: string;
  current_period_end?: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  tier: 'starter' | 'regular' | 'power';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id?: string;
  etsy_order_id?: string;
  product_type: string;
  source: 'etsy' | 'subscription' | 'referral_reward';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input_data?: Record<string, unknown>;
  output_url?: string;
  output_metadata?: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: 'pending' | 'qualified' | 'rewarded';
  referred_subscribed: boolean;
  reward_granted: boolean;
  reward_granted_at?: string;
  created_at: string;
}

export interface EmailListEntry {
  id: string;
  email: string;
  source: 'etsy_fulfillment' | 'website_signup' | 'referral';
  user_id?: string;
  subscribed: boolean;
  interests?: string[];
  created_at: string;
  unsubscribed_at?: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  outputs_used: number;
  outputs_limit: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  author: string;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// TIER CONFIGURATION
// ============================================================

export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    price: 25,
    outputs: 2,
    stripePriceId: process.env.STRIPE_PRICE_STARTER || '',
  },
  regular: {
    name: 'Regular',
    price: 39,
    outputs: 4,
    stripePriceId: process.env.STRIPE_PRICE_REGULAR || '',
  },
  power: {
    name: 'Power User',
    price: 59,
    outputs: 8,
    stripePriceId: process.env.STRIPE_PRICE_POWER || '',
  },
} as const;

export type TierName = keyof typeof SUBSCRIPTION_TIERS;
