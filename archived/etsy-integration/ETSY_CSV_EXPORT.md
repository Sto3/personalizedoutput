# Etsy CSV Export - ShopUploader Format

## Chosen Tool: ShopUploader

**Website**: https://www.shopuploader.com
**Documentation**: https://www.shopuploader.com/docs/templates

### Why ShopUploader?

After evaluating CSVLister, ShopUploader, and Nembol, **ShopUploader** was selected because:

1. **Best Documentation**: Clear, comprehensive CSV column specifications
2. **Full Etsy Feature Support**: All 13 tags, 10 images, digital files, personalization
3. **Draft Mode**: Can create listings as drafts for review before publishing
4. **Reliable Format**: Well-tested CSV import that handles Etsy's requirements

---

## CSV Column Specification

### Required Columns

| Column | Max Length | Description |
|--------|------------|-------------|
| `action` | - | Always `create` for new listings |
| `title` | 140 chars | Listing title |
| `description` | 102,400 chars | Full description with line breaks |
| `price` | - | USD price (minimum $0.20) |
| `quantity` | - | Stock quantity |
| `category` | - | Etsy category path |

### Tags (13 Maximum)

| Column | Max Length |
|--------|------------|
| `tag_1` | 20 chars |
| `tag_2` | 20 chars |
| `tag_3` | 20 chars |
| `tag_4` | 20 chars |
| `tag_5` | 20 chars |
| `tag_6` | 20 chars |
| `tag_7` | 20 chars |
| `tag_8` | 20 chars |
| `tag_9` | 20 chars |
| `tag_10` | 20 chars |
| `tag_11` | 20 chars |
| `tag_12` | 20 chars |
| `tag_13` | 20 chars |

### Images (10 Maximum)

| Column | Requirements |
|--------|--------------|
| `image_1` | URL, min 50x50px, JPEG/PNG/GIF |
| `image_2` | URL, min 50x50px |
| `image_3` | URL, min 50x50px |
| `image_4` | URL, min 50x50px |
| `image_5` | URL, min 50x50px |
| `image_6` | URL, min 50x50px |
| `image_7` | URL, min 50x50px |
| `image_8` | URL, min 50x50px |
| `image_9` | URL, min 50x50px |
| `image_10` | URL, min 50x50px |

### Digital Product Fields

| Column | Value |
|--------|-------|
| `type` | `digital` for instant downloads |
| `digital_file_1` | URL to downloadable file |
| `digital_file_2` | URL to additional file |
| `digital_file_3` | URL to additional file |
| `digital_file_4` | URL to additional file |
| `digital_file_5` | URL to additional file |

### Required Metadata

| Column | Value |
|--------|-------|
| `who_made` | `i_did` (made by shop owner) |
| `is_supply` | `false` (finished product) |
| `when_made` | `2020_2025` or specific year |

### Personalization Fields

| Column | Description |
|--------|-------------|
| `is_personalizable` | `true` or `false` |
| `personalization_instructions` | Instructions shown to buyer |
| `personalization_char_count_max` | Max characters (e.g., 500) |
| `personalization_is_required` | `true` or `false` |

### Listing State

| Column | Value |
|--------|-------|
| `listing_state` | `draft` (review first) or `published` |

---

## Our CSV Structure

For EtsyInnovations products, we use this column order:

```csv
action,title,description,price,quantity,category,tag_1,tag_2,tag_3,tag_4,tag_5,tag_6,tag_7,tag_8,tag_9,tag_10,tag_11,tag_12,tag_13,image_1,image_2,image_3,image_4,image_5,image_6,image_7,image_8,image_9,image_10,type,digital_file_1,who_made,is_supply,when_made,is_personalizable,personalization_instructions,personalization_char_count_max,personalization_is_required,listing_state
```

---

## Product-Specific Settings

### Vision Boards

```
category: Craft Supplies & Tools > Visual Arts > Drawing & Illustration > Reference Materials
type: digital
price: $5.99 - $12.99
is_personalizable: true
personalization_instructions: Please provide: 1) Your name or title for the board, 2) Any specific words or phrases for the subtitle
personalization_char_count_max: 500
```

