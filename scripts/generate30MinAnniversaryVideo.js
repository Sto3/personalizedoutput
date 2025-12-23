const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Register fonts
registerFont('/System/Library/Fonts/Supplemental/SnellRoundhand.ttc', { family: 'Snell Roundhand' });
registerFont('/System/Library/Fonts/Supplemental/Bodoni 72.ttc', { family: 'Bodoni 72' });

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  outputDir: '/Users/matthewriley/EtsyInnovations/outputs/anniversary/video30min',
  photosDir: '/Users/matthewriley/EtsyInnovations/50 Anniversary /slideshow photos/Mommy and Daddy 50',
  width: 1920,
  height: 1080,
  fps: 30,

  // Colors (matching printed materials)
  burgundy: '#8B1A1A',
  darkBurgundy: '#6B0F0F',
  gold: '#D4AF37',
  cream: '#F5E6C8',
  lightGold: '#E8D4A8',

  // Music files
  musicFiles: [
    '/Users/matthewriley/Music/Music/Media.localized/Music/Jason Nelson/The Answer/05 Forever.m4a',
    '/Users/matthewriley/Music/Music/Media.localized/Music/Kirk Franklin/Love Theory - Single/01 Love Theory.m4a',
    '/Users/matthewriley/Music/Music/Media.localized/Music/Commissioned/The Commissioned Reunion - _Live_/1-09 Everlasting Love (Live).m4a',
    '/Users/matthewriley/Music/Music/Media.localized/Music/Compilations/Bebe Winans & Cece-Greatest Hits/02 Addictive Love 1.m4a',
    '/Users/matthewriley/Music/Music/Media.localized/Music/CeCe Winans/Believe For It (Deluxe Edition)/12 Goodness of God (Live).m4a',
    '/Users/matthewriley/Music/Music/Media.localized/Music/Israel & New Breed/Project LA_ Alive in Los Angeles/11 Great Is Thy Faithfulness (feat. Charlin Moore).m4a'
  ],

  // Family details
  daddy: 'Matthew Riley Jr.',
  mommy: 'Elizabeth Riley',
  daddyNickname: 'Ral',
  mommyNickname: 'Mookie',
  children: 'Mia & Matt',
  weddingDate: 'December 20, 1975',
  celebrationDate: 'December 21, 2025'
};

