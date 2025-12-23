const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Register fonts
registerFont('/System/Library/Fonts/Supplemental/SnellRoundhand.ttc', { family: 'Snell Roundhand' });
registerFont('/System/Library/Fonts/Supplemental/Bodoni 72.ttc', { family: 'Bodoni 72' });

// Configuration
const CONFIG = {
  outputDir: '/Users/matthewriley/EtsyInnovations/outputs/anniversary/video',
  photosDir: '/Users/matthewriley/EtsyInnovations/50 Anniversary /slideshow photos/Mommy and Daddy 50',
  width: 1920,
  height: 1080,
  fps: 30,

  // Timing (in seconds)
  photoDisplayTime: 14,       // How long each photo shows
  highQualityBonus: 6,        // Extra time for high-res photos
  transitionTime: 1.5,        // Cross-dissolve duration
  titleCardTime: 10,          // Opening/closing title duration
  scriptureCardTime: 10,      // Scripture interstitial duration

  // Colors (matching printed materials)
  burgundy: '#8B1A1A',
  darkBurgundy: '#6B0F0F',
  gold: '#D4AF37',
  cream: '#F5E6C8',
  lightGold: '#E8D4A8'
};

// Scripture verses for interstitials
const SCRIPTURES = [
  {
    text: '"Two are better than one...\na cord of three strands\nis not quickly broken."',
    ref: 'Ecclesiastes 4:9, 12'
  },
  {
    text: '"Many waters cannot quench love,\nneither can the floods drown it."',
    ref: 'Song of Solomon 8:7'
  },
  {
    text: '"Whoso findeth a wife\nfindeth a good thing,\nand obtaineth favour of the LORD."',
    ref: 'Proverbs 18:22'
  },
  {
    text: '"Love is patient, love is kind...\nIt always protects, always trusts,\nalways hopes, always perseveres."',
    ref: '1 Corinthians 13:4,7'
  }
];

// Ensure output directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Create elegant background gradient
function drawBackground(ctx, width, height) {
  // Rich gold/champagne gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, CONFIG.cream);
  bgGradient.addColorStop(0.3, CONFIG.lightGold);
  bgGradient.addColorStop(0.5, CONFIG.gold);
  bgGradient.addColorStop(0.7, CONFIG.lightGold);
  bgGradient.addColorStop(1, CONFIG.cream);
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Radial luminosity
  const radialGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, height/1.2);
  radialGradient.addColorStop(0, 'rgba(255, 250, 240, 0.35)');
  radialGradient.addColorStop(0.5, 'rgba(255, 250, 240, 0.15)');
  radialGradient.addColorStop(1, 'rgba(180, 150, 100, 0.2)');
  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, width, height);

  // Subtle texture
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const alpha = Math.random() * 0.03;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

// Draw decorative border
function drawBorder(ctx, width, height) {
  const borderWidth = 12;
  ctx.strokeStyle = CONFIG.burgundy;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(borderWidth/2, borderWidth/2, width - borderWidth, height - borderWidth);

  // Inner gold accent
  ctx.strokeStyle = CONFIG.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(borderWidth + 8, borderWidth + 8, width - borderWidth*2 - 16, height - borderWidth*2 - 16);
}

// Draw decorative diamond
function drawDiamond(ctx, x, y, size) {
  ctx.fillStyle = CONFIG.gold;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
}

// Draw decorative lines with diamond
function drawDecorativeLine(ctx, y, width) {
  ctx.strokeStyle = CONFIG.gold;
  ctx.lineWidth = 3;

  // Left line
  ctx.beginPath();
  ctx.moveTo(width * 0.15, y);
  ctx.lineTo(width * 0.42, y);
  ctx.stroke();

  // Right line
  ctx.beginPath();
  ctx.moveTo(width * 0.58, y);
  ctx.lineTo(width * 0.85, y);
  ctx.stroke();

  // Center diamond
  drawDiamond(ctx, width/2, y, 12);
}

