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

// EXACT columns from the NEW template (45 columns)
const columns = [
  'listing_id',
  'parent_sku',
  'sku',
  'title',
  'description',
  'price',
  'quantity',
  'category',
  'image_1',
  'image_2',
  'image_3',
  'image_4',
  'image_5',
  'image_6',
  'image_7',
  'image_8',
  'image_9',
  'image_10',
  'shipping_profile_id',
  'readiness_state_id',
  'return_policy_id',
  'type',
  'who_made',
  'is_made_to_order',
  'year_made',
  'is_vintage',
  'is_supply',
  'is_taxable',
  'auto_renew',
  'tag_1',
  'tag_2',
  'tag_3',
  'tag_4',
  'tag_5',
  'tag_6',
  'tag_7',
  'tag_8',
  'tag_9',
  'tag_10',
  'tag_11',
  'tag_12',
  'tag_13',
  'action',
  'listing_state',
  'overwrite_images'
];

// Create listing data matching the template
const listingData = {
  listing_id: '',
  parent_sku: '',
  sku: 'SANTA-MSG-003',
  title: title,
  description: description,
  price: '14.99',
  quantity: '999',

  // Leave blank - ShopUploader will prompt or use default
  category: '',

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

  // Shipping/Returns - leave blank for digital
  shipping_profile_id: '',
  readiness_state_id: '',
  return_policy_id: '',

  // Core details - matching working listing
  type: 'digital',
  who_made: 'i_did',
  is_made_to_order: 'FALSE',
  year_made: '2024',
  is_vintage: 'FALSE',
  is_supply: 'FALSE',
  is_taxable: 'FALSE',
  auto_renew: 'TRUE',

  // Tags
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
const outputPath = '/Users/matthewriley/EtsyInnovations/UPLOAD_THIS_santa_v6.xlsx';
XLSX.writeFile(wb, outputPath);

console.log('='.repeat(60));
console.log('ShopUploader XLSX v6 created (using NEW template format)!');
console.log('='.repeat(60));
console.log('');
console.log('File:', outputPath);
console.log('');
console.log('Template columns:', columns.length);
console.log('');
console.log('Key values:');
console.log('  type:', listingData.type);
console.log('  who_made:', listingData.who_made);
console.log('  is_made_to_order:', listingData.is_made_to_order);
console.log('  year_made:', listingData.year_made);
console.log('  category: (blank - will need to set in ShopUploader)');
console.log('');