// ============================================================================
// CARD CONTENT DEFINITIONS
// ============================================================================
const CARDS = {
  // Opening sequence - EXTENDED
  opening: [
    { type: 'title', lines: ['A Celebration of Love'], duration: 12 },
    { type: 'title', lines: ['Presented with love by', 'Mia & Matt'], duration: 10 },
    { type: 'title', lines: ['For Our', 'Mommy & Daddy'], duration: 10 },
    { type: 'title', lines: ['50 Years of Marriage', '50 Years of Family', '50 Years of Faith'], duration: 12 }
  ],

  // Historical context - The World in 1975 - EXTENDED
  worldIn1975: [
    { type: 'historical', lines: ['December 20, 1975...'], duration: 8 },
    { type: 'historical', lines: ['Gerald Ford was President', 'A gallon of gas cost 59 cents', 'The average home cost $39,000', 'A postage stamp was 10 cents'], duration: 18 },
    { type: 'historical', lines: ['And in Baltimore,', 'two hearts became one...'], duration: 12 }
  ],

  // Transition cards - no decade references
  transitions: [
    { title: 'A Love Story', subtitle: 'Through the Years', duration: 10 },
    { title: 'Building a Family', subtitle: 'Together', duration: 10 },
    { title: 'Growing in Grace', subtitle: 'Side by Side', duration: 10 },
    { title: 'A Legacy of Love', subtitle: 'Still Unfolding', duration: 10 }
  ],

  // Scripture cards - EXTENDED
  scriptures: [
    { text: '"Therefore shall a man leave his father\nand his mother, and shall cleave unto his wife:\nand they shall be one flesh."', ref: 'Genesis 2:24', duration: 15 },
    { text: '"Whoso findeth a wife findeth a good thing,\nand obtaineth favour of the LORD."', ref: 'Proverbs 18:22', duration: 14 },
    { text: '"Many waters cannot quench love,\nneither can the floods drown it."', ref: 'Song of Solomon 8:7', duration: 14 },
    { text: '"Who can find a virtuous woman?\nfor her price is far above rubies."', ref: 'Proverbs 31:10', duration: 14 },
    { text: '"Two are better than one...\na cord of three strands\nis not quickly broken."', ref: 'Ecclesiastes 4:9, 12', duration: 14 },
    { text: '"What therefore God hath joined together,\nlet not man put asunder."', ref: 'Mark 10:9', duration: 14 },
    { text: '"Whither thou goest, I will go;\nand where thou lodgest, I will lodge:\nthy people shall be my people,\nand thy God my God."', ref: 'Ruth 1:16', duration: 15 }
  ],

  // 1 Corinthians 13 - extended passage - EXTENDED
  corinthians13: [
    { text: '"Charity suffereth long, and is kind;\ncharity envieth not;\ncharity vaunteth not itself,\nis not puffed up..."', ref: '1 Corinthians 13:4', duration: 15 },
    { text: '"Doth not behave itself unseemly,\nseeketh not her own,\nis not easily provoked,\nthinketh no evil..."', ref: '1 Corinthians 13:5', duration: 15 },
    { text: '"Rejoiceth not in iniquity,\nbut rejoiceth in the truth..."', ref: '1 Corinthians 13:6', duration: 12 },
    { text: '"Beareth all things, believeth all things,\nhopeth all things, endureth all things.\nCharity never faileth."', ref: '1 Corinthians 13:7-8', duration: 15 }
  ],

  // Messages from the children - EXTENDED
  childrenMessages: [
    { lines: ['Mommy & Daddy,', '', 'Watching your love has taught us', 'what marriage really means.', '', '— Mia & Matt'], duration: 20 },
    { lines: ['Daddy, you showed us', 'how a man loves his family.', '', 'Mommy, you showed us', 'what strength and grace look like.', '', '— Your Children'], duration: 22 },
    { lines: ['We are who we are', 'because of the love you gave us.', '', 'Thank you for showing us', 'God\'s love through your own.', '', 'We love you, Mommy.', 'We love you, Daddy.', '', '— Mia & Matt'], duration: 28 }
  ],

  // "50 Years of..." reflection cards - EXTENDED
  fiftyYearsOf: [
    { text: '50 Years of Faithfulness', duration: 12 },
    { text: '50 Years of Partnership', duration: 12 },
    { text: '50 Years of Ministry Together', duration: 12 },
    { text: '50 Years of Family', duration: 12 },
    { text: '50 Years of Prayer', duration: 12 },
    { text: '50 Years of God\'s Grace', duration: 12 }
  ],

  // Terms of Endearment card - EXTENDED
  nicknames: {
    lines: [
      'In this family...',
      '',
      'She calls him "Ral"',
      'He calls her "Mookie"',
      '',
      'Matthew Mister... Egghead... Image',
      'Pooh... Muffin',
      '',
      'Names only family knows.'
    ],
    duration: 25
  },

  // Hymn lyrics
  hymnLyrics: {
    lines: [
      'Great is Thy faithfulness,',
      'O God our Father;',
      'There is no shadow',
      'of turning with Thee...'
    ],
    duration: 18
  },

  // Final message from children - EXTENDED
  finalMessage: [
    { lines: ['Mommy & Daddy,', '', '50 years ago,', 'God joined your hearts together.'], duration: 15 },
    { lines: ['And from that love,', 'He gave us everything.', '', 'We thank God for you every day.'], duration: 15 },
    { lines: ['Here\'s to 50 more years', 'of love, laughter, and blessings.', '', 'We love you forever.', '', '— Your Children,', 'Mia & Matt'], duration: 22 }
  ],

  // Closing sequence - EXTENDED
  closing: [
    { type: 'closing', lines: ['Celebrating 50 Years of Love'], duration: 12 },
    { type: 'closing', lines: ['Pastor Matthew Riley Jr.', '&', 'First Lady Elizabeth Riley'], duration: 14 },
    { type: 'closing', lines: ['December 20, 1975', '—', 'December 21, 2025'], duration: 12 },
    { type: 'closing', lines: ['With all our love,', 'Mia & Matt'], duration: 14 }
  ]
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function drawBackground(ctx, width, height) {
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, CONFIG.cream);
  bgGradient.addColorStop(0.3, CONFIG.lightGold);
  bgGradient.addColorStop(0.5, CONFIG.gold);
  bgGradient.addColorStop(0.7, CONFIG.lightGold);
  bgGradient.addColorStop(1, CONFIG.cream);
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  const radialGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, height/1.2);
  radialGradient.addColorStop(0, 'rgba(255, 250, 240, 0.35)');
  radialGradient.addColorStop(0.5, 'rgba(255, 250, 240, 0.15)');
  radialGradient.addColorStop(1, 'rgba(180, 150, 100, 0.2)');
  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const alpha = Math.random() * 0.03;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawBorder(ctx, width, height) {
  ctx.strokeStyle = CONFIG.burgundy;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, width - 12, height - 12);
  ctx.strokeStyle = CONFIG.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, width - 40, height - 40);
}

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

