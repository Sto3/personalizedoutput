const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Listing configurations
const listings = [
  {
    id: 'santa_message_001',
    sku: 'SANTA-MSG-001',
    price: '14.99',
    imageFolder: 'santa-message',
    category: 'Craft Supplies & Tools > Patterns & How To > Tutorials',
    occasion: 'Christmas',
    holiday: 'Christmas'
  },
  {
    id: 'holiday_reset_001',
    sku: 'HOLIDAY-RESET-001',
    price: '12.99',
    imageFolder: 'holiday-reset',
    category: 'Craft Supplies & Tools > Patterns & How To > Tutorials',
    occasion: 'Christmas',
    holiday: 'Christmas'
  },
  {
    id: 'new_year_001',
    sku: 'NEWYEAR-001',
    price: '12.99',
    imageFolder: 'new-year',
    category: 'Craft Supplies & Tools > Patterns & How To > Tutorials',
    occasion: 'New Year',
    holiday: ''
  }
];

const baseUrl = 'https://personalizedoutput.com/listing-images';

// Column definitions matching ShopUploader template
const allColumns = [
  'listing_id', 'parent_sku', 'sku', 'title', 'description', 'price', 'quantity',
  'category', 'colors', 'occasion', 'holiday',
  'image_1', 'image_2', 'image_3', 'image_4', 'image_5',
  'image_6', 'image_7', 'image_8', 'image_9', 'image_10',
  'digital_file_1', 'digital_file_name_1',
  'digital_file_2', 'digital_file_name_2',
  'digital_file_3', 'digital_file_name_3',
  'digital_file_4', 'digital_file_name_4',
  'digital_file_5', 'digital_file_name_5',
  'type', 'who_made',
  'is_personalizable', 'personalization_instructions', 'personalization_char_count_max',
  'tag_1', 'tag_2', 'tag_3', 'tag_4', 'tag_5',
  'tag_6', 'tag_7', 'tag_8', 'tag_9', 'tag_10',
  'tag_11', 'tag_12', 'tag_13',
  'action', 'listing_state'
];

const rows = [allColumns];  // Start with header

listings.forEach(listing => {
  const listingDir = `/Users/matthewriley/EtsyInnovations/listing_packets/${listing.id}`;

  // Check if listing directory exists
  if (!fs.existsSync(listingDir)) {
    console.log(`Skipping ${listing.id} - directory not found`);
    return;
  }

  const title = fs.readFileSync(path.join(listingDir, 'title.txt'), 'utf8').trim();
  const description = fs.readFileSync(path.join(listingDir, 'description.txt'), 'utf8').trim();
  const tagsRaw = fs.readFileSync(path.join(listingDir, 'tags.txt'), 'utf8').trim();
  const tags = tagsRaw.split('\n').filter(t => t.trim());

  // Check for images
  const imageDir = path.join(listingDir, 'images');
  let images = [];
  if (fs.existsSync(imageDir)) {
    const imageFiles = fs.readdirSync(imageDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    images = imageFiles.map(img => `${baseUrl}/${listing.imageFolder}/${img}`);
  }

  // Get personalization instructions based on product type
  let personalizationInstructions = '';
  if (listing.id.includes('santa')) {
    personalizationInstructions = `Please provide:
• Child's first name (and pronunciation if unique spelling)
• Their age
• 2-3 specific accomplishments from this year
• Special details (pets, siblings, hobbies, favorite things)
• Optional: Any challenges they've overcome`;
  } else if (listing.id.includes('holiday_reset')) {
    personalizationInstructions = `Please provide:
• Your first name
• What kind of year you've had (highlights and challenges)
• What's weighing on you right now
• What you wish someone would say to you
• Optional: Specific holiday stressors you're dealing with`;
  } else if (listing.id.includes('new_year')) {
    personalizationInstructions = `Please provide:
• Your first name
• 3-5 things you accomplished in 2024 (big or small)
• Challenges you faced this year
• What you learned about yourself
• 2-3 intentions or hopes for 2025
• Optional: A word or theme for your new year`;
  }

  const listingData = {
    listing_id: '',
    parent_sku: '',
    sku: listing.sku,
    title: title,
    description: description,
    price: listing.price,
    quantity: '999',
    category: listing.category,
    colors: '',
    occasion: listing.occasion,
    holiday: listing.holiday,
    image_1: images[0] || '',
    image_2: images[1] || '',
    image_3: images[2] || '',
    image_4: images[3] || '',
    image_5: images[4] || '',
    image_6: images[5] || '',
    image_7: images[6] || '',
    image_8: images[7] || '',
    image_9: images[8] || '',
    image_10: images[9] || '',
    digital_file_1: '',
    digital_file_name_1: '',
    digital_file_2: '',
    digital_file_name_2: '',
    digital_file_3: '',
    digital_file_name_3: '',
    digital_file_4: '',
    digital_file_name_4: '',
    digital_file_5: '',
    digital_file_name_5: '',
    type: 'digital',
    who_made: 'i_did',
    is_personalizable: 'true',
    personalization_instructions: personalizationInstructions,
    personalization_char_count_max: '1000',
    tag_1: tags[0] || '',
    tag_2: tags[1] || '',
    tag_3: tags[2] || '',
    tag_4: tags[3] || '',
    tag_5: tags[4] || '',
    tag_6: tags[5] || '',
    tag_7: tags[6] || '',
    tag_8: tags[7] || '',
    tag_9: tags[8] || '',
    tag_10: tags[9] || '',
    tag_11: tags[10] || '',
    tag_12: tags[11] || '',
    tag_13: tags[12] || '',
    action: 'create',
    listing_state: 'active'
  };

  // Create row array
  const row = allColumns.map(col => listingData[col] || '');
  rows.push(row);

  console.log(`Added: ${listing.sku}`);
  console.log(`  - Title: ${title.substring(0, 50)}...`);
  console.log(`  - Price: $${listing.price}`);
  console.log(`  - Tags: ${tags.length}`);
  console.log(`  - Images: ${images.length}`);
  console.log('');
});

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(rows);

// Set column widths
ws['!cols'] = allColumns.map(col => {
  if (col === 'description') return { wch: 50 };
  if (col === 'title') return { wch: 40 };
  if (col === 'personalization_instructions') return { wch: 40 };
  if (col.startsWith('image_')) return { wch: 60 };
  return { wch: 20 };
});

XLSX.utils.book_append_sheet(wb, ws, 'Listings');

// Write the file
const outputPath = '/Users/matthewriley/EtsyInnovations/shopuploader_all_listings.xlsx';
XLSX.writeFile(wb, outputPath);

console.log('='.repeat(50));
console.log('ShopUploader XLSX created: shopuploader_all_listings.xlsx');
console.log(`Total listings: ${rows.length - 1}`);
console.log('');
console.log('NEXT STEPS:');
console.log('1. Create listing images for Holiday Reset and New Year');
console.log('2. Deploy to Render so images are accessible');
console.log('3. Import shopuploader_all_listings.xlsx into ShopUploader');
