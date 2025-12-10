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

// Create the listing row data based on ShopUploader template
const listingData = {
  // Required fields
  listing_id: '',  // Leave empty for new listing
  parent_sku: '',
  sku: 'SANTA-MSG-001',
  title: title,
  description: description,
  price: '14.99',
  quantity: '999',

  // Category - Digital Downloads > Audio
  category: 'Craft Supplies & Tools > Patterns & How To > Tutorials',  // Will need to verify

  // Attributes
  colors: '',
  occasion: 'Christmas',
  holiday: 'Christmas',

  // Images (local paths - check if ShopUploader accepts these)
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

  // Digital files (placeholder - actual file delivered manually)
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

  // Listing type
  type: 'digital',
  who_made: 'i_did',

  // Personalization
  is_personalizable: 'true',
  personalization_instructions: `Please provide:
• Child's first name (and pronunciation if unique spelling)
• Their age
• 2-3 specific accomplishments from this year
• Special details (pets, siblings, hobbies, favorite things)
• Optional: Any challenges they've overcome`,
  personalization_char_count_max: '1000',

  // Tags (1-13)
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
  listing_state: 'active'
};

// Create worksheet with all columns from template
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

// Create row array
const row = allColumns.map(col => listingData[col] || '');

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([allColumns, row]);

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
const outputPath = '/Users/matthewriley/EtsyInnovations/shopuploader_santa_listing.xlsx';
XLSX.writeFile(wb, outputPath);

console.log('ShopUploader XLSX created successfully!');
console.log('Output:', outputPath);
console.log('');
console.log('Listing details:');
console.log('- Title:', title.substring(0, 60) + '...');
console.log('- Price: $14.99');
console.log('- Tags:', tags.length);
console.log('- Images:', images.length);
console.log('- Personalization: Enabled');
console.log('');
console.log('Image URLs point to: personalizedoutput.com/listing-images/santa-message/');
console.log('');
console.log('NEXT STEPS:');
console.log('1. Deploy to Render so images are accessible');
console.log('2. Import shopuploader_santa_listing.xlsx into ShopUploader');
console.log('3. Review and publish the listing');