function drawDecorativeLine(ctx, y, width) {
  ctx.strokeStyle = CONFIG.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.15, y);
  ctx.lineTo(width * 0.42, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.58, y);
  ctx.lineTo(width * 0.85, y);
  ctx.stroke();
  drawDiamond(ctx, width/2, y, 10);
}

// ============================================================================
// CARD GENERATION FUNCTIONS
// ============================================================================
async function generateTitleCard(lines, filename, duration = 8) {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, CONFIG.width, CONFIG.height);
  drawBorder(ctx, CONFIG.width, CONFIG.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.burgundy;

  const totalHeight = lines.length * 80;
  let y = (CONFIG.height - totalHeight) / 2;

  for (const line of lines) {
    if (line.includes('Mommy') || line.includes('Daddy') || line.includes('Mia') || line.includes('Matt')) {
      ctx.font = 'bold italic 72px "Snell Roundhand"';
    } else if (line.includes('50 Years')) {
      ctx.font = '58px "Bodoni 72"';
    } else {
      ctx.font = 'italic 65px "Snell Roundhand"';
    }
    ctx.fillText(line, CONFIG.width/2, y);
    y += 85;
  }

  const outputPath = path.join(CONFIG.outputDir, 'cards', filename);
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  return { path: outputPath, duration };
}

async function generateScriptureCard(scripture, index) {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, CONFIG.width, CONFIG.height);
  drawBorder(ctx, CONFIG.width, CONFIG.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.burgundy;
  ctx.font = 'italic 48px "Snell Roundhand"';

  const lines = scripture.text.split('\n');
  const lineHeight = 70;
  const startY = CONFIG.height/2 - (lines.length * lineHeight) / 2 - 30;

  lines.forEach((line, i) => {
    ctx.fillText(line, CONFIG.width/2, startY + (i * lineHeight));
  });

  const refY = startY + (lines.length * lineHeight) + 50;
  drawDecorativeLine(ctx, refY, CONFIG.width);

  ctx.fillStyle = CONFIG.darkBurgundy;
  ctx.font = '32px "Bodoni 72"';
  ctx.fillText('— ' + scripture.ref, CONFIG.width/2, refY + 60);

  const outputPath = path.join(CONFIG.outputDir, 'cards', `scripture_${index}.png`);
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  return { path: outputPath, duration: scripture.duration };
}

async function generateHistoricalCard(lines, index) {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  // Darker, more nostalgic background for historical context
  const bgGradient = ctx.createLinearGradient(0, 0, CONFIG.width, CONFIG.height);
  bgGradient.addColorStop(0, '#2C1810');
  bgGradient.addColorStop(0.5, '#3D2317');
  bgGradient.addColorStop(1, '#2C1810');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  // Vignette effect
  const radialGradient = ctx.createRadialGradient(CONFIG.width/2, CONFIG.height/2, 0, CONFIG.width/2, CONFIG.height/2, CONFIG.height);
  radialGradient.addColorStop(0, 'rgba(60, 40, 30, 0)');
  radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  ctx.strokeStyle = CONFIG.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, CONFIG.width - 60, CONFIG.height - 60);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.gold;

  const totalHeight = lines.length * 70;
  let y = (CONFIG.height - totalHeight) / 2;

  for (const line of lines) {
    if (line.includes('December') || line.includes('Baltimore')) {
      ctx.font = 'italic 55px "Snell Roundhand"';
    } else {
      ctx.font = '42px "Bodoni 72"';
    }
    ctx.fillText(line, CONFIG.width/2, y);
    y += 75;
  }

  const outputPath = path.join(CONFIG.outputDir, 'cards', `historical_${index}.png`);
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  return outputPath;
}

async function generateTransitionCard(info, index) {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, CONFIG.width, CONFIG.height);
  drawBorder(ctx, CONFIG.width, CONFIG.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.fillStyle = CONFIG.burgundy;
  ctx.font = 'italic 90px "Snell Roundhand"';
  ctx.fillText(info.title, CONFIG.width/2, CONFIG.height/2 - 50);

  // Decorative line
  drawDecorativeLine(ctx, CONFIG.height/2 + 30, CONFIG.width);

  // Subtitle
  ctx.font = 'italic 55px "Snell Roundhand"';
  ctx.fillText(info.subtitle, CONFIG.width/2, CONFIG.height/2 + 100);

  const outputPath = path.join(CONFIG.outputDir, 'cards', `transition_${index}.png`);
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  return { path: outputPath, duration: info.duration };
}

