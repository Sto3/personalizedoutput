# Etsy Listing Assets Tracker

*Last Updated: December 11, 2024*

---

## Products Overview

| Product | Price | Listings Planned | Thumbnails Needed |
|---------|-------|------------------|-------------------|
| Vision Boards | $14.99 | ~50 themes | 5-8 samples (reuse) |
| Guided Clarity Planner | $14.99 | ~30 variations | 5-6 samples (reuse) |
| Flash Cards | $9.99 | ~10 themes | 3-4 samples |
| Santa Messages | $19.95 | 1 listing | 5 images |

---

## VISION BOARDS ($14.99)

### Production System Status: ✅ READY
- **Engine**: visionBoardEngineV12.js
- **Fonts**: Snell Roundhand (Title Case) for feminine, Bodoni 72 Smallcaps (UPPERCASE) for masculine
- **Subtitle**: 14px (increased from 11px)
- **Photos**: 12 per board via Ideogram ($0.30/board)
- **No People Rule**: Enforced via negative prompts

### Sample Boards Generated (with V12 fixes):

| Board | Theme Type | Font | Status | File |
|-------|-----------|------|--------|------|
| My Healing Journey | Feminine/Healing | Snell Roundhand | ✅ Ready | visionboard-v12-1765429077540.png |
| Career Goals | Masculine/Goals | Bodoni 72 Smallcaps | ✅ Ready | visionboard-v12-1765429224786.png |
| 2025 Vision | Neutral/New Year | Bodoni 72 Smallcaps | ✅ Ready | visionboard-v12-1765429371235.png |
| Self Love | Feminine/Healing | Snell Roundhand | ✅ Ready | visionboard-v12-1765429547923.png |
| Our Love Story | Romantic | Snell Roundhand | ✅ Ready | (earlier session) |
| Christmas For Her | Feminine/Holiday | Snell Roundhand | ✅ Ready | (earlier session) |

### Hero Images:
| File | Description | Status |
|------|-------------|--------|
| 01_hero_photo_dual.png | Two boards side-by-side | ✅ Ready |
| 02_hero_christmas_gift.png | Christmas gift themed | ✅ Ready |
| 03_hero_goals.png | Goals/Career focused | ✅ Ready |
| 04_hero_relationship.png | Love/Relationship | ✅ Ready |

### Listing Strategy:
- **50+ listings** covering different themes (healing, goals, Christmas, relationships, etc.)
- **Reuse 5-8 sample boards** across all listings
- Customers understand these show the STYLE, not exact output
- No need to generate unique thumbnails per listing

---

## GUIDED CLARITY PLANNER ($14.99)

### Current Images Status:

| File | Purpose | Status | Notes |
|------|---------|--------|-------|
| 01_hero.png | Main hero (journal spread) | ✅ Good | Clean, shows product |
| 01_hero_themed.png | Enhanced hero (before/after) | ✅ Excellent | Shows transformation, includes price |
| 02_benefit.png | What it helps with | ✅ Good | 4 clear benefits |
| 03_process.png | How it works | ✅ Good | 3-step process clear |
| 04_sample.png | Example pages | ✅ Good | Shows 3 page types |
| 05_reviews.png | Social proof | ✅ Good | Emotional testimonials |

### Assessment:
The planner images are **already well-optimized**:
- Consistent brand colors (teal, coral, gold, soft pink)
- Clear value proposition
- Professional typography
- Good information hierarchy

### Minor Optimization Opportunities:
1. Could add a "Perfect Gift" variation for holiday season
2. Could create theme-specific heroes (grief, career change, breakup)

---

## FLASH CARDS ($9.99)

### Location: `/listing_packets/flash_cards/`
### Status: Needs review

---

## SANTA MESSAGES ($19.95)

### Location: `/listing_packets/santa_message_001/`
### Status: Active product for holiday season

---

## HOLIDAY/NEW YEAR RESET

### Locations:
- `/listing_packets/holiday_reset_001/`
- `/listing_packets/new_year_001/`

---

## Cost Tracking

### Ideogram API Costs:
- **Per Image**: $0.025
- **Per Vision Board**: $0.30 (12 images)
- **Today's Spend**: ~$10.55 (~35 boards generated)

### Cost Optimization:
- Reuse sample boards across listings (saves $$$)
- Only generate new boards for truly unique themes
- For 100 listings: Only need ~8-10 unique boards = ~$3.00

---

## Font Configuration (CRITICAL - DO NOT CHANGE)

See: `/CRITICAL_FONTS.md`

### Summary:
| Theme Type | Font | Transform |
|------------|------|-----------|
| Feminine (healing, love, soft) | Snell Roundhand | Title Case |
| Masculine (goals, career, dark) | Bodoni 72 Smallcaps | UPPERCASE |

### Photo Rules:
- NO PEOPLE in any generated images
- Use object-only descriptions
- Negative prompt always includes: "people, person, human, face, hands, body, silhouette"

---

## A/B Test Titles

See: `/listing_packets/AB_TEST_TITLES.md`

5 variations per product for testing.
