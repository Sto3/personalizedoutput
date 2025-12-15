/**
 * Etsy Automation - API Client
 *
 * Implements Etsy Open API v3 for listing management.
 * Handles listing creation, updates, image uploads, and more.
 */

import * as fs from 'fs';
import * as path from 'path';
import { FormData, Blob } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import {
  EtsyCredentials,
  EtsyListingRequest,
  EtsyListingResponse,
  GeneratedListing
} from '../config/types';
import {
  getEtsyCredentials,
  getValidAccessToken,
  ETSY_API_BASE
} from './etsyAuth';

// ============================================================
// TYPES
// ============================================================

interface EtsyApiError {
  error: string;
  error_description?: string;
}

interface EtsyShopInfo {
  shop_id: number;
  shop_name: string;
  user_id: number;
  currency_code: string;
  listing_active_count: number;
  is_vacation: boolean;
}

interface EtsyTaxonomy {
  id: number;
  level: number;
  name: string;
  parent_id: number | null;
  children: EtsyTaxonomy[];
  full_path_taxonomy_ids: number[];
}

interface EtsyShippingProfile {
  shipping_profile_id: number;
  title: string;
  processing_days_display_label: string;
}

interface ListingCreateResponse {
  listing_id: number;
  user_id: number;
  shop_id: number;
  title: string;
  description: string;
  state: 'draft' | 'active' | 'inactive' | 'removed' | 'expired';
  creation_timestamp: number;
  url: string;
  price: { amount: number; divisor: number; currency_code: string };
  tags: string[];
}

interface ImageUploadResponse {
  listing_image_id: number;
  listing_id: number;
  hex_code: string | null;
  red: number | null;
  green: number | null;
  blue: number | null;
  hue: number | null;
  saturation: number | null;
  brightness: number | null;
  is_black_and_white: boolean | null;
  creation_tsz: number;
  rank: number;
  url_75x75: string;
  url_170x135: string;
  url_570xN: string;
  url_fullxfull: string;
}

// ============================================================
// API CLIENT CLASS
// ============================================================

export class EtsyClient {
  private credentials: EtsyCredentials | null = null;
  private rateLimitRemaining: number = 10000;
  private rateLimitReset: number = 0;

  // Digital download taxonomy IDs (common ones)
  static TAXONOMY_IDS = {
    art_collectibles: 1, // Art & Collectibles
    digital_prints: 66, // Art & Collectibles > Prints > Digital Prints
    planners_organizers: 67,
    educational_materials: 200,
    printable_wall_art: 201,
    digital_download: 1001
  };

