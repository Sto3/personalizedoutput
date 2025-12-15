const fs = require('fs');
const path = require('path');

// ============================================================================
// SHOPUPLOADER CSV EXPORT SCRIPT
// Exports 75 Vision Board + 75 Planner listings to CSV format
// ============================================================================

// Read listing data
const visionBoardData = JSON.parse(fs.readFileSync('/Users/matthewriley/EtsyInnovations/data/listings/vision_board_75_listings.json', 'utf8'));
const plannerData = JSON.parse(fs.readFileSync('/Users/matthewriley/EtsyInnovations/data/listings/planner_75_listings.json', 'utf8'));

// Image URLs (hosted on Render)
const IMAGE_BASE = 'https://personalizedoutput.com/listing-images';
const VISION_BOARD_IMAGES = [
  `${IMAGE_BASE}/vision-board/01_hero_photo_dual.png`,
  `${IMAGE_BASE}/vision-board/visionboard-v12-healing.png`,
  `${IMAGE_BASE}/vision-board/visionboard-v12-career.png`,
  `${IMAGE_BASE}/vision-board/visionboard-v12-2025.png`,
  `${IMAGE_BASE}/vision-board/visionboard-v12-selflove.png`
];

const PLANNER_IMAGES = [
  `${IMAGE_BASE}/planner/01_hero_themed.png`,
  `${IMAGE_BASE}/planner/02_benefit.png`,
  `${IMAGE_BASE}/planner/03_process.png`,
  `${IMAGE_BASE}/planner/04_sample.png`,
  `${IMAGE_BASE}/planner/05_reviews.png`
];

// ShopUploader 50-column format
const COLUMNS = [
  'listing_id', 'parent_sku', 'sku', 'title', 'description', 'price', 'quantity', 'category',
  'image_1', 'image_2', 'image_3', 'image_4', 'image_5', 'image_6', 'image_7', 'image_8', 'image_9', 'image_10',
  'shipping_profile_id', 'readiness_state_id', 'return_policy_id',
  'type', 'who_made', 'is_made_to_order', 'year_made', 'is_vintage', 'is_supply', 'is_taxable', 'auto_renew',
  'is_customizable', 'is_personalizable', 'personalization_is_required', 'personalization_instructions', 'personalization_char_count_max',
  'tag_1', 'tag_2', 'tag_3', 'tag_4', 'tag_5', 'tag_6', 'tag_7', 'tag_8', 'tag_9', 'tag_10', 'tag_11', 'tag_12', 'tag_13',
  'action', 'listing_state', 'overwrite_images'
];

// ============================================================================
// DESCRIPTION TEMPLATES
// ============================================================================

function getVisionBoardDescription(listing) {
  const theme = listing.title.split('|')[0].trim();

  return `✨ ${theme} - Your Personal Transformation Awaits ✨

This isn't just another vision board – it's YOUR personalized manifestation tool, created uniquely for YOUR journey.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 WHAT MAKES THIS DIFFERENT:

Unlike generic templates, your vision board is:
• AI-designed specifically for YOUR goals and dreams
• Created with intentional imagery that speaks to YOUR story
• Professionally designed with premium aesthetics
• Ready to print and display immediately

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💫 WHAT YOU'LL RECEIVE:

• 1 High-Resolution Vision Board (8.5x11" PDF)
• Instant Digital Download
• Print-Ready Format
• Personalized for YOUR specific goals

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 PERFECT FOR:

• Starting a new chapter
• Manifesting your dreams
• Daily motivation & inspiration
• Gifts for loved ones going through transitions
• New Year, birthday, or milestone celebrations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 HOW IT WORKS:

1. Purchase and provide your personalization details
2. Our AI creates your unique vision board within 24-48 hours
3. Download your personalized PDF
4. Print at home or at any print shop
5. Display and manifest your dreams!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💝 WHY CUSTOMERS LOVE IT:

"This was exactly what I needed during my transition. It's like it was made just for me – because it was!" - Sarah

"I've tried vision board apps, but this feels different. It's personal and meaningful." - Michelle

"Bought this for my friend going through a divorce. She cried happy tears." - Jennifer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 MAKES A THOUGHTFUL GIFT:

Perfect for anyone starting a new chapter, celebrating a milestone, or needing a boost of inspiration.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⬇️ INSTANT DIGITAL DOWNLOAD
No shipping, no waiting. Manifest your future TODAY.

Questions? Message us anytime!

#VisionBoard #Manifestation #DigitalDownload #PersonalizedGift`;
}