// Generate Opening Title Card
async function generateOpeningTitle() {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, CONFIG.width, CONFIG.height);
  drawBorder(ctx, CONFIG.width, CONFIG.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Happy" in elegant script
  ctx.fillStyle = CONFIG.burgundy;
  ctx.font = 'italic 72px "Snell Roundhand"';
  ctx.fillText('Happy', CONFIG.width/2, 180);

  // "50th" large and bold
  ctx.font = '180px "Bodoni 72"';
  ctx.fillText('50th', CONFIG.width/2, 340);

  // "Wedding Anniversary"
  ctx.font = 'italic 65px "Snell Roundhand"';
  ctx.fillText('Wedding Anniversary', CONFIG.width/2, 480);

  // Decorative line
  drawDecorativeLine(ctx, 560, CONFIG.width);

  // Names - large and elegant
  ctx.font = 'bold italic 85px "Snell Roundhand"';
  ctx.fillText('Matthew & Elizabeth Riley', CONFIG.width/2, 680);

  // "Pastor and First Lady" subtitle
  ctx.fillStyle = CONFIG.darkBurgundy;
  ctx.font = '42px "Bodoni 72"';
  ctx.fillText('Pastor and First Lady', CONFIG.width/2, 770);

  // Decorative line
  drawDecorativeLine(ctx, 850, CONFIG.width);

  // "Celebrating 50 Years of Love"
  ctx.fillStyle = CONFIG.burgundy;
  ctx.font = 'italic 55px "Snell Roundhand"';
  ctx.fillText('Celebrating 50 Years of Love', CONFIG.width/2, 940);

  // Date
  ctx.fillStyle = CONFIG.darkBurgundy;
  ctx.font = '38px "Bodoni 72"';
  ctx.fillText('December 21, 1975 — December 21, 2025', CONFIG.width/2, 1010);

  const outputPath = path.join(CONFIG.outputDir, 'cards', 'opening_title.png');
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log('✓ Opening title card generated');
  return outputPath;
}

// Generate "From Their Children" Title Card
async function generateChildrenTitle() {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, CONFIG.width, CONFIG.height);
  drawBorder(ctx, CONFIG.width, CONFIG.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "A Celebration of Love"
  ctx.fillStyle = CONFIG.burgundy;
  ctx.font = 'italic 70px "Snell Roundhand"';
  ctx.fillText('A Celebration of Love', CONFIG.width/2, 280);

  // Decorative line
  drawDecorativeLine(ctx, 380, CONFIG.width);

  // "From Your Children"
  ctx.font = 'italic 80px "Snell Roundhand"';
  ctx.fillText('From Your Children', CONFIG.width/2, 500);

  // Heart or decorative element
  ctx.fillStyle = CONFIG.gold;
  ctx.font = '60px "Bodoni 72"';
  ctx.fillText('With All Our Love', CONFIG.width/2, 620);

  // Decorative line
  drawDecorativeLine(ctx, 720, CONFIG.width);

  // "To Our Mommy and Daddy"
  ctx.fillStyle = CONFIG.burgundy;
  ctx.font = 'bold italic 75px "Snell Roundhand"';
  ctx.fillText('To Our Mommy and Daddy', CONFIG.width/2, 850);

  // "Thank you for showing us what love looks like"
  ctx.fillStyle = CONFIG.darkBurgundy;
  ctx.font = 'italic 42px "Snell Roundhand"';
  ctx.fillText('Thank you for showing us what love looks like', CONFIG.width/2, 960);

  const outputPath = path.join(CONFIG.outputDir, 'cards', 'children_title.png');
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log('✓ Children title card generated');
  return outputPath;
}

