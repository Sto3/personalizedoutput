# Etsy Batch Publishing Readiness Checklist

*Last Updated: December 11, 2024*

---

## Overall Status: 🟡 MOSTLY READY (Pending API Approval)

---

## 1. API & Authentication

| Item | Status | Notes |
|------|--------|-------|
| Etsy Developer Account | ✅ Ready | API keys in .env |
| API Key | ✅ Configured | ETSY_API_KEY set |
| Client Secret | ✅ Configured | ETSY_CLIENT_SECRET set |
| OAuth Flow (PKCE) | ✅ Built | `src/etsy/api/etsyAuth.ts` |
| API Client | ✅ Built | `src/etsy/api/etsyClient.ts` |
| **API Approval** | ⏳ PENDING | Waiting for Etsy approval |

### After API Approval:
```bash
# Run OAuth flow to get access token
npx ts-node src/etsy/cli/etsyCli.ts auth
```

---

## 2. Listing Content Generation

| Item | Status | Notes |
|------|--------|-------|
| Theme Configs | ✅ Ready | 18+ vision board themes defined |
| Style Variants | ✅ Ready | 5 style variants (minimalist, feminine, bold, earthy, dark academia) |
| Title Templates | ✅ Ready | 8 title templates per product |
| Description Templates | ✅ Ready | Multiple description blocks |
| Tag Pools | ✅ Ready | SEO-optimized tags per theme |
| Uniqueness Engine | ✅ Ready | Hash-based duplicate prevention |
| Listing Generator | ✅ Ready | `src/etsy/generators/listingGenerator.ts` |

### Max Listings Possible:
- **Vision Boards**: 18 themes × 5 styles = **90 unique listings**
- **Planners**: ~30 themes
- **Flash Cards**: ~10 themes
- **Santa Messages**: ~5 themes

---

## 3. Images & Thumbnails

| Item | Status | Notes |
|------|--------|-------|
| Vision Board Samples | ✅ Ready | 6+ boards with V12 fixes (Title Case, 14px subtitle) |
| Hero Images | ✅ Ready | 4 hero images created |
| Planner Images | ✅ Ready | 6 images (hero, benefits, process, sample, reviews) |
| Image Pipeline | ✅ Ready | `src/etsy/images/imagePipeline.ts` |
| Mockup Generator | ✅ Ready | Can create mockups from boards |
| Thumbnail Size | ✅ Correct | 2000x2000px minimum |

### Image Strategy:
- Reuse 5-8 sample thumbnails across 100 listings
- No need for unique thumbnails per listing ($0 additional Ideogram cost)

---

## 4. Shop Configuration (REQUIRED AFTER API APPROVAL)

| Item | Status | Action Needed |
|------|--------|---------------|
| Shop ID | ❌ Needed | Fetch after OAuth |
| Shipping Profile | ❌ Needed | Create "Digital Download" profile in Etsy |
| Return Policy | ❌ Needed | Set up in Etsy shop settings |
| Shop Policies | ❌ Needed | Digital products policy |
| Taxonomy IDs | ❌ Needed | Fetch correct categories from API |

### Setup Steps After API Approval:
1. Run OAuth: `npx ts-node src/etsy/cli/etsyCli.ts auth`
2. Fetch shop info (auto-saves shop ID)
3. Create/get shipping profile for digital downloads
4. Set correct taxonomy for each product type

---

## 5. Batch Publishing System

| Item | Status | Notes |
|------|--------|-------|
| Bulk Publisher | ✅ Built | `src/etsy/api/bulkPublisher.ts` |
| Dry Run Mode | ✅ Available | Test without publishing |
| Draft Mode | ✅ Available | Publish as drafts first |
| Progress Tracking | ✅ Built | Callback-based progress |
| Error Handling | ✅ Built | Retry logic included |
| CSV Export | ✅ Built | `src/etsy/csv/csvExporter.ts` |

### Publishing Commands:
```bash
# Preview listings (dry run)
npx ts-node src/etsy/cli/etsyCli.ts preview vision_board 10

# Publish as drafts (safe test)
npx ts-node src/etsy/cli/etsyCli.ts publish vision_board 50 --mode=draft

# Publish live
npx ts-node src/etsy/cli/etsyCli.ts publish vision_board 50 --mode=active
```

---

## 6. Pre-Launch Checklist

### Before First Publish:
- [ ] Receive Etsy API approval
- [ ] Complete OAuth flow
- [ ] Verify shop ID is saved
- [ ] Create "Digital Download" shipping profile in Etsy
- [ ] Set up return/refund policy for digital goods
- [ ] Test with 1-2 draft listings first
- [ ] Verify images upload correctly
- [ ] Check listing appears correctly in shop

### First Batch (Recommended):
- [ ] Publish 5 vision board listings as DRAFTS
- [ ] Review in Etsy dashboard
- [ ] Activate if they look good
- [ ] Scale up to 20, then 50, then 100

---

## 7. Product-Specific Requirements

### Vision Boards ($14.99)
| Requirement | Status |
|------------|--------|
| Sample boards | ✅ 6+ ready |
| Font rendering (Snell/Bodoni) | ✅ Fixed |
| No people in images | ✅ Enforced |
| Themes defined | ✅ 18 themes |
| Style variants | ✅ 5 variants |

### Guided Clarity Planner ($14.99)
| Requirement | Status |
|------------|--------|
| Hero images | ✅ Ready |
| Benefit images | ✅ Ready |
| Process flow | ✅ Ready |
| Themes defined | ✅ Ready |

### Flash Cards ($9.99)
| Requirement | Status |
|------------|--------|
| Sample images | ⚠️ Review needed |
| Themes defined | ✅ Ready |

### Santa Messages ($19.95)
| Requirement | Status |
|------------|--------|
| Seasonal timing | ⚠️ Time sensitive! |
| Sample images | ⚠️ Review needed |
| Themes defined | ✅ Ready |

---

## 8. Pricing Summary

| Product | Customer Price | Etsy Fees (~12%) | Your Net |
|---------|---------------|------------------|----------|
| Vision Board | $14.99 | ~$1.80 | ~$13.19 |
| Planner | $14.99 | ~$1.80 | ~$13.19 |
| Flash Cards | $9.99 | ~$1.20 | ~$8.79 |
| Santa Message | $19.95 | ~$2.40 | ~$17.55 |

---

## 9. Critical Files Reference

| Purpose | File |
|---------|------|
| Font config | `/CRITICAL_FONTS.md` |
| Asset tracking | `/listing_packets/LISTING_ASSETS_TRACKER.md` |
| A/B titles | `/listing_packets/AB_TEST_TITLES.md` |
| Etsy CLI | `/src/etsy/cli/etsyCli.ts` |
| Theme configs | `/src/etsy/config/themes.ts` |
| Templates | `/src/etsy/config/templates.ts` |
| Auth | `/src/etsy/api/etsyAuth.ts` |
| Publisher | `/src/etsy/api/bulkPublisher.ts` |

---

## 10. Immediate Actions After API Approval

1. **Run OAuth flow** to get access token
2. **Fetch shop info** (automatically saves shop ID)
3. **Create shipping profile** for digital downloads in Etsy dashboard
4. **Test with 1 draft listing** to verify everything works
5. **Batch publish 5-10 drafts** and review
6. **Activate and scale** once confirmed working

---

*This checklist will be updated as items are completed.*