async function generateFiftyYearsCard(text, index) {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, CONFIG.width, CONFIG.height);
  drawBorder(ctx, CONFIG.width, CONFIG.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.burgundy;
  ctx.font = '85px "Bodoni 72"';
  ctx.fillText(text, CONFIG.width/2, CONFIG.height/2);

  // Decorative elements above and below
  drawDecorativeLine(ctx, CONFIG.height/2 - 80, CONFIG.width);
  drawDecorativeLine(ctx, CONFIG.height/2 + 80, CONFIG.width);

  const outputPath = path.join(CONFIG.outputDir, 'cards', `fifty_years_${index}.png`);
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  return outputPath;
}

async function generateChildrenMessageCard(messageObj, index) {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, CONFIG.width, CONFIG.height);
  drawBorder(ctx, CONFIG.width, CONFIG.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = messageObj.lines;
  const lineHeight = 60;
  const totalHeight = lines.filter(l => l !== '').length * lineHeight;
  let y = (CONFIG.height - totalHeight) / 2;

  for (const line of lines) {
    if (line === '') {
      y += 30;
      continue;
    }
    if (line.startsWith('—') || line.includes('Mia') || line.includes('Matt') || line.includes('Children')) {
      ctx.fillStyle = CONFIG.darkBurgundy;
      ctx.font = 'italic 45px "Snell Roundhand"';
    } else if (line.includes('Mommy') || line.includes('Daddy')) {
      ctx.fillStyle = CONFIG.burgundy;
      ctx.font = 'bold italic 55px "Snell Roundhand"';
    } else {
      ctx.fillStyle = CONFIG.burgundy;
      ctx.font = 'italic 50px "Snell Roundhand"';
    }
    ctx.fillText(line, CONFIG.width/2, y);
    y += lineHeight;
  }

  const outputPath = path.join(CONFIG.outputDir, 'cards', `children_message_${index}.png`);
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  return { path: outputPath, duration: messageObj.duration };
}

async function generateNicknamesCard() {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, CONFIG.width, CONFIG.height);
  drawBorder(ctx, CONFIG.width, CONFIG.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = CARDS.nicknames.lines;
  const lineHeight = 55;
  let y = 180;

  for (const line of lines) {
    if (line === '') {
      y += 25;
      continue;
    }
    if (line.includes('In this family')) {
      ctx.fillStyle = CONFIG.burgundy;
      ctx.font = 'italic 60px "Snell Roundhand"';
    } else if (line.includes('Ral') || line.includes('Mookie')) {
      ctx.fillStyle = CONFIG.burgundy;
      ctx.font = 'italic 50px "Snell Roundhand"';
    } else if (line.includes('Names only')) {
      ctx.fillStyle = CONFIG.darkBurgundy;
      ctx.font = 'italic 42px "Snell Roundhand"';
    } else {
      ctx.fillStyle = CONFIG.darkBurgundy;
      ctx.font = '38px "Bodoni 72"';
    }
    ctx.fillText(line, CONFIG.width/2, y);
    y += lineHeight;
  }

  const outputPath = path.join(CONFIG.outputDir, 'cards', 'nicknames.png');
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  return { path: outputPath, duration: CARDS.nicknames.duration };
}

async function generateClosingCard(lines, index) {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, CONFIG.width, CONFIG.height);
  drawBorder(ctx, CONFIG.width, CONFIG.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lineHeight = 75;
  const totalHeight = lines.length * lineHeight;
  let y = (CONFIG.height - totalHeight) / 2;

  for (const line of lines) {
    if (line === '&' || line === '—') {
      ctx.fillStyle = CONFIG.gold;
      ctx.font = '50px "Bodoni 72"';
    } else if (line.includes('Pastor') || line.includes('First Lady')) {
      ctx.fillStyle = CONFIG.burgundy;
      ctx.font = 'bold italic 65px "Snell Roundhand"';
    } else if (line.includes('Celebrating')) {
      ctx.fillStyle = CONFIG.burgundy;
      ctx.font = '80px "Bodoni 72"';
    } else if (line.includes('December') || line.includes('1975') || line.includes('2025')) {
      ctx.fillStyle = CONFIG.darkBurgundy;
      ctx.font = '45px "Bodoni 72"';
    } else {
      ctx.fillStyle = CONFIG.burgundy;
      ctx.font = 'italic 55px "Snell Roundhand"';
    }
    ctx.fillText(line, CONFIG.width/2, y);
    y += lineHeight;
  }

  const outputPath = path.join(CONFIG.outputDir, 'cards', `closing_${index}.png`);
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  return outputPath;
}