// Generate Scripture Interstitial Card
async function generateScriptureCard(scripture, index) {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, CONFIG.width, CONFIG.height);
  drawBorder(ctx, CONFIG.width, CONFIG.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Scripture text
  ctx.fillStyle = CONFIG.burgundy;
  ctx.font = 'italic 52px "Snell Roundhand"';

  const lines = scripture.text.split('\n');
  const lineHeight = 85;
  const startY = CONFIG.height/2 - (lines.length * lineHeight) / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, CONFIG.width/2, startY + (i * lineHeight));
  });

  // Decorative line
  const refY = startY + (lines.length * lineHeight) + 60;
  drawDecorativeLine(ctx, refY, CONFIG.width);

  // Reference
  ctx.fillStyle = CONFIG.darkBurgundy;
  ctx.font = '36px "Bodoni 72"';
  ctx.fillText('— ' + scripture.ref, CONFIG.width/2, refY + 80);

  const outputPath = path.join(CONFIG.outputDir, 'cards', `scripture_${index + 1}.png`);
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log(`✓ Scripture card ${index + 1} generated`);
  return outputPath;
}

// Generate Closing Title Card
async function generateClosingTitle() {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, CONFIG.width, CONFIG.height);
  drawBorder(ctx, CONFIG.width, CONFIG.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "50 Years of Blessings"
  ctx.fillStyle = CONFIG.burgundy;
  ctx.font = 'italic 75px "Snell Roundhand"';
  ctx.fillText('50 Years of Blessings', CONFIG.width/2, 220);

  // Decorative line
  drawDecorativeLine(ctx, 320, CONFIG.width);

  // Names
  ctx.font = 'bold italic 90px "Snell Roundhand"';
  ctx.fillText('Matthew & Elizabeth Riley', CONFIG.width/2, 450);

  // Dual titles
  ctx.fillStyle = CONFIG.darkBurgundy;
  ctx.font = '40px "Bodoni 72"';
  ctx.fillText('Pastor and First Lady', CONFIG.width/2, 540);
  ctx.font = 'italic 45px "Snell Roundhand"';
  ctx.fillText('Mommy and Daddy', CONFIG.width/2, 610);

  // Decorative line
  drawDecorativeLine(ctx, 700, CONFIG.width);

  // "With God at the Center"
  ctx.fillStyle = CONFIG.burgundy;
  ctx.font = '48px "Bodoni 72"';
  ctx.fillText('With God at the Center', CONFIG.width/2, 800);

  // Date range
  ctx.fillStyle = CONFIG.darkBurgundy;
  ctx.font = '36px "Bodoni 72"';
  ctx.fillText('1975 — 2025', CONFIG.width/2, 880);

  // Final blessing
  ctx.fillStyle = CONFIG.burgundy;
  ctx.font = 'italic 42px "Snell Roundhand"';
  ctx.fillText('Here\'s to many more years of love, faith, and family', CONFIG.width/2, 980);

  const outputPath = path.join(CONFIG.outputDir, 'cards', 'closing_title.png');
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log('✓ Closing title card generated');
  return outputPath;
}

// Get all photos and sort by file size (larger = higher quality)
function getPhotos() {
  const photosDir = CONFIG.photosDir;
  const files = fs.readdirSync(photosDir);

  const photos = files
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .map(f => {
      const filePath = path.join(photosDir, f);
      const stats = fs.statSync(filePath);
      return {
        path: filePath,
        name: f,
        size: stats.size,
        isHighQuality: stats.size > 2000000 // > 2MB = high quality
      };
    })
    .sort(() => Math.random() - 0.5); // Shuffle randomly

  console.log(`Found ${photos.length} photos`);
  console.log(`High quality: ${photos.filter(p => p.isHighQuality).length}`);
  return photos;
}

