/**
 * Add Personalized Titles to Existing Vision Boards
 *
 * This script adds title banners to EXISTING images WITHOUT regenerating photos.
 * It preserves the carefully curated photos and layouts.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const CANVAS_WIDTH = 1080;
const BANNER_HEIGHT = 62;

// Typography
const FONTS = {
  script: "Snell Roundhand",
  serifCaps: "Bodoni 72 Smallcaps",
  sans: "Helvetica Neue, Arial, sans-serif"
};

const BOARDS = [
  {
    id: 'male',
    inputFile: 'sample-vision-board-male.png',
    outputFile: 'sample-vision-board-male.png',
    title: "JAMES' BEST YEAR YET",
    subtitle: "GOALS • GROWTH • GREATNESS",
    colors: {
      banner: '#c9a962',       // Gold
      bannerText: '#ffffff',
      bannerSubtext: 'rgba(255,255,255,0.7)'
    },
    style: 'masculine'
  },
  {
    id: 'female',
    inputFile: 'sample-vision-board-female.png',
    outputFile: 'sample-vision-board-female.png',
    title: "SARAH'S DREAM YEAR",
    subtitle: "LOVE • DREAM • SHINE",
    colors: {
      banner: '#d4a5a5',       // Dusty rose
      bannerText: '#8b5a5a',
      bannerSubtext: 'rgba(139,90,90,0.7)'
    },
    style: 'feminine'
  },
  {
    id: 'newyear',
    inputFile: 'sample-vision-board-newyear.png',
    outputFile: 'sample-vision-board-newyear.png',
    title: "ALEX'S 2025 VISION",
    subtitle: "MY YEAR • MY GOALS • MY LIFE",
    colors: {
      banner: '#b8956e',       // Warm gold
      bannerText: '#4a4a4a',
      bannerSubtext: 'rgba(74,74,74,0.7)'
    },
    style: 'neutral'
  }
];

function escapeXml(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, char => char.toUpperCase());
}

function createBannerSVG(width, title, subtitle, colors, style) {
  const height = BANNER_HEIGHT;

  // For masculine, use uppercase. For feminine, use title case
  const isMasculine = style === 'masculine' || style === 'neutral';
  const displayTitle = isMasculine ? title.toUpperCase() : toTitleCase(title);
  const fontFamily = isMasculine ? FONTS.serifCaps : FONTS.script;
  const letterSpacing = isMasculine ? '0.15em' : '0.02em';
  const titleSize = Math.min(30, Math.floor(width * 0.75 / displayTitle.length * 1.8));

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${colors.banner}"/>
    <text x="${width/2}" y="${subtitle ? 28 : 38}" text-anchor="middle"
          font-family="${fontFamily}" font-size="${titleSize}px" font-weight="400"
          letter-spacing="${letterSpacing}" fill="${colors.bannerText}">${escapeXml(displayTitle)}</text>
    ${subtitle ? `<text x="${width/2}" y="52" text-anchor="middle" font-family="${FONTS.sans}"
          font-size="14px" letter-spacing="0.12em" fill="${colors.bannerSubtext}">${escapeXml(subtitle.toUpperCase())}</text>` : ''}
  </svg>`;
}

async function addTitleToBoard(board) {
  const inputPath = path.join(__dirname, '../public/demos', board.inputFile);
  const outputPath = path.join(__dirname, '../public/demos', board.outputFile);

  console.log(`\nProcessing: ${board.id}`);
  console.log(`  Title: "${board.title}"`);
  console.log(`  Input: ${inputPath}`);

  // Check if input exists
  if (!fs.existsSync(inputPath)) {
    console.error(`  ❌ Input file not found: ${inputPath}`);
    return false;
  }

  try {
    // Read the existing image
    const existingImage = await sharp(inputPath).toBuffer();
    const metadata = await sharp(existingImage).metadata();
    console.log(`  Image size: ${metadata.width}x${metadata.height}`);

    // Create the banner SVG
    const bannerSVG = createBannerSVG(
      CANVAS_WIDTH,
      board.title,
      board.subtitle,
      board.colors,
      board.style
    );

    // Convert banner SVG to PNG buffer
    const bannerBuffer = await sharp(Buffer.from(bannerSVG)).png().toBuffer();

    // Composite the banner on top of the existing image at position (0, 0)
    const result = await sharp(existingImage)
      .composite([{
        input: bannerBuffer,
        top: 0,
        left: 0
      }])
      .png()
      .toBuffer();

    // Save the result
    fs.writeFileSync(outputPath, result);
    console.log(`  ✅ Saved: ${outputPath}`);

    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('======================================================================');
  console.log('   ADD PERSONALIZED TITLES TO EXISTING VISION BOARDS');
  console.log('   (Preserves existing photos and layout)');
  console.log('======================================================================');

  let successCount = 0;

  for (const board of BOARDS) {
    const success = await addTitleToBoard(board);
    if (success) successCount++;
  }

  console.log('\n======================================================================');
  console.log(`   COMPLETE: ${successCount}/${BOARDS.length} boards updated`);
  console.log('======================================================================\n');

  if (successCount === BOARDS.length) {
    console.log('All boards now have personalized titles!');
    console.log('Next steps:');
    console.log('  1. git add public/demos/sample-vision-board-*.png');
    console.log('  2. git commit -m "Add personalized titles to vision board demos"');
    console.log('  3. git push origin main');
  }
}

main().catch(console.error);
