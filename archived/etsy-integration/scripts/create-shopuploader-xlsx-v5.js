const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Read the listing data
const listingDir = '/Users/matthewriley/EtsyInnovations/listing_packets/santa_message_001';
const title = fs.readFileSync(path.join(listingDir, 'title.txt'), 'utf8').trim();
const description = fs.readFileSync(path.join(listingDir, 'description.txt'), 'utf8').trim();
const tagsRaw = fs.readFileSync(path.join(listingDir, 'tags.txt'), 'utf8').trim();
const tags = tagsRaw.split('\n').filter(t => t.trim());

// Image URLs (hosted on Render)
const baseUrl = 'https://personalizedoutput.com/listing-images/santa-message';
const images = [
  `${baseUrl}/01_hero.png`,
  `${baseUrl}/02_benefit.png`,
  `${baseUrl}/03_process.png`,
  `${baseUrl}/04_voice.png`,
  `${baseUrl}/05_reviews.png`
];

// EXACT columns from the ShopUploader template
const columns = [
  'listing_id', 'parent_sku', 'sku', 'title', 'description', 'price', 'quantity',
  'category',
  '_primary_color', '_secondary_color', '_occasion', '_holiday',
  '_deprecated_diameter', '_deprecated_dimensions', '_deprecated_fabric', '_deprecated_finish',
  '_deprecated_flavor', '_deprecated_height', '_deprecated_length', '_deprecated_material',
  '_deprecated_pattern', '_deprecated_scent', '_deprecated_size', '_deprecated_style',
  '_deprecated_weight', '_deprecated_width', '_deprecated_device',
  'image_1', 'image_2', 'image_3', 'image_4', 'image_5',
  'image_6', 'image_7', 'image_8', 'image_9', 'image_10',
  'digital_file_1', 'digital_file_2', 'digital_file_3', 'digital_file_4', 'digital_file_5',
  'digital_file_name_1', 'digital_file_name_2', 'digital_file_name_3', 'digital_file_name_4', 'digital_file_name_5',
  'type', 'who_made', 'is_made_to_order', 'year_made', 'is_vintage', 'is_supply', 'is_taxable',
  'auto_renew', 'is_customizable', 'is_personalizable', 'personalization_is_required',
  'personalization_instructions', 'personalization_char_count_max',
  'style_1', 'style_2',
  'tag_1', 'tag_2', 'tag_3', 'tag_4', 'tag_5', 'tag_6', 'tag_7',
  'tag_8', 'tag_9', 'tag_10', 'tag_11', 'tag_12', 'tag_13',
  'action', 'listing_state', 'overwrite_images'
];

// Create listing data matching the WORKING Etsy listing format
const listingData = {
  listing_id: '',
  parent_sku: '',
  sku: 'SANTA-MSG-002',
  title: title,
  description: description,
  price: '14.99',
  quantity: '999',

  // Leave blank - set manually in ShopUploader or let it default
  category: '',

  // Attributes (from working listing)
  _primary_color: 'White',
  _secondary_color: 'Red',
  _occasion: '',
  _holiday: 'Christmas',

  // Deprecated fields - leave empty
  _deprecated_diameter: '',
  _deprecated_dimensions: '',
  _deprecated_fabric: '',
  _deprecated_finish: '',
  _deprecated_flavor: '',
  _deprecated_height: '',
  _deprecated_length: '',
  _deprecated_material: '',
  _deprecated_pattern: '',
  _deprecated_scent: '',
  _deprecated_size: '',
  _deprecated_style: '',
  _deprecated_weight: '',
  _deprecated_width: '',
  _deprecated_device: '',

  // Images
  image_1: images[0],
  image_2: images[1],
  image_3: images[2],
  image_4: images[3],
  image_5: images[4],
  image_6: '',
  image_7: '',
  image_8: '',
  image_9: '',
  image_10: '',

  // Digital file - instruction PDF
  digital_file_1: 'https://personalizedoutput.com/digital-downloads/santa_instructions.txt',
  digital_file_2: '',
  digital_file_3: '',
  digital_file_4: '',
  digital_file_5: '',
  digital_file_name_1: 'INSTRUCTIONS_READ_FIRST.txt',
  digital_file_name_2: '',
  digital_file_name_3: '',
  digital_file_name_4: '',
  digital_file_name_5: '',

  // Core details - EXACT format from working listing
  type: 'digital',
  who_made: 'i_did',
  is_made_to_order: 'FALSE',  // Not made to order - it's 2020-2025
  year_made: '2024',          // Specific year within 2020-2025 range
  is_vintage: 'FALSE',
  is_supply: 'FALSE',         // Finished product, not a supply
  is_taxable: 'FALSE',

  // Settings
  auto_renew: 'TRUE',
  is_customizable: 'FALSE',
  is_personalizable: 'FALSE',  // Using PDF link approach like working listing
  personalization_is_required: 'FALSE',
  personalization_instructions: '',
  personalization_char_count_max: '',

  // Styles
  style_1: '',
  style_2: '',

  // Tags (from our optimized list)
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

  // Action
  action: 'create',
  listing_state: 'active',
  overwrite_images: 'TRUE'
};

// Create row array matching column order
const row = columns.map(col => listingData[col] !== undefined ? listingData[col] : '');

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([columns, row]);

// Set column widths
ws['!cols'] = columns.map(col => {
  if (col === 'description') return { wch: 50 };
  if (col === 'title') return { wch: 40 };
  if (col.startsWith('image_')) return { wch: 60 };
  return { wch: 15 };
});

XLSX.utils.book_append_sheet(wb, ws, 'Listings');

// Write the file
const outputPath = '/Users/matthewriley/EtsyInnovations/UPLOAD_THIS_santa_v5.xlsx';
XLSX.writeFile(wb, outputPath);

console.log('='.repeat(60));
console.log('ShopUploader XLSX v5 created!');
console.log('='.repeat(60));
console.log('');
console.log('File:', outputPath);
console.log('');
console.log('Key values (matching your working listing):');
console.log('  category:', listingData.category);
console.log('  type:', listingData.type);
console.log('  who_made:', listingData.who_made);
console.log('  is_made_to_order:', listingData.is_made_to_order);
console.log('  year_made:', listingData.year_made);
console.log('  is_vintage:', listingData.is_vintage);
console.log('  is_supply:', listingData.is_supply);
console.log('');
console.log('Total columns:', columns.length);
console.log('');
