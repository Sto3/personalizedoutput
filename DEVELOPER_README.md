# EtsyInnovations - Developer Guide

Production pipeline for generating and publishing Etsy digital product listings at scale.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your API keys: IDEOGRAM_API_KEY, ANTHROPIC_API_KEY, etc.

# Start development server
npm run dev
```

---

## CLI Commands

### CSV Export (No Etsy API Required)

Export listings to CSV files for upload via ShopUploader.com:

```bash
# Export 50 vision board listings
npx ts-node src/etsy/cli/etsyCli.ts export vision_board 50 \
  --file=output/etsy_csv/vision_boards_50.csv

# Export 25 Santa message listings
npx ts-node src/etsy/cli/etsyCli.ts export santa_message 25 \
  --file=output/etsy_csv/santa_25.csv

# Export 30 planner listings
npx ts-node src/etsy/cli/etsyCli.ts export planner 30 \
  --file=output/etsy_csv/planners_30.csv

# Export flash cards
npx ts-node src/etsy/cli/etsyCli.ts export flash_cards 40 \
  --file=output/etsy_csv/flashcards_40.csv
```

**Options:**
- `--file=<path>` - Output CSV file path (required)
- `--target=shopuploader` - CSV format target (default: shopuploader)
- `--themes=theme1,theme2` - Filter by specific theme IDs

### View Available Themes

```bash
# List all themes
npm run etsy:themes

# List themes for specific product type
npx ts-node src/etsy/cli/etsyCli.ts themes vision_board
npx ts-node src/etsy/cli/etsyCli.ts themes santa_message
npx ts-node src/etsy/cli/etsyCli.ts themes planner
npx ts-node src/etsy/cli/etsyCli.ts themes flash_cards
```

### View CSV Targets

```bash
npm run etsy:csv-targets
```

---

## Sample Image Generation

### Generate All Samples

```bash
# Dry run (preview only)
npm run generate:samples -- --dry-run

# Generate specific type
npm run generate:samples -- --type=vision_board
npm run generate:samples -- --type=santa_message

# Limit samples per type
npm run generate:samples -- --limit=3
```

### Generate Vision Boards

Vision boards use the Ideogram API (incurs costs):

```bash
# Generate specific theme
npm run generate:samples:vision -- --theme=post_breakup_healing

# Generate with limit
npm run generate:samples:vision -- --limit=5

# Dry run
npm run generate:samples:vision -- --dry-run
```

### Generate Santa Messages

```bash
npm run generate:samples:santa
npm run generate:samples:santa -- --limit=3
```

### Generate Planners

```bash
npm run generate:samples:planner
npm run generate:samples:planner -- --limit=3
```

---

## Workflow: Creating Etsy Listings

### Step 1: Generate Sample Images

```bash
# Generate vision board for a specific theme
npm run generate:samples:vision -- --theme=built_different

# Or generate Santa/planner samples (no API cost)
npm run generate:samples:santa
npm run generate:samples:planner
```

### Step 2: Upload Images to Host

Images must be publicly accessible URLs for ShopUploader.
Recommended: Cloudinary, AWS S3, or Imgur.

### Step 3: Export CSV

```bash
npx ts-node src/etsy/cli/etsyCli.ts export vision_board 50 \
  --file=output/etsy_csv/vision_boards.csv
```

### Step 4: Update Image URLs

Replace `[UPLOAD_TO_HOST]filename.png` placeholders with actual URLs.

### Step 5: Import to ShopUploader

1. Go to https://www.shopuploader.com
2. Upload the CSV file
3. Review listings (created as drafts)
4. Push to Etsy

---

## Project Structure

```
EtsyInnovations/
├── src/
│   ├── etsy/
│   │   ├── cli/etsyCli.ts       # CLI commands
│   │   ├── csv/                 # CSV export logic
│   │   ├── config/
│   │   │   ├── themes.ts        # Theme definitions (100+ themes)
│   │   │   ├── templates.ts     # Listing templates
│   │   │   └── types.ts         # TypeScript types
│   │   └── generators/
│   │       ├── listingGenerator.ts  # Title/description generation
│   │       └── variationEngine.ts   # Variation tracking
│   ├── lib/
│   │   ├── visionBoardEngineV12.js  # Vision board generator
│   │   └── thoughtEngine/           # Chat-mode workbooks
│   └── api/
│       └── ideogramClient.js        # Ideogram API client
├── scripts/
│   ├── generateAllSampleAssets.ts   # Master sample generator
│   ├── generateSampleVisionBoards.ts
│   ├── generateSampleSantaMessages.ts
│   └── generateSamplePlanners.ts
├── output/
│   ├── samples/                     # Generated sample images
│   └── etsy_csv/                    # Exported CSV files
└── docs/
    └── ETSY_CSV_EXPORT.md           # CSV format documentation
```

---

## Product Types

| Type | Themes | Price Range | Personalization |
|------|--------|-------------|-----------------|
| Vision Board | 42 | $4.99 | Title, subtitle, colors |
| Santa Message | 30 | $9.99 | Child name, age, achievements |
| Planner | 25 | $6.99 | Name, goals |
| Flash Cards | 35 | $5.99 | Topic, difficulty |

---

## Theme Categories

### Vision Boards
- Life Transitions (breakup, divorce, career, graduation)
- Personal Growth (self-love, confidence, mindfulness)
- Goals & Dreams (2025 vision, travel, fitness, financial)
- Celebrations (birthday, anniversary)
- Masculine ("Built Different" dark theme)

### Santa Messages
- By Age (toddler, kids, preteen)
- By Situation (first Christmas, new sibling, grieving)
- By Family (twins, grandchild, pet mention)
- By Focus (nice list, kindness, faith-based)

### Planners
- Life Transitions (breakup, career change, retirement)
- Personal Development (goals, decisions, values)
- Situational (new year, birthday, annual review)
- Faith-Based (prayer, spiritual growth)

### Flash Cards
- By Subject (math, reading, science, languages)
- By Grade (preschool through 4th grade)
- By Theme (dinosaur, princess, superhero)
- By Learning Need (struggling reader, math anxiety)

---

## Environment Variables

```env
# Required for vision board generation
IDEOGRAM_API_KEY=your_ideogram_key

# Optional - for AI-enhanced descriptions
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key

# Optional - for direct Etsy API access
ETSY_API_KEY=your_etsy_key
```

---

## CSV Format (ShopUploader)

See [docs/ETSY_CSV_EXPORT.md](docs/ETSY_CSV_EXPORT.md) for full column specification.

Key columns:
- `action`: "create"
- `title`: Max 140 chars
- `description`: Full listing description
- `price`: USD (min $0.20)
- `tag_1` through `tag_13`: Max 20 chars each
- `image_1` through `image_10`: Public URLs
- `listing_state`: "draft" (default) or "published"
- `is_personalizable`: "TRUE" with instructions

---

## Notes

- **Vision boards use API calls** - Each generation costs ~$0.03-0.10 via Ideogram
- **CSV exports to draft** - All listings created as drafts for review
- **Personalization enabled** - All products support buyer customization
- **Unique content** - Variation engine ensures unique titles/descriptions