  constructor(credentials?: EtsyCredentials) {
    if (credentials) {
      this.credentials = credentials;
    }
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Initialize client with stored credentials
   */
  async init(): Promise<void> {
    this.credentials = await getEtsyCredentials();
    console.log(`[EtsyClient] Initialized for shop: ${this.credentials.shopId}`);
  }

  /**
   * Get current credentials (initializes if needed)
   */
  private async getCredentials(): Promise<EtsyCredentials> {
    if (!this.credentials) {
      await this.init();
    }
    return this.credentials!;
  }

  // ============================================================
  // HTTP HELPERS
  // ============================================================

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      formData?: FormData;
    } = {}
  ): Promise<T> {
    const creds = await this.getCredentials();
    const accessToken = await getValidAccessToken();

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${ETSY_API_BASE}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': creds.apiKey
    };

    let body: string | FormData | undefined;

    if (options.formData) {
      // FormData handles its own content-type
      body = options.formData;
    } else if (options.body) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: body as unknown as RequestInit['body']
    });

    // Track rate limits
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    if (remaining) this.rateLimitRemaining = parseInt(remaining);
    if (reset) this.rateLimitReset = parseInt(reset);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText) as EtsyApiError;
        errorMessage = errorJson.error_description || errorJson.error || errorText;
      } catch {
        errorMessage = errorText;
      }

      throw new Error(`Etsy API error (${response.status}): ${errorMessage}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  /**
   * Check rate limit status
   */
  getRateLimitStatus(): { remaining: number; resetAt: Date } {
    return {
      remaining: this.rateLimitRemaining,
      resetAt: new Date(this.rateLimitReset * 1000)
    };
  }

  // ============================================================
  // SHOP INFO
  // ============================================================

  /**
   * Get shop information
   */
  async getShop(): Promise<EtsyShopInfo> {
    const creds = await this.getCredentials();
    return this.request<EtsyShopInfo>(`/application/shops/${creds.shopId}`);
  }

  /**
   * Get shop's shipping profiles
   */
  async getShippingProfiles(): Promise<EtsyShippingProfile[]> {
    const creds = await this.getCredentials();
    const response = await this.request<{ results: EtsyShippingProfile[] }>(
      `/application/shops/${creds.shopId}/shipping-profiles`
    );
    return response.results;
  }

  // ============================================================
  // LISTINGS
  // ============================================================

  /**
   * Create a new listing
   */
  async createListing(listing: EtsyListingRequest): Promise<ListingCreateResponse> {
    const creds = await this.getCredentials();

    const requestBody = {
      title: listing.title,
      description: listing.description,
      price: listing.price,
      quantity: listing.quantity,
      tags: listing.tags,
      taxonomy_id: listing.taxonomyId,
      who_made: listing.whoMade,
      when_made: listing.whenMade,
      is_supply: listing.isSupply,
      type: listing.type,
      shipping_profile_id: listing.shippingProfileId
    };

    return this.request<ListingCreateResponse>(
      `/application/shops/${creds.shopId}/listings`,
      {
        method: 'POST',
        body: requestBody
      }
    );
  }

  /**
   * Create listing from GeneratedListing
   */
  async createListingFromGenerated(
    generated: GeneratedListing,
    options: {
      taxonomyId?: number;
      shippingProfileId?: number;
      state?: 'draft' | 'active';
    } = {}
  ): Promise<ListingCreateResponse> {
    const request: EtsyListingRequest = {
      title: generated.title,
      description: generated.description,
      price: generated.price,
      quantity: 999, // Digital products = unlimited
      tags: generated.tags,
      taxonomyId: options.taxonomyId || EtsyClient.TAXONOMY_IDS.digital_prints,
      whoMade: 'i_did',
      whenMade: '2020_2024',
      isSupply: false,
      type: 'download',
      shippingProfileId: options.shippingProfileId
    };

    return this.createListing(request);
  }

  /**
   * Update an existing listing
   */
  async updateListing(
    listingId: number,
    updates: Partial<EtsyListingRequest>
  ): Promise<ListingCreateResponse> {
    const creds = await this.getCredentials();

    return this.request<ListingCreateResponse>(
      `/application/shops/${creds.shopId}/listings/${listingId}`,
      {
        method: 'PATCH',
        body: updates
      }
    );
  }

  /**
   * Get a listing by ID
   */
  async getListing(listingId: number): Promise<ListingCreateResponse> {
    return this.request<ListingCreateResponse>(
      `/application/listings/${listingId}`
    );
  }

  /**
   * Delete a listing
   */
  async deleteListing(listingId: number): Promise<void> {
    const creds = await this.getCredentials();

    await this.request<void>(
      `/application/shops/${creds.shopId}/listings/${listingId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Get all listings for the shop
   */
  async getListings(options: {
    state?: 'active' | 'draft' | 'inactive' | 'expired';
    limit?: number;
    offset?: number;
  } = {}): Promise<{ results: ListingCreateResponse[]; count: number }> {
    const creds = await this.getCredentials();

    const params = new URLSearchParams();
    if (options.state) params.set('state', options.state);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());

    const query = params.toString() ? `?${params.toString()}` : '';

    return this.request<{ results: ListingCreateResponse[]; count: number }>(
      `/application/shops/${creds.shopId}/listings${query}`
    );
  }

  // ============================================================
  // IMAGES
  // ============================================================

  /**
   * Upload an image to a listing
   */
  async uploadListingImage(
    listingId: number,
    imagePath: string,
    options: {
      rank?: number;
      overwrite?: boolean;
      isWatermarked?: boolean;
    } = {}
  ): Promise<ImageUploadResponse> {
    const creds = await this.getCredentials();

    // Read image file
    const imageFile = await fileFromPath(imagePath);

    // Create form data
    const formData = new FormData();
    formData.set('image', imageFile);

    if (options.rank !== undefined) {
      formData.set('rank', options.rank.toString());
    }
    if (options.overwrite !== undefined) {
      formData.set('overwrite', options.overwrite.toString());
    }
    if (options.isWatermarked !== undefined) {
      formData.set('is_watermarked', options.isWatermarked.toString());
    }

    return this.request<ImageUploadResponse>(
      `/application/shops/${creds.shopId}/listings/${listingId}/images`,
      {
        method: 'POST',
        formData
      }
    );
  }

  /**
   * Upload multiple images to a listing
   */
  async uploadListingImages(
    listingId: number,
    imagePaths: string[]
  ): Promise<ImageUploadResponse[]> {
    const results: ImageUploadResponse[] = [];

    for (let i = 0; i < imagePaths.length; i++) {
      const result = await this.uploadListingImage(listingId, imagePaths[i], {
        rank: i + 1
      });
      results.push(result);

      // Small delay between uploads
      if (i < imagePaths.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  /**
   * Delete an image from a listing
   */
  async deleteListingImage(listingId: number, imageId: number): Promise<void> {
    const creds = await this.getCredentials();

    await this.request<void>(
      `/application/shops/${creds.shopId}/listings/${listingId}/images/${imageId}`,
      { method: 'DELETE' }
    );
  }

  // ============================================================
  // LISTING VIDEO
  // ============================================================

  /**
   * Upload a video to a listing (Etsy supports 1 video per listing)
   * Video requirements: MP4 format, max 100MB, max 1 minute
   */
  async uploadListingVideo(
    listingId: number,
    videoPath: string
  ): Promise<{ video_id: number }> {
    const creds = await this.getCredentials();

    const file = await fileFromPath(videoPath);

    const formData = new FormData();
    formData.set('video', file, path.basename(videoPath));

    return this.request<{ video_id: number }>(
      `/application/shops/${creds.shopId}/listings/${listingId}/videos`,
      {
        method: 'POST',
        formData
      }
    );
  }

  // ============================================================
  // DIGITAL DOWNLOADS
  // ============================================================

  /**
   * Upload a digital file to a listing
   */
  async uploadDigitalFile(
    listingId: number,
    filePath: string,
    filename?: string
  ): Promise<{ file_id: number }> {
    const creds = await this.getCredentials();

    const file = await fileFromPath(filePath);

    const formData = new FormData();
    formData.set('file', file, filename || path.basename(filePath));

    return this.request<{ file_id: number }>(
      `/application/shops/${creds.shopId}/listings/${listingId}/files`,
      {
        method: 'POST',
        formData
      }
    );
  }

  // ============================================================
  // TAXONOMY
  // ============================================================

  /**
   * Get taxonomy tree for digital products
   */
  async getTaxonomies(): Promise<EtsyTaxonomy[]> {
    const response = await this.request<{ results: EtsyTaxonomy[] }>(
      '/application/seller-taxonomy/nodes'
    );
    return response.results;
  }

  /**
   * Search for appropriate taxonomy ID
   */
  async findTaxonomyId(searchTerms: string[]): Promise<number | null> {
    const taxonomies = await this.getTaxonomies();

    function searchInTaxonomy(nodes: EtsyTaxonomy[]): number | null {
      for (const node of nodes) {
        const nameLower = node.name.toLowerCase();
        const matches = searchTerms.some(term =>
          nameLower.includes(term.toLowerCase())
        );

        if (matches) {
          return node.id;
        }

        if (node.children?.length > 0) {
          const childResult = searchInTaxonomy(node.children);
          if (childResult) return childResult;
        }
      }
      return null;
    }

    return searchInTaxonomy(taxonomies);
  }

  // ============================================================
  // ORDERS (for validation)
  // ============================================================

  /**
   * Get receipts (orders) for the shop
   */
  async getReceipts(options: {
    minCreated?: number;
    maxCreated?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    results: Array<{
      receipt_id: number;
      seller_user_id: number;
      buyer_user_id: number;
      buyer_email: string;
      receipt_type: number;
      status: string;
      transactions: Array<{
        transaction_id: number;
        title: string;
        listing_id: number;
        quantity: number;
      }>;
    }>;
    count: number;
  }> {
    const creds = await this.getCredentials();

    const params = new URLSearchParams();
    if (options.minCreated) params.set('min_created', options.minCreated.toString());
    if (options.maxCreated) params.set('max_created', options.maxCreated.toString());
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());

    const query = params.toString() ? `?${params.toString()}` : '';

    return this.request(
      `/application/shops/${creds.shopId}/receipts${query}`
    );
  }

  /**
   * Get a specific receipt by ID
   */
  async getReceipt(receiptId: number): Promise<{
    receipt_id: number;
    seller_user_id: number;
    buyer_user_id: number;
    buyer_email: string;
    status: string;
    transactions: Array<{
      transaction_id: number;
      title: string;
      listing_id: number;
      quantity: number;
    }>;
  }> {
    const creds = await this.getCredentials();

    return this.request(
      `/application/shops/${creds.shopId}/receipts/${receiptId}`
    );
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; shopName?: string; error?: string }> {
    try {
      const shop = await this.getShop();
      return {
        success: true,
        shopName: shop.shop_name
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Wait if rate limited
   */
  async waitIfRateLimited(): Promise<void> {
    if (this.rateLimitRemaining < 10) {
      const waitMs = Math.max(0, (this.rateLimitReset * 1000) - Date.now() + 1000);
      console.log(`[EtsyClient] Rate limit approaching, waiting ${Math.round(waitMs / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let clientInstance: EtsyClient | null = null;

/**
 * Get shared client instance
 */
export function getEtsyClient(): EtsyClient {
  if (!clientInstance) {
    clientInstance = new EtsyClient();
  }
  return clientInstance;
}

// ============================================================
// EXPORTS
// ============================================================

export {
  ListingCreateResponse,
  ImageUploadResponse,
  EtsyShopInfo,
  EtsyShippingProfile,
  EtsyTaxonomy
};