// Process a single photo with Ken Burns effect
async function processPhotoWithKenBurns(photo, index, totalPhotos) {
  const outputPath = path.join(CONFIG.outputDir, 'processed', `photo_${String(index).padStart(3, '0')}.mp4`);
  ensureDir(path.dirname(outputPath));

  const duration = photo.isHighQuality
    ? CONFIG.photoDisplayTime + CONFIG.highQualityBonus
    : CONFIG.photoDisplayTime;

  // Random Ken Burns parameters
  const zoomStart = 1.0 + Math.random() * 0.1;  // 1.0 to 1.1
  const zoomEnd = 1.1 + Math.random() * 0.15;   // 1.1 to 1.25
  const panX = (Math.random() - 0.5) * 0.1;     // -0.05 to 0.05
  const panY = (Math.random() - 0.5) * 0.1;

  // FFmpeg command for Ken Burns effect
  const ffmpegCmd = [
    'ffmpeg', '-y',
    '-loop', '1',
    '-i', `"${photo.path}"`,
    '-vf', `"scale=2880:1620,zoompan=z='${zoomStart}+(${zoomEnd-zoomStart})*on/${duration*CONFIG.fps}':x='iw/2-(iw/zoom/2)+${panX}*iw*on/${duration*CONFIG.fps}':y='ih/2-(ih/zoom/2)+${panY}*ih*on/${duration*CONFIG.fps}':d=${duration*CONFIG.fps}:s=${CONFIG.width}x${CONFIG.height}:fps=${CONFIG.fps}"`,
    '-c:v', 'libx264',
    '-t', String(duration),
    '-pix_fmt', 'yuv420p',
    `"${outputPath}"`
  ].join(' ');

  try {
    execSync(ffmpegCmd, { stdio: 'pipe' });
    console.log(`✓ Processed photo ${index + 1}/${totalPhotos}: ${photo.name} (${duration}s)`);
    return { path: outputPath, duration };
  } catch (error) {
    console.error(`✗ Error processing ${photo.name}:`, error.message);
    return null;
  }
}

// Process a title card (static image to video)
async function processCard(cardPath, duration, outputName) {
  const outputPath = path.join(CONFIG.outputDir, 'processed', outputName);
  ensureDir(path.dirname(outputPath));

  const ffmpegCmd = [
    'ffmpeg', '-y',
    '-loop', '1',
    '-i', `"${cardPath}"`,
    '-vf', `"scale=${CONFIG.width}:${CONFIG.height}:force_original_aspect_ratio=decrease,pad=${CONFIG.width}:${CONFIG.height}:(ow-iw)/2:(oh-ih)/2:color=black"`,
    '-c:v', 'libx264',
    '-t', String(duration),
    '-pix_fmt', 'yuv420p',
    '-r', String(CONFIG.fps),
    `"${outputPath}"`
  ].join(' ');

  try {
    execSync(ffmpegCmd, { stdio: 'pipe' });
    console.log(`✓ Processed card: ${outputName}`);
    return outputPath;
  } catch (error) {
    console.error(`✗ Error processing card:`, error.message);
    return null;
  }
}