function getPlannerDescription(listing) {
  const theme = listing.title.split('|')[0].trim();

  return `📔 ${theme} - AI-Personalized Just for You 📔

Finally, a planner that understands YOUR unique journey. This isn't generic advice – it's personalized guidance created specifically for YOUR situation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 WHAT MAKES THIS DIFFERENT:

• AI-powered personalization based on YOUR story
• Guided prompts designed for YOUR specific challenges
• Reflection exercises that speak to YOUR journey
• Not a template – a tool created for YOU

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💫 WHAT YOU'LL RECEIVE:

• Personalized PDF Planner (printable)
• Guided reflection prompts tailored to you
• Clarity exercises for your specific situation
• Action planning worksheets
• Instant digital download

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 PERFECT FOR:

• Processing life changes
• Finding clarity during uncertainty
• Setting intentions with purpose
• Daily reflection and growth
• Working through difficult transitions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 HOW IT WORKS:

1. Purchase and share your story (via personalization box)
2. Our AI creates your personalized planner within 24-48 hours
3. Download your custom PDF
4. Print and begin your clarity journey
5. Use daily for reflection and growth

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💝 WHAT CUSTOMERS SAY:

"This planner helped me process my divorce in ways therapy couldn't. It felt like it truly understood my situation." - Maria

"I've bought dozens of planners. This is the first one that actually speaks to ME." - Ashley

"Bought this during my career transition. The prompts were so specific to what I was going through." - David

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 A MEANINGFUL GIFT:

For anyone going through a transition, facing a challenge, or seeking clarity. Shows you truly understand what they're going through.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⬇️ INSTANT DIGITAL DOWNLOAD
No waiting. Start your clarity journey TODAY.

Questions? We're here to help!

#ClarityPlanner #PersonalizedGift #DigitalDownload #SelfHelp #Reflection`;
}

// ============================================================================
// PERSONALIZATION INSTRUCTIONS
// ============================================================================

const VISION_BOARD_PERSONALIZATION = `Please share the following so we can create YOUR perfect vision board:

• What is this vision board FOR? (new year goals, fresh start, career change, healing, etc.)
• Your name (or recipient's name if a gift)
• 3-5 specific goals or dreams you want to manifest
• Your preferred aesthetic (minimalist, feminine, bold, earthy, dark/moody)
• Any specific colors you love
• Optional: What situation are you coming from? (helps us make it more meaningful)

The more details you share, the more personalized your board will be!`;

const PLANNER_PERSONALIZATION = `Please share the following so we can personalize YOUR clarity planner:

• What situation are you processing? (career change, relationship end, grief, life transition, etc.)
• Your name (or recipient's name if a gift)
• What specific challenges are you facing?
• What outcomes are you hoping for?
• Any specific questions you want guidance on?
• Optional: How long have you been dealing with this?

Your answers help us create prompts and exercises specifically for YOUR journey. Everything you share is used only to personalize your planner.`;

