# ShopUploader Handoff for Next Claude Session

## Context for New Session

The user needs to bulk upload 75+ Etsy listings for Vision Boards and Planners. The Etsy API approval is pending indefinitely, so we're using **ShopUploader** (shopuploader.com) as an alternative.

---

## Previous Experience with ShopUploader

We've already done significant work on ShopUploader integration:

### What We Built:
1. **XLSX Generator Scripts**: `scripts/create-shopuploader-xlsx-v7.js` - Creates Excel files matching ShopUploader's 50-column format
2. **CSV Export System**: `src/etsy/csv/csvExporter.ts` - Full CSV export with all Etsy fields
3. **Documentation**: `docs/ETSY_CSV_EXPORT.md` - Complete column specification

### Column Format (50 columns):
```
listing_id, parent_sku, sku, title, description, price, quantity, category,
image_1 through image_10, shipping_profile_id, readiness_state_id, return_policy_id,
type, who_made, is_made_to_order, year_made, is_vintage, is_supply, is_taxable,
auto_renew, is_customizable, is_personalizable, personalization_is_required,
personalization_instructions, personalization_char_count_max,
tag_1 through tag_13, action, listing_state, overwrite_images
```

### Key Settings for Digital Products:
- `type`: `download` or `digital`
- `who_made`: `i_did`
- `is_supply`: `false`
- `is_personalizable`: `true`
- `listing_state`: `draft` (to review before publishing)
- `action`: `create`

---

## Image Hosting Requirement

**CRITICAL**: ShopUploader requires **publicly accessible image URLs** (not local file paths).

### Current Image URLs (hosted on Render):
```
Base: https://personalizedoutput.com/listing-images/
Vision Boards: https://personalizedoutput.com/listing-images/vision-board/
Planners: https://personalizedoutput.com/listing-images/planner/
```

### If Images Need Hosting:
Options: Cloudinary (free tier), AWS S3, Google Cloud Storage, or Imgur
The images are already on the server at `/Users/matthewriley/EtsyInnovations/listing_packets/*/images/`

---

## What the User Wants

### 75 Vision Board Listings covering:
- Life transitions (breakup, divorce, new job, moving)
- Time-based resets (1 week, 1 month, birthday, new year, holiday)
- Emotional themes (healing, self-love, confidence, anxiety relief)
- Goal themes (fitness, career, financial, relationship)
- Seasonal (Christmas, Valentine's, Mother's Day, summer)

### 75 Planner Listings covering:
- Processing themes (post-relationship, grief, career transition)
- Life moments (wedding planning, new parent, college)
- Mental health (anxiety management, depression recovery, ADHD)
- Personal growth (habit building, morning routine, evening reflection)

### Price: $14.99 for both products

---

## Files to Reference

1. **CSV Export Documentation**: `/docs/ETSY_CSV_EXPORT.md`
2. **XLSX Generator**: `/scripts/create-shopuploader-xlsx-v7.js`
3. **Theme Configs**: `/src/etsy/config/themes.ts` (18 existing themes)
4. **Templates**: `/src/etsy/config/templates.ts` (title/description templates)
5. **Listing Assets Tracker**: `/listing_packets/LISTING_ASSETS_TRACKER.md`

---

## Task for New Session

1. **Generate 75 unique Vision Board listings** with:
   - Compelling, emotionally resonant titles (140 char max)
   - Detailed descriptions emphasizing transformation
   - 13 SEO-optimized tags per listing (20 char max each)
   - Proper image URLs
   - All ShopUploader required fields

2. **Generate 75 unique Planner listings** with same requirements

3. **Export to ShopUploader-compatible XLSX or CSV**

4. **User will upload to ShopUploader.com** and publish as drafts first

---

## Brand Ethos (CRITICAL - Capture This)

These products are about **TRANSFORMATION**, not just decoration:
- Vision boards help people **manifest their next chapter**
- Planners help people **process and find clarity**
- Target audience: People at **inflection points** in life
- Tone: Empowering, hopeful, supportive, NOT generic or salesy
- Quality: Premium feel, thoughtful, personalized

### Examples of POWERFUL titles:
- "Post-Breakup Healing Vision Board | Your Fresh Start | Manifestation Kit"
- "1-Week Reset Vision Board | Clarity & Focus | Transform Your Week"
- "Career Change Clarity Planner | Find Your Path | AI-Guided Reflection"
- "Processing Grief Planner | Gentle Guidance | Personalized Support"

---

## Technical Notes

- Tags must be ≤20 characters each
- Titles must be ≤140 characters
- Descriptions can be up to 102,400 characters
- Images must be publicly accessible URLs
- Use `listing_state: draft` for safety
- ShopUploader recommends batches of 100 max