### Santa Messages

```
category: Paper & Party Supplies > Party Supplies > Party Decor > Personalized Party Decor
type: digital
price: $9.99 - $14.99
is_personalizable: true
personalization_instructions: Please provide your child's name, age, and 2-3 good things they did this year
personalization_char_count_max: 1000
```

### Planners

```
category: Paper & Party Supplies > Paper > Calendars & Planners > Planners & Organizers
type: digital
price: $3.99 - $7.99
is_personalizable: false
```

### Flash Cards

```
category: Toys & Games > Toys > Learning & School > Flash Cards
type: digital
price: $4.99 - $8.99
is_personalizable: true
personalization_instructions: What topic would you like the flash cards to cover?
personalization_char_count_max: 200
```

---

## CLI Usage

### Export Single Product Type

```bash
# Export 50 vision board listings
npx ts-node src/etsy/cli/etsyCli.ts export vision-boards 50 --file=output/etsy_csv/vision_boards_50.csv

# Export 25 santa message listings
npx ts-node src/etsy/cli/etsyCli.ts export santa 25 --file=output/etsy_csv/santa_25.csv

# Export 30 planner listings
npx ts-node src/etsy/cli/etsyCli.ts export planners 30 --file=output/etsy_csv/planners_30.csv
```

### Export All Products

```bash
# Export all product types (uses default quantities)
npx ts-node src/etsy/cli/etsyCli.ts export-all --dir=output/etsy_csv/
```

### Export Options

| Flag | Description |
|------|-------------|
| `--file=<path>` | Output CSV file path |
| `--state=draft` | Create as drafts (default) |
| `--state=published` | Publish immediately |
| `--images=local` | Use local image paths |
| `--images=hosted` | Use hosted URLs (for ShopUploader) |

---

## Image Hosting

ShopUploader requires publicly accessible image URLs. Options:

1. **Cloudinary** (Recommended): Free tier with 25GB bandwidth
2. **AWS S3**: More control, pay-per-use
3. **Google Cloud Storage**: Similar to S3
4. **Imgur**: Free but less reliable for commercial use

### Cloudinary Setup

```bash
# Set environment variables
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Upload and get URL
npx ts-node src/etsy/cli/etsyCli.ts upload-images output/samples/vision-boards/
```

---

## Workflow

1. **Generate Sample Images**: `npm run generate:samples`
2. **Upload to Cloudinary**: `npx ts-node src/etsy/cli/etsyCli.ts upload-images`
3. **Generate CSV**: `npx ts-node src/etsy/cli/etsyCli.ts export vision-boards 50`
4. **Import to ShopUploader**: Upload CSV at shopuploader.com
5. **Review Drafts**: Check listings in Etsy draft manager
6. **Publish**: Activate listings when ready

---

## Tag Strategy by Product

### Vision Board Tags (Example: Post-Breakup Healing)

```
tag_1: vision board
tag_2: healing journey
tag_3: self love
tag_4: breakup recovery
tag_5: manifestation
tag_6: digital download
tag_7: printable art
tag_8: aesthetic decor
tag_9: 2025 goals
tag_10: new beginnings
tag_11: self care gift
tag_12: wall art
tag_13: motivational
```

### Santa Message Tags

```
tag_1: santa letter
tag_2: personalized santa
tag_3: christmas gift
tag_4: kids christmas
tag_5: santa message
tag_6: digital download
tag_7: custom santa
tag_8: holiday keepsake
tag_9: christmas video
tag_10: santa video
tag_11: north pole
tag_12: magical christmas
tag_13: 2024 christmas
```

---

## Notes

- **Title Uniqueness**: Each listing needs unique title to avoid Etsy duplicate detection
- **Description Uniqueness**: Vary descriptions to improve SEO and avoid spam flags
- **Image Requirements**: Primary image (image_1) should be highest quality
- **Draft First**: Always create as drafts first, review, then publish
- **Batch Limits**: ShopUploader recommends batches of 100 listings max