// ============================================================================
// CSV GENERATION
// ============================================================================

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function createListingRow(listing, productType, index) {
  const isVisionBoard = productType === 'vision_board';
  const images = isVisionBoard ? VISION_BOARD_IMAGES : PLANNER_IMAGES;
  const description = isVisionBoard ? getVisionBoardDescription(listing) : getPlannerDescription(listing);
  const personalization = isVisionBoard ? VISION_BOARD_PERSONALIZATION : PLANNER_PERSONALIZATION;
  const skuPrefix = isVisionBoard ? 'VB' : 'PL';

  const row = {
    listing_id: '',
    parent_sku: '',
    sku: `${skuPrefix}-${String(index + 1).padStart(3, '0')}`,
    title: listing.title,
    description: description,
    price: '14.99',
    quantity: '999',
    category: '', // ShopUploader will prompt
    image_1: images[0] || '',
    image_2: images[1] || '',
    image_3: images[2] || '',
    image_4: images[3] || '',
    image_5: images[4] || '',
    image_6: '',
    image_7: '',
    image_8: '',
    image_9: '',
    image_10: '',
    shipping_profile_id: '',
    readiness_state_id: '',
    return_policy_id: '',
    type: 'digital',
    who_made: 'i_did',
    is_made_to_order: 'FALSE',
    year_made: '2024',
    is_vintage: 'FALSE',
    is_supply: 'FALSE',
    is_taxable: 'FALSE',
    auto_renew: 'TRUE',
    is_customizable: 'FALSE',
    is_personalizable: 'TRUE',
    personalization_is_required: 'TRUE',
    personalization_instructions: personalization,
    personalization_char_count_max: '1000',
    tag_1: listing.tags[0] || '',
    tag_2: listing.tags[1] || '',
    tag_3: listing.tags[2] || '',
    tag_4: listing.tags[3] || '',
    tag_5: listing.tags[4] || '',
    tag_6: listing.tags[5] || '',
    tag_7: listing.tags[6] || '',
    tag_8: listing.tags[7] || '',
    tag_9: listing.tags[8] || '',
    tag_10: listing.tags[9] || '',
    tag_11: listing.tags[10] || '',
    tag_12: listing.tags[11] || '',
    tag_13: listing.tags[12] || '',
    action: 'create',
    listing_state: 'draft', // Start as drafts for safety
    overwrite_images: 'TRUE'
  };

  return COLUMNS.map(col => escapeCSV(row[col]));
}

function generateCSV(listings, productType, outputPath) {
  const rows = [COLUMNS.join(',')]; // Header row

  listings.forEach((listing, index) => {
    rows.push(createListingRow(listing, productType, index).join(','));
  });

  fs.writeFileSync(outputPath, rows.join('\n'), 'utf8');
  console.log(`✅ Created: ${outputPath}`);
  console.log(`   ${listings.length} listings exported`);
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

const outputDir = '/Users/matthewriley/EtsyInnovations/shopuploader_exports';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const timestamp = new Date().toISOString().split('T')[0];

// Export Vision Boards
generateCSV(
  visionBoardData.listings,
  'vision_board',
  path.join(outputDir, `vision_board_75_listings_${timestamp}.csv`)
);

// Export Planners
generateCSV(
  plannerData.listings,
  'planner',
  path.join(outputDir, `planner_75_listings_${timestamp}.csv`)
);

// Also create a combined file
const allListings = [];
visionBoardData.listings.forEach((listing, index) => {
  allListings.push(createListingRow(listing, 'vision_board', index).join(','));
});
plannerData.listings.forEach((listing, index) => {
  allListings.push(createListingRow(listing, 'planner', index).join(','));
});

const combinedPath = path.join(outputDir, `ALL_150_listings_${timestamp}.csv`);
fs.writeFileSync(combinedPath, [COLUMNS.join(','), ...allListings].join('\n'), 'utf8');
console.log(`✅ Created: ${combinedPath}`);
console.log(`   150 total listings (75 Vision Boards + 75 Planners)`);

console.log('\n' + '='.repeat(60));
console.log('SHOPUPLOADER EXPORT COMPLETE');
console.log('='.repeat(60));
console.log(`\nFiles created in: ${outputDir}`);
console.log('\nNext steps:');
console.log('1. Go to shopuploader.com');
console.log('2. Upload the CSV file(s)');
console.log('3. Select your Etsy shop');
console.log('4. Review listings (they will be DRAFTS)');
console.log('5. Publish when ready!');
console.log('\nNote: Listings are set to DRAFT mode for safety.');
console.log('You can change listing_state to "active" to publish immediately.');