// ============================================================================
// PHOTO PROCESSING
// ============================================================================
function getPhotoInfo(photoPath) {
  try {
    const stats = fs.statSync(photoPath);
    const ext = path.extname(photoPath).toLowerCase();

    // Try to get image dimensions
    let width = 0, height = 0;
    try {
      const result = execSync(`sips -g pixelWidth -g pixelHeight "${photoPath}" 2>/dev/null`, { encoding: 'utf8' });
      const widthMatch = result.match(/pixelWidth:\s*(\d+)/);
      const heightMatch = result.match(/pixelHeight:\s*(\d+)/);
      if (widthMatch) width = parseInt(widthMatch[1]);
      if (heightMatch) height = parseInt(heightMatch[1]);
    } catch (e) {}

    return {
      path: photoPath,
      name: path.basename(photoPath),
      size: stats.size,
      width,
      height,
      quality: stats.size > 2000000 ? 'high' : stats.size > 500000 ? 'medium' : 'low',
      megapixels: (width * height) / 1000000
    };
  } catch (e) {
    return null;
  }
}

async function processPhotoWithKenBurns(photo, index, totalPhotos) {
  const outputPath = path.join(CONFIG.outputDir, 'processed', `photo_${String(index).padStart(3, '0')}.mp4`);
  ensureDir(path.dirname(outputPath));

  // Duration based on quality - EXTENDED for 30 min video
  let duration;
  if (photo.quality === 'high') {
    duration = 35;  // Was 18
  } else if (photo.quality === 'medium') {
    duration = 28;  // Was 14
  } else {
    duration = 22;  // Was 10
  }

  // NO Ken Burns - static photos only for safety
  // Proper scaling: fit image to frame with elegant gold padding if needed
  // Using warm gold/cream color (#E8D4A8) for padding to match the elegant theme
  const ffmpegCmd = `ffmpeg -y -loop 1 -i "${photo.path}" -vf "scale=${CONFIG.width}:${CONFIG.height}:force_original_aspect_ratio=decrease,pad=${CONFIG.width}:${CONFIG.height}:(ow-iw)/2:(oh-ih)/2:color=0xE8D4A8" -c:v libx264 -t ${duration} -pix_fmt yuv420p -r ${CONFIG.fps} "${outputPath}" 2>/dev/null`;

  try {
    execSync(ffmpegCmd, { stdio: 'pipe' });
    console.log(`✓ Photo ${index + 1}/${totalPhotos}: ${photo.name} (${duration}s, ${photo.quality} quality)`);
    return { path: outputPath, duration };
  } catch (error) {
    console.error(`✗ Error processing ${photo.name}`);
    return null;
  }
}

async function processCardToVideo(cardPath, duration, outputName) {
  const outputPath = path.join(CONFIG.outputDir, 'processed', outputName);
  ensureDir(path.dirname(outputPath));

  const ffmpegCmd = `ffmpeg -y -loop 1 -i "${cardPath}" -vf "scale=${CONFIG.width}:${CONFIG.height}:force_original_aspect_ratio=decrease,pad=${CONFIG.width}:${CONFIG.height}:(ow-iw)/2:(oh-ih)/2:color=black" -c:v libx264 -t ${duration} -pix_fmt yuv420p -r ${CONFIG.fps} "${outputPath}" 2>/dev/null`;

  try {
    execSync(ffmpegCmd, { stdio: 'pipe' });
    return outputPath;
  } catch (error) {
    console.error(`Error processing card: ${outputName}`);
    return null;
  }
}