// Concatenate all videos with cross-dissolve transitions
async function concatenateWithTransitions(segments) {
  const listFile = path.join(CONFIG.outputDir, 'segments.txt');
  const outputPath = path.join(CONFIG.outputDir, '50th_anniversary_slideshow_10min.mp4');

  // Create file list
  const fileList = segments.map(s => `file '${s}'`).join('\n');
  fs.writeFileSync(listFile, fileList);

  console.log('\nConcatenating segments with transitions...');

  // For simplicity, use concat demuxer first (transitions can be added with more complex filter)
  const ffmpegCmd = [
    'ffmpeg', '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', `"${listFile}"`,
    '-c:v', 'libx264',
    '-crf', '18',
    '-preset', 'medium',
    '-pix_fmt', 'yuv420p',
    `"${outputPath}"`
  ].join(' ');

  try {
    execSync(ffmpegCmd, { stdio: 'inherit' });
    console.log(`\n✓ Main slideshow created: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error concatenating:', error.message);
    return null;
  }
}

// Create 30-minute looped version
async function createLoopedVersion(inputPath) {
  const outputPath = path.join(CONFIG.outputDir, '50th_anniversary_slideshow_30min.mp4');

  console.log('\nCreating 30-minute looped version...');

  // Loop the video 3 times
  const ffmpegCmd = [
    'ffmpeg', '-y',
    '-stream_loop', '2',
    '-i', `"${inputPath}"`,
    '-c', 'copy',
    `"${outputPath}"`
  ].join(' ');

  try {
    execSync(ffmpegCmd, { stdio: 'pipe' });
    console.log(`✓ 30-minute version created: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error creating loop:', error.message);
    return null;
  }
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  50th Wedding Anniversary Video Slideshow Generator');
  console.log('  Matthew & Elizabeth Riley');
  console.log('═══════════════════════════════════════════════════════════\n');

  ensureDir(CONFIG.outputDir);
  ensureDir(path.join(CONFIG.outputDir, 'cards'));
  ensureDir(path.join(CONFIG.outputDir, 'processed'));

  // Step 1: Generate all title cards
  console.log('Step 1: Generating title cards...\n');

  const openingCard = await generateOpeningTitle();
  const childrenCard = await generateChildrenTitle();
  const closingCard = await generateClosingTitle();

  const scriptureCards = [];
  for (let i = 0; i < SCRIPTURES.length; i++) {
    const card = await generateScriptureCard(SCRIPTURES[i], i);
    scriptureCards.push(card);
  }

  // Step 2: Get and process all photos
  console.log('\nStep 2: Processing photos with Ken Burns effect...\n');

  const photos = getPhotos();
  const processedPhotos = [];

  for (let i = 0; i < photos.length; i++) {
    const result = await processPhotoWithKenBurns(photos[i], i, photos.length);
    if (result) {
      processedPhotos.push(result.path);
    }
  }

  // Step 3: Process title cards to video
  console.log('\nStep 3: Processing title cards to video...\n');

  const openingVideo = await processCard(openingCard, CONFIG.titleCardTime, 'card_opening.mp4');
  const childrenVideo = await processCard(childrenCard, CONFIG.titleCardTime, 'card_children.mp4');
  const closingVideo = await processCard(closingCard, CONFIG.titleCardTime + 2, 'card_closing.mp4');

  const scriptureVideos = [];
  for (let i = 0; i < scriptureCards.length; i++) {
    const video = await processCard(scriptureCards[i], CONFIG.scriptureCardTime, `card_scripture_${i + 1}.mp4`);
    scriptureVideos.push(video);
  }

  // Step 4: Arrange segments
  console.log('\nStep 4: Arranging slideshow sequence...\n');

  const segments = [];

  // Opening
  segments.push(openingVideo);
  segments.push(childrenVideo);

  // Intersperse photos with scripture cards
  const photosPerSection = Math.ceil(processedPhotos.length / (scriptureVideos.length + 1));

  let photoIndex = 0;
  for (let section = 0; section <= scriptureVideos.length; section++) {
    // Add photos for this section
    for (let i = 0; i < photosPerSection && photoIndex < processedPhotos.length; i++) {
      segments.push(processedPhotos[photoIndex]);
      photoIndex++;
    }

    // Add scripture card (except after last section)
    if (section < scriptureVideos.length) {
      segments.push(scriptureVideos[section]);
    }
  }

  // Closing
  segments.push(closingVideo);

  console.log(`Total segments: ${segments.length}`);

  // Step 5: Concatenate all segments
  console.log('\nStep 5: Building final video...\n');

  const finalVideo = await concatenateWithTransitions(segments.filter(s => s !== null));

  if (finalVideo) {
    // Step 6: Create 30-minute looped version
    console.log('\nStep 6: Creating extended version...\n');
    await createLoopedVersion(finalVideo);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\nOutput files:`);
    console.log(`  • 10-minute version: ${finalVideo}`);
    console.log(`  • 30-minute version: ${finalVideo.replace('10min', '30min')}`);
    console.log(`\nNote: Add your music tracks using a video editor or:`);
    console.log(`  ffmpeg -i slideshow.mp4 -i music.mp3 -c:v copy -c:a aac -shortest output.mp4`);
  }
}

main().catch(console.error);
