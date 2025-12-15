# Archived Etsy Integration Code

**Archived Date:** December 15, 2024

## Why This Code Was Archived

Personalized Output has transitioned from Etsy marketplace sales to direct website sales via Stripe. This code is preserved for reference but is no longer part of the active codebase.

## What's Included

### `/src-etsy/` - Core Etsy Integration
- **api/** - Etsy API client, authentication, bulk publisher
- **cli/** - Command-line tools for Etsy operations
- **config/** - Product templates, themes, and type definitions
- **csv/** - CSV export functionality for ShopUploader
- **generators/** - Listing generator and variation engine
- **images/** - Image pipeline for Etsy listings
- **services/** - Santa and product batch publishers, listing logger

### `/assets-etsy/` - Etsy Assets
- Product PDFs (instruction documents)
- CSV templates
- Santa Voice Message Assets

### `/output-etsy_csv/` - Generated CSV Files
- Pre-generated CSV exports for various products
- Export logs

### `/scripts/` - Etsy-Related Scripts
- `generateEtsyPreview.js` - Preview generator
- `export-shopuploader-csv.js` - CSV export
- `create-shopuploader-xlsx*.js` - ShopUploader spreadsheet generators
- `create-all-listings-xlsx.js` - Bulk listing creator

### Documentation
- `ETSY_CSV_EXPORT.md` - CSV export documentation
- `ETSY_PUBLISHING_CHECKLIST.md` - Publishing workflow checklist
- `SHOPUPLOADER_HANDOFF.md` - ShopUploader integration details

## New Purchase Flow

The website now uses:
1. **Stripe Checkout** (`/api/checkout/create`) for payment processing
2. **Supabase Orders** for order tracking and management
3. **Direct fulfillment** without Etsy order ID validation

## Related Code Still in Active Codebase

Some code references Etsy for historical/migration purposes:
- `src/lib/supabase/orderService.ts` - Has `etsy` as an `OrderSource` type
- `src/lib/supabase/emailListService.ts` - Has `etsy_fulfillment` source
- Database schema includes `etsy_order_id` column for migration tracking

These references are maintained for:
- Backward compatibility with existing orders
- Potential future Etsy re-integration
- Historical data tracking

## Restoration

If you need to restore Etsy functionality:
1. Move `src-etsy/` back to `src/etsy/`
2. Move `assets-etsy/` back to `assets/etsy/`
3. Update TypeScript compilation to include Etsy modules
4. Re-add Etsy environment variables
5. Update server routes to use Etsy services
