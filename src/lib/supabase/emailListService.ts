/**
 * Email List Service
 *
 * Handles email list management for marketing and communications.
 * Integrates with Etsy fulfillment flow for optional opt-ins.
 */

import {
  getSupabaseServiceClient,
  isSupabaseServiceConfigured,
  EmailListEntry,
} from './client';

// ============================================================
// EMAIL LIST MANAGEMENT
// ============================================================

/**
 * Add an email to the marketing list
 */
export async function addToEmailList(
  email: string,
  source: 'etsy_fulfillment' | 'website_signup' | 'referral',
  interests?: string[],
  userId?: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseServiceConfigured()) {
    // Fallback to file-based storage if Supabase not configured
    return addToEmailListFile(email, source, interests);
  }

  const supabase = getSupabaseServiceClient();

  try {
    // Check if email already exists
    const { data: existing } = await supabase
      .from('email_list')
      .select('id, subscribed')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      // Update existing entry if previously unsubscribed
      if (!existing.subscribed) {
        await supabase
          .from('email_list')
          .update({
            subscribed: true,
            interests: interests || [],
            unsubscribed_at: null,
          })
          .eq('id', existing.id);
      }
      return { success: true, error: null };
    }

    // Insert new entry
    const { error } = await supabase.from('email_list').insert({
      email: email.toLowerCase(),
      source,
      user_id: userId,
      interests: interests || [],
    });

    if (error) {
      console.error('[EmailList] Error adding email:', error);
      return { success: false, error: error.message };
    }

    console.log(`[EmailList] Added ${email} from ${source}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('[EmailList] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unsubscribe an email
 */
export async function unsubscribeEmail(
  email: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseServiceConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const supabase = getSupabaseServiceClient();

  try {
    const { error } = await supabase
      .from('email_list')
      .update({
        subscribed: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('email', email.toLowerCase());

    if (error) {
      return { success: false, error: error.message };
    }

    console.log(`[EmailList] Unsubscribed ${email}`);
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all subscribed emails (for exporting or sending campaigns)
 */
export async function getSubscribedEmails(
  interests?: string[]
): Promise<EmailListEntry[]> {
  if (!isSupabaseServiceConfigured()) {
    return [];
  }

  const supabase = getSupabaseServiceClient();

  try {
    let query = supabase
      .from('email_list')
      .select('*')
      .eq('subscribed', true);

    if (interests && interests.length > 0) {
      // Filter by interests (contains any)
      query = query.overlaps('interests', interests);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[EmailList] Error fetching emails:', error);
      return [];
    }

    return data as EmailListEntry[];
  } catch (error) {
    console.error('[EmailList] Error:', error);
    return [];
  }
}

/**
 * Get email list stats
 */
export async function getEmailListStats(): Promise<{
  total: number;
  subscribed: number;
  bySource: Record<string, number>;
  byInterest: Record<string, number>;
}> {
  if (!isSupabaseServiceConfigured()) {
    return { total: 0, subscribed: 0, bySource: {}, byInterest: {} };
  }

  const supabase = getSupabaseServiceClient();

  try {
    // Get total count
    const { count: total } = await supabase
      .from('email_list')
      .select('*', { count: 'exact', head: true });

    // Get subscribed count
    const { count: subscribed } = await supabase
      .from('email_list')
      .select('*', { count: 'exact', head: true })
      .eq('subscribed', true);

    // Get all entries for detailed stats
    const { data } = await supabase
      .from('email_list')
      .select('source, interests')
      .eq('subscribed', true);

    const bySource: Record<string, number> = {};
    const byInterest: Record<string, number> = {};

    if (data) {
      for (const entry of data) {
        // Count by source
        bySource[entry.source] = (bySource[entry.source] || 0) + 1;

        // Count by interest
        if (entry.interests) {
          for (const interest of entry.interests) {
            byInterest[interest] = (byInterest[interest] || 0) + 1;
          }
        }
      }
    }

    return {
      total: total || 0,
      subscribed: subscribed || 0,
      bySource,
      byInterest,
    };
  } catch (error) {
    console.error('[EmailList] Error getting stats:', error);
    return { total: 0, subscribed: 0, bySource: {}, byInterest: {} };
  }
}

// ============================================================
// FILE-BASED FALLBACK (when Supabase not configured)
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

const EMAIL_LIST_FILE = path.join(process.cwd(), 'data', 'email_list.json');

interface FileEmailEntry {
  email: string;
  source: string;
  interests: string[];
  subscribed: boolean;
  createdAt: string;
}

function loadEmailListFile(): FileEmailEntry[] {
  try {
    if (fs.existsSync(EMAIL_LIST_FILE)) {
      return JSON.parse(fs.readFileSync(EMAIL_LIST_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('[EmailList] Error loading file:', error);
  }
  return [];
}

function saveEmailListFile(entries: FileEmailEntry[]): void {
  try {
    const dir = path.dirname(EMAIL_LIST_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(EMAIL_LIST_FILE, JSON.stringify(entries, null, 2));
  } catch (error) {
    console.error('[EmailList] Error saving file:', error);
  }
}

async function addToEmailListFile(
  email: string,
  source: string,
  interests?: string[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    const entries = loadEmailListFile();
    const normalizedEmail = email.toLowerCase();

    // Check if already exists
    const existing = entries.find((e) => e.email === normalizedEmail);
    if (existing) {
      if (!existing.subscribed) {
        existing.subscribed = true;
      }
    } else {
      entries.push({
        email: normalizedEmail,
        source,
        interests: interests || [],
        subscribed: true,
        createdAt: new Date().toISOString(),
      });
    }

    saveEmailListFile(entries);
    console.log(`[EmailList] Added ${email} to file-based list`);
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================
// ETSY FULFILLMENT INTEGRATION
// ============================================================

/**
 * Add email opt-in during Etsy order fulfillment
 * This is called when a customer opts in to receive updates
 */
export async function addEtsyCustomerOptIn(
  email: string,
  productType: string,
  orderId?: string
): Promise<boolean> {
  const interests = [productType];

  // Map product types to interest categories
  if (productType.includes('santa')) {
    interests.push('holiday', 'kids');
  } else if (productType.includes('vision')) {
    interests.push('goals', 'planning');
  } else if (productType.includes('holiday') || productType.includes('new_year')) {
    interests.push('holiday', 'planning');
  } else if (productType.includes('clarity')) {
    interests.push('planning', 'self_improvement');
  } else if (productType.includes('flash')) {
    interests.push('kids', 'education');
  }

  const result = await addToEmailList(email, 'etsy_fulfillment', interests);
  return result.success;
}