// ============================================================================
// MUSIC PROCESSING
// ============================================================================
async function createMusicTrack() {
  const outputPath = path.join(CONFIG.outputDir, 'music_mixed.m4a');

  console.log('\n📀 Creating music track with crossfades...\n');

  // Build complex filter for crossfading
  let inputs = '';
  let filterComplex = '';

  CONFIG.musicFiles.forEach((file, i) => {
    inputs += `-i "${file}" `;
  });

  // Create crossfade filter chain
  // Each crossfade is 3 seconds
  const crossfadeDuration = 3;

  // For 6 tracks, we need to chain them together
  filterComplex = `[0:a]afade=t=in:st=0:d=2[a0];`;
  filterComplex += `[1:a]afade=t=in:st=0:d=1[a1];`;
  filterComplex += `[2:a]afade=t=in:st=0:d=1[a2];`;
  filterComplex += `[3:a]afade=t=in:st=0:d=1[a3];`;
  filterComplex += `[4:a]afade=t=in:st=0:d=1[a4];`;
  filterComplex += `[5:a]afade=t=in:st=0:d=1,afade=t=out:st=105:d=4[a5];`;
  filterComplex += `[a0][a1]acrossfade=d=${crossfadeDuration}:c1=tri:c2=tri[m1];`;
  filterComplex += `[m1][a2]acrossfade=d=${crossfadeDuration}:c1=tri:c2=tri[m2];`;
  filterComplex += `[m2][a3]acrossfade=d=${crossfadeDuration}:c1=tri:c2=tri[m3];`;
  filterComplex += `[m3][a4]acrossfade=d=${crossfadeDuration}:c1=tri:c2=tri[m4];`;
  filterComplex += `[m4][a5]acrossfade=d=${crossfadeDuration}:c1=tri:c2=tri[out]`;

  const ffmpegCmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[out]" -c:a aac -b:a 256k "${outputPath}" 2>/dev/null`;

  try {
    execSync(ffmpegCmd, { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 });
    console.log('✓ Music track created with crossfades');
    return outputPath;
  } catch (error) {
    console.error('Error creating music track, trying simple concatenation...');

    // Fallback: simple concatenation
    const listFile = path.join(CONFIG.outputDir, 'music_list.txt');
    const list = CONFIG.musicFiles.map(f => `file '${f}'`).join('\n');
    fs.writeFileSync(listFile, list);

    const simpleConcatCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:a aac -b:a 256k "${outputPath}" 2>/dev/null`;
    execSync(simpleConcatCmd, { stdio: 'pipe' });
    console.log('✓ Music track created (simple concatenation)');
    return outputPath;
  }
}

// ============================================================================
// MAIN ASSEMBLY
// ============================================================================
async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  50th Wedding Anniversary Video - 30 Minute Edition');
  console.log('  A Love Letter from Mia & Matt to Mommy & Daddy');
  console.log('  Matthew Riley Jr. & Elizabeth Riley');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  ensureDir(CONFIG.outputDir);
  ensureDir(path.join(CONFIG.outputDir, 'cards'));
  ensureDir(path.join(CONFIG.outputDir, 'processed'));

  const segments = [];

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Generate all cards
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 1: Generating title cards...\n');

  // Opening sequence
  for (let i = 0; i < CARDS.opening.length; i++) {
    const card = CARDS.opening[i];
    const result = await generateTitleCard(card.lines, `opening_${i}.png`, card.duration);
    const video = await processCardToVideo(result.path, result.duration, `opening_${i}.mp4`);
    if (video) segments.push({ path: video, section: 'opening' });
    console.log(`✓ Opening card ${i + 1}`);
  }

  // Historical context
  for (let i = 0; i < CARDS.worldIn1975.length; i++) {
    const card = CARDS.worldIn1975[i];
    const cardPath = await generateHistoricalCard(card.lines, i);
    const video = await processCardToVideo(cardPath, card.duration, `historical_${i}.mp4`);
    if (video) segments.push({ path: video, section: 'historical' });
    console.log(`✓ Historical card ${i + 1}`);
  }

  // Scripture cards
  for (let i = 0; i < CARDS.scriptures.length; i++) {
    const result = await generateScriptureCard(CARDS.scriptures[i], i);
    const video = await processCardToVideo(result.path, result.duration, `scripture_${i}.mp4`);
    if (video) segments.push({ path: video, section: 'scripture', index: i });
    console.log(`✓ Scripture card ${i + 1}`);
  }

  // 1 Corinthians 13 cards
  for (let i = 0; i < CARDS.corinthians13.length; i++) {
    const result = await generateScriptureCard(CARDS.corinthians13[i], `cor13_${i}`);
    const video = await processCardToVideo(result.path, result.duration, `corinthians_${i}.mp4`);
    if (video) segments.push({ path: video, section: 'corinthians', index: i });
    console.log(`✓ 1 Corinthians 13 card ${i + 1}`);
  }

  // Transition cards (no decade references)
  for (let i = 0; i < CARDS.transitions.length; i++) {
    const info = CARDS.transitions[i];
    const result = await generateTransitionCard(info, i);
    const video = await processCardToVideo(result.path, result.duration, `transition_${i}.mp4`);
    if (video) segments.push({ path: video, section: 'transition', index: i });
    console.log(`✓ Transition card: ${info.title}`);
  }

  // 50 Years of... cards
  for (let i = 0; i < CARDS.fiftyYearsOf.length; i++) {
    const card = CARDS.fiftyYearsOf[i];
    const cardPath = await generateFiftyYearsCard(card.text, i);
    const video = await processCardToVideo(cardPath, card.duration, `fifty_years_${i}.mp4`);
    if (video) segments.push({ path: video, section: 'fifty_years', index: i });
    console.log(`✓ "50 Years of..." card ${i + 1}`);
  }

  // Children's messages
  for (let i = 0; i < CARDS.childrenMessages.length; i++) {
    const result = await generateChildrenMessageCard(CARDS.childrenMessages[i], i);
    const video = await processCardToVideo(result.path, result.duration, `children_msg_${i}.mp4`);
    if (video) segments.push({ path: video, section: 'children_message', index: i });
    console.log(`✓ Children's message ${i + 1}`);
  }

  // Nicknames card
  const nicknamesResult = await generateNicknamesCard();
  const nicknamesVideo = await processCardToVideo(nicknamesResult.path, nicknamesResult.duration, 'nicknames.mp4');
  if (nicknamesVideo) segments.push({ path: nicknamesVideo, section: 'nicknames' });
  console.log('✓ Nicknames card');

  // Final message cards
  for (let i = 0; i < CARDS.finalMessage.length; i++) {
    const result = await generateChildrenMessageCard(CARDS.finalMessage[i], `final_${i}`);
    const video = await processCardToVideo(result.path, result.duration, `final_msg_${i}.mp4`);
    if (video) segments.push({ path: video, section: 'final_message', index: i });
    console.log(`✓ Final message card ${i + 1}`);
  }

  // Closing sequence
  for (let i = 0; i < CARDS.closing.length; i++) {
    const card = CARDS.closing[i];
    const cardPath = await generateClosingCard(card.lines, i);
    const video = await processCardToVideo(cardPath, card.duration, `closing_${i}.mp4`);
    if (video) segments.push({ path: video, section: 'closing', index: i });
    console.log(`✓ Closing card ${i + 1}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Process photos
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────────');
  console.log('Step 2: Processing photos...\n');

  const photoFiles = fs.readdirSync(CONFIG.photosDir)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort() // Sort alphabetically/numerically for consistent order
    .map(f => getPhotoInfo(path.join(CONFIG.photosDir, f)))
    .filter(p => p !== null);

  console.log(`Found ${photoFiles.length} photos\n`);

  const processedPhotos = [];
  for (let i = 0; i < photoFiles.length; i++) {
    const result = await processPhotoWithKenBurns(photoFiles[i], i, photoFiles.length);
    if (result) {
      processedPhotos.push(result.path);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Assemble video in narrative order
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────────');
  console.log('Step 3: Assembling video in narrative order...\n');

  const finalSequence = [];

  // Opening cards
  segments.filter(s => s.section === 'opening').forEach(s => finalSequence.push(s.path));

  // Historical context
  segments.filter(s => s.section === 'historical').forEach(s => finalSequence.push(s.path));

  // Scripture 1 (Genesis - marriage foundation)
  const scripture1 = segments.find(s => s.section === 'scripture' && s.index === 0);
  if (scripture1) finalSequence.push(scripture1.path);

  // Divide photos into 4 groups to intersperse with content
  const photosPerGroup = Math.ceil(processedPhotos.length / 4);
  const photoGroups = [
    processedPhotos.slice(0, photosPerGroup),
    processedPhotos.slice(photosPerGroup, photosPerGroup * 2),
    processedPhotos.slice(photosPerGroup * 2, photosPerGroup * 3),
    processedPhotos.slice(photosPerGroup * 3)
  ];

  // === SECTION 1: A Love Story ===
  const transition1 = segments.find(s => s.section === 'transition' && s.index === 0);
  if (transition1) finalSequence.push(transition1.path);
  photoGroups[0].forEach(p => finalSequence.push(p));

  // Children's message 1
  const childMsg1 = segments.find(s => s.section === 'children_message' && s.index === 0);
  if (childMsg1) finalSequence.push(childMsg1.path);

  // 50 Years of Faithfulness
  const fifty1 = segments.find(s => s.section === 'fifty_years' && s.index === 0);
  if (fifty1) finalSequence.push(fifty1.path);

  // Scripture 2 (Proverbs - finding a wife)
  const scripture2 = segments.find(s => s.section === 'scripture' && s.index === 1);
  if (scripture2) finalSequence.push(scripture2.path);

  // === SECTION 2: Building a Family ===
  const transition2 = segments.find(s => s.section === 'transition' && s.index === 1);
  if (transition2) finalSequence.push(transition2.path);
  photoGroups[1].forEach(p => finalSequence.push(p));

  // 50 Years of Partnership
  const fifty2 = segments.find(s => s.section === 'fifty_years' && s.index === 1);
  if (fifty2) finalSequence.push(fifty2.path);

  // Scripture 3 (Song of Solomon - love)
  const scripture3 = segments.find(s => s.section === 'scripture' && s.index === 2);
  if (scripture3) finalSequence.push(scripture3.path);

  // Children's message 2
  const childMsg2 = segments.find(s => s.section === 'children_message' && s.index === 1);
  if (childMsg2) finalSequence.push(childMsg2.path);

  // 50 Years of Ministry Together
  const fifty3 = segments.find(s => s.section === 'fifty_years' && s.index === 2);
  if (fifty3) finalSequence.push(fifty3.path);

  // === SECTION 3: Growing in Grace ===
  const transition3 = segments.find(s => s.section === 'transition' && s.index === 2);
  if (transition3) finalSequence.push(transition3.path);

  // Scripture 4 (Proverbs 31 - virtuous woman)
  const scripture4 = segments.find(s => s.section === 'scripture' && s.index === 3);
  if (scripture4) finalSequence.push(scripture4.path);
  photoGroups[2].forEach(p => finalSequence.push(p));

  // Nicknames card
  const nicknamesSegment = segments.find(s => s.section === 'nicknames');
  if (nicknamesSegment) finalSequence.push(nicknamesSegment.path);

  // 50 Years of Family
  const fifty4 = segments.find(s => s.section === 'fifty_years' && s.index === 3);
  if (fifty4) finalSequence.push(fifty4.path);

  // 1 Corinthians 13 extended passage
  segments.filter(s => s.section === 'corinthians').forEach(s => finalSequence.push(s.path));

  // === SECTION 4: A Legacy of Love ===
  const transition4 = segments.find(s => s.section === 'transition' && s.index === 3);
  if (transition4) finalSequence.push(transition4.path);
  photoGroups[3].forEach(p => finalSequence.push(p));

  // Children's message 3
  const childMsg3 = segments.find(s => s.section === 'children_message' && s.index === 2);
  if (childMsg3) finalSequence.push(childMsg3.path);

  // 50 Years of Prayer
  const fifty5 = segments.find(s => s.section === 'fifty_years' && s.index === 4);
  if (fifty5) finalSequence.push(fifty5.path);

  // Scripture 5 (Ecclesiastes - two are better than one)
  const scripture5 = segments.find(s => s.section === 'scripture' && s.index === 4);
  if (scripture5) finalSequence.push(scripture5.path);

  // Scripture 6 (Mark - what God joined together)
  const scripture6 = segments.find(s => s.section === 'scripture' && s.index === 5);
  if (scripture6) finalSequence.push(scripture6.path);

  // 50 Years of God's Grace
  const fifty6 = segments.find(s => s.section === 'fifty_years' && s.index === 5);
  if (fifty6) finalSequence.push(fifty6.path);

  // Final messages from children
  segments.filter(s => s.section === 'final_message').forEach(s => finalSequence.push(s.path));

  // Closing sequence
  segments.filter(s => s.section === 'closing').forEach(s => finalSequence.push(s.path));

  console.log(`Total segments: ${finalSequence.length}`);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Concatenate video
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────────');
  console.log('Step 4: Building video (no audio)...\n');

  const listFile = path.join(CONFIG.outputDir, 'segments.txt');
  const fileList = finalSequence.map(s => `file '${s}'`).join('\n');
  fs.writeFileSync(listFile, fileList);

  const videoOnlyPath = path.join(CONFIG.outputDir, '50th_anniversary_video_only.mp4');

  const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p "${videoOnlyPath}"`;

  console.log('Concatenating video segments...');
  execSync(concatCmd, { stdio: 'inherit' });
  console.log('✓ Video assembled');

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: Create music track
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────────');
  console.log('Step 5: Processing music...\n');

  const musicPath = await createMusicTrack();

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 6: Combine video and audio
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────────');
  console.log('Step 6: Combining video and music...\n');

  const finalPath = path.join(CONFIG.outputDir, '50th_Anniversary_MiaAndMatt_ToMommyAndDaddy.mp4');

  const combineCmd = `ffmpeg -y -i "${videoOnlyPath}" -i "${musicPath}" -c:v copy -c:a aac -b:a 256k -shortest "${finalPath}"`;

  execSync(combineCmd, { stdio: 'pipe' });
  console.log('✓ Final video created with music');

  // Get final duration
  const durationResult = execSync(`ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalPath}"`, { encoding: 'utf8' });
  const finalDuration = parseFloat(durationResult);
  const minutes = Math.floor(finalDuration / 60);
  const seconds = Math.floor(finalDuration % 60);

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`\n✓ Final video: ${finalPath}`);
  console.log(`✓ Duration: ${minutes}:${String(seconds).padStart(2, '0')}`);
  console.log(`\nThis video is a love letter from Mia & Matt to their Mommy & Daddy,`);
  console.log(`celebrating 50 years of marriage, faith, and family.`);
  console.log('\n═══════════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
