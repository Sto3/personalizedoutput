/**
 * Santa Video Batch Generator V2
 * FIXES:
 * 1. Replace Marcus with Elijah (nobody notices kindness)
 * 2. Sofia - clearer script
 * 3. James - "celebrate him" not "help", regenerate audio
 * 4. Lily - better cut point
 * 5. ALL voices use IDENTICAL settings (same as Emma)
 */

require('dotenv').config();
const { createCanvas, registerFont } = require('canvas');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================
// FONT REGISTRATION
// ============================================================

try {
  registerFont('/System/Library/Fonts/Supplemental/Bodoni 72 Smallcaps Book.ttf', {
    family: 'Bodoni 72 Smallcaps',
    weight: 'normal'
  });
  console.log('✓ Bodoni 72 Smallcaps registered');
} catch (e) {
  console.log('⚠ Bodoni font not found, using Georgia fallback');
}

// ============================================================
// CONFIGURATION
// ============================================================

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

const PROJECT_ROOT = '/Users/matthewriley/EtsyInnovations';
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'outputs/social-campaign-v2/santa');
const FINAL_VIDEOS_DIR = path.join(OUTPUT_DIR, 'final-videos');
const AUDIO_DIR = path.join(OUTPUT_DIR, 'audio');

// ElevenLabs settings - EXACT SAME AS EMMA (from santa_voice_prototype.json)
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const SANTA_VOICE_SETTINGS = {
  stability: 0.68,
  similarity_boost: 0.82,
  style: 0.32,
  use_speaker_boost: true
};

// ============================================================
// VIDEO CONFIGURATIONS - FIXED
// ============================================================

const VIDEOS = [
  // VIDEO 2: Elijah - Nobody Notices When He's Kind (REPLACES MARCUS)
  {
    id: '02',
    name: 'elijah',
    filename: '02_elijah_nobody_notices_kindness.mp4',
    childName: 'Elijah',
    pronoun: 'him',
    possessive: 'His',
    hookText: "Elijah thinks nobody notices when he's kind",
    buildText: 'His mom asked Santa for help',
    santaLabelText: "Elijah's Personalized Santa Message",
    colors: {
      darkStart: [30, 15, 40],      // Deep purple
      darkEnd: [20, 10, 30],
      warmStart: [60, 30, 50],      // Warm plum
      warmEnd: [45, 20, 40]
    },
    sparkleColor: [255, 215, 0],    // Gold
    santaScript: `Ho ho ho, Elijah. This is Santa Claus. I need to tell you something very important. I see you, Elijah. I see every single act of kindness you do. When you hold the door for someone. When you share your snacks. When you help a classmate who's struggling. I see all of it. And Elijah, here's what I want you to know. Kindness doesn't need an audience. The most powerful kindness is the kind you do when no one is watching. Because that's when you know it comes from your heart. You asked your mom why you should be nice if nobody cares. But Elijah, I care. And more importantly, every person you've been kind to felt it. You made their day better. The world needs more people like you, Elijah. Don't ever stop being kind.`,
    cutDuration: 23
  },

  // VIDEO 3: Sofia - CLEARER SCRIPT
  {
    id: '03',
    name: 'sofia',
    filename: '03_sofia_not_smart_enough.mp4',
    childName: 'Sofia',
    pronoun: 'her',
    possessive: 'Her',
    hookText: "Sofia is scared she's not smart enough",
    buildText: 'Her mom asked Santa for help',
    santaLabelText: "Sofia's Personalized Santa Message",
    colors: {
      darkStart: [15, 35, 25],      // Forest green
      darkEnd: [10, 25, 18],
      warmStart: [30, 60, 45],      // Warm emerald
      warmEnd: [20, 50, 35]
    },
    sparkleColor: [192, 192, 192],  // Silver
    santaScript: `Ho ho ho, Sofia. This is Santa Claus. I've been watching you all year, and I need to tell you something very important. Sofia, being smart is not about being the fastest. It's not about getting everything right on the first try. Do you know what being smart really means? It means trying again when something is hard. It means not giving up. And Sofia, that is exactly what you do. I see how hard you work on your reading. I see you practice even when it feels frustrating. That never-give-up spirit you have? That is your superpower. Some children quit when things get difficult. Not you, Sofia. You keep going. And that makes you one of the smartest, bravest children I know.`,
    cutDuration: 24.5
  },

  // VIDEO 4: James - "CELEBRATE HIM" + regenerate audio
  {
    id: '04',
    name: 'james',
    filename: '04_james_protecting_sister.mp4',
    childName: 'James',
    pronoun: 'him',
    possessive: 'His',
    hookText: 'James has been protecting his little sister',
    buildText: 'His mom asked Santa to celebrate him',  // FIXED
    santaLabelText: "James's Personalized Santa Message",
    colors: {
      darkStart: [15, 20, 40],      // Midnight blue
      darkEnd: [10, 15, 30],
      warmStart: [20, 50, 55],      // Deep teal
      warmEnd: [15, 40, 45]
    },
    sparkleColor: [100, 180, 255],  // Blue
    santaScript: `Ho ho ho, James. It's Santa Claus. Your mom told me what you did for your little sister, and I had to come talk to you myself. James, what you did took real courage. Standing up for someone you love, even when you're scared? That's what heroes do. Being brave doesn't mean you're not afraid. It means you do the right thing even when you are afraid. And that's exactly what you did. Protectors like you are rare and special, James. Your little sister is so lucky to have a big brother who loves her enough to stand up for her. That kind of love, that kind of bravery, that's a gift. I am so proud of you, James.`,
    cutDuration: 21.5
  },

  // VIDEO 5: Lily - BETTER CUT POINT
  {
    id: '05',
    name: 'lily',
    filename: '05_lily_just_moved.mp4',
    childName: 'Lily',
    pronoun: 'her',
    possessive: 'Her',
    hookText: 'Lily just moved and has no friends yet',
    buildText: 'Her mom asked Santa for help',
    santaLabelText: "Lily's Personalized Santa Message",
    colors: {
      darkStart: [35, 30, 35],      // Charcoal
      darkEnd: [25, 22, 25],
      warmStart: [70, 45, 55],      // Warm rose
      warmEnd: [55, 35, 45]
    },
    sparkleColor: [255, 180, 200],  // Pink
    santaScript: `Ho ho ho, Lily. This is Santa Claus. I know that moving to a new place has been really, really hard. Leaving your best friend behind, starting at a new school where you don't know anyone. That takes so much bravery, Lily. And I see how brave you've been. I know some days feel lonely. I know you miss your old home and your old friends. But Lily, I want you to know something important. The right friends are coming. They're out there right now, and when they find you, they're going to be so glad they did. Because you are worth finding. Being new doesn't mean being alone forever. It just means your story in this new place is just beginning.`,
    cutDuration: 23
  }
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function generateSantaAudio(script, outputPath, childName) {
  console.log(`  Generating Santa audio for ${childName}...`);
  console.log(`  Using EXACT Emma settings: stability=0.68, similarity_boost=0.82, style=0.32`);

  const voiceId = process.env.ELEVENLABS_SANTA_VOICE_ID;

  const response = await axios({
    method: 'POST',
    url: `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    data: {
      text: script,
      model_id: 'eleven_monolingual_v1',
      voice_settings: SANTA_VOICE_SETTINGS
    },
    responseType: 'arraybuffer'
  });

  const rawPath = outputPath.replace('.mp3', '_raw.mp3');
  fs.writeFileSync(rawPath, Buffer.from(response.data));

  // Apply SAME pitch deepening as Emma (from prototype)
  execSync(`ffmpeg -y -i "${rawPath}" -af "asetrate=44100*0.95,aresample=44100,volume=1.1" "${outputPath}"`, { stdio: 'pipe' });

  fs.unlinkSync(rawPath);

  const duration = parseFloat(execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputPath}"`).toString().trim());
  console.log(`  ✓ Generated: ${path.basename(outputPath)} (${duration.toFixed(1)}s)`);

  return duration;
}

function processSantaAudio(inputPath, outputPath, duration) {
  // 1s fade-in, NO fade-out, trim to duration
  execSync(`ffmpeg -y -i "${inputPath}" -t ${duration} -af "afade=t=in:st=0:d=1" "${outputPath}"`, { stdio: 'pipe' });
  return duration;
}

// ============================================================
// SNOWFLAKE & SPARKLE CLASSES
// ============================================================

class Snowflake {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * WIDTH;
    this.y = initial ? Math.random() * HEIGHT : -20;
    this.size = Math.random() * 6 + 2;
    this.speed = Math.random() * 1.5 + 0.5;
    this.drift = Math.random() * 0.5 - 0.25;
    this.driftPhase = Math.random() * Math.PI * 2;
    this.opacity = Math.random() * 0.4 + 0.2;
  }

  update() {
    this.y += this.speed;
    this.driftPhase += 0.02;
    this.x += Math.sin(this.driftPhase) * this.drift;
    if (this.y > HEIGHT + 20) this.reset();
    if (this.x < -20) this.x = WIDTH + 20;
    if (this.x > WIDTH + 20) this.x = -20;
  }

  draw(ctx, warmth = 0) {
    ctx.save();
    const r = 255;
    const g = Math.floor(255 - warmth * 10);
    const b = Math.floor(255 - warmth * 20);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Sparkle {
  constructor(color) {
    this.color = color;
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * WIDTH;
    this.y = initial ? Math.random() * HEIGHT : -10;
    this.size = Math.random() * 3 + 1;
    this.speed = Math.random() * 1 + 0.3;
    this.twinkle = Math.random() * Math.PI * 2;
    this.opacity = Math.random() * 0.5 + 0.3;
  }

  update() {
    this.y += this.speed;
    this.twinkle += 0.1;
    if (this.y > HEIGHT + 10) this.reset();
  }

  draw(ctx) {
    const alpha = this.opacity * (0.5 + 0.5 * Math.sin(this.twinkle));
    ctx.save();
    ctx.fillStyle = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${alpha})`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================
// TEXT DRAWING
// ============================================================

function drawText(ctx, text, fontSize, y, options = {}) {
  const {
    color = '#FFFFFF',
    fontFamily = 'Bodoni 72 Smallcaps, Georgia, serif',
    shadowBlur = 30,
    shadowOffsetY = 6,
    maxWidth = WIDTH * 0.85,
    lineHeight = 1.3
  } = options;

  ctx.save();
  ctx.font = `${fontSize}px "${fontFamily}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = shadowOffsetY;
  ctx.fillStyle = color;

  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  const totalHeight = lines.length * fontSize * lineHeight;
  let startY = y - totalHeight / 2 + fontSize * lineHeight / 2;

  for (const line of lines) {
    ctx.fillText(line, WIDTH / 2, startY);
    startY += fontSize * lineHeight;
  }

  ctx.restore();
}

// ============================================================
// BACKGROUND DRAWING
// ============================================================

function drawBackground(ctx, frame, phase, colors, timeline) {
  let warmth = 0;

  if (phase === 'santa' || phase === 'bridge' || phase === 'emotional') {
    warmth = 0.7;
  } else if (phase === 'transition') {
    const progress = (frame / FPS - timeline.transitionStart) / (timeline.transitionEnd - timeline.transitionStart);
    warmth = progress * 0.5;
  } else if (phase === 'cta') {
    warmth = 0.3;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);

  if (warmth > 0.5) {
    const r1 = colors.darkStart[0] + (colors.warmStart[0] - colors.darkStart[0]) * warmth;
    const g1 = colors.darkStart[1] + (colors.warmStart[1] - colors.darkStart[1]) * warmth;
    const b1 = colors.darkStart[2] + (colors.warmStart[2] - colors.darkStart[2]) * warmth;
    const r2 = colors.darkEnd[0] + (colors.warmEnd[0] - colors.darkEnd[0]) * warmth;
    const g2 = colors.darkEnd[1] + (colors.warmEnd[1] - colors.darkEnd[1]) * warmth;
    const b2 = colors.darkEnd[2] + (colors.warmEnd[2] - colors.darkEnd[2]) * warmth;
    gradient.addColorStop(0, `rgb(${Math.floor(r1)}, ${Math.floor(g1)}, ${Math.floor(b1)})`);
    gradient.addColorStop(1, `rgb(${Math.floor(r2)}, ${Math.floor(g2)}, ${Math.floor(b2)})`);
  } else {
    gradient.addColorStop(0, `rgb(${colors.darkStart[0]}, ${colors.darkStart[1]}, ${colors.darkStart[2]})`);
    gradient.addColorStop(1, `rgb(${colors.darkEnd[0]}, ${colors.darkEnd[1]}, ${colors.darkEnd[2]})`);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  return warmth;
}

// ============================================================
// CREATE SINGLE VIDEO
// ============================================================

async function createVideo(config) {
  console.log('');
  console.log('='.repeat(70));
  console.log(`CREATING VIDEO: ${config.childName} - ${config.hookText}`);
  console.log('='.repeat(70));

  const framesDir = path.join(OUTPUT_DIR, `frames-${config.name}`);
  const santaAudioRaw = path.join(AUDIO_DIR, `santa_${config.name}.mp3`);
  const santaAudioProcessed = path.join(AUDIO_DIR, `santa_${config.name}_processed.mp3`);

  if (fs.existsSync(framesDir)) {
    fs.rmSync(framesDir, { recursive: true });
  }
  fs.mkdirSync(framesDir, { recursive: true });

  // Step 1: Generate Santa audio with IDENTICAL settings
  console.log('[1/4] Generating Santa audio (IDENTICAL settings to Emma)...');
  await generateSantaAudio(config.santaScript, santaAudioRaw, config.childName);

  processSantaAudio(santaAudioRaw, santaAudioProcessed, config.cutDuration);
  console.log(`  ✓ Processed: ${config.cutDuration}s with fade-in, clean cut`);

  // Timeline
  const timeline = {
    hookStart: 0,
    hookEnd: 4,
    buildStart: 4,
    buildEnd: 8,
    transitionStart: 8,
    transitionEnd: 11,
    santaStart: 11,
    santaEnd: 11 + config.cutDuration,
    bridgeStart: 11 + config.cutDuration,
    bridgeEnd: 11 + config.cutDuration + 4,
    emotionalStart: 11 + config.cutDuration + 4,
    emotionalEnd: 11 + config.cutDuration + 8,
    ctaStart: 11 + config.cutDuration + 8,
    ctaEnd: 11 + config.cutDuration + 18
  };

  const totalDuration = timeline.ctaEnd;
  const totalFrames = Math.ceil(totalDuration * FPS);

  // Step 2: Render frames
  console.log(`[2/4] Rendering ${totalFrames} frames (${totalDuration.toFixed(1)}s @ ${FPS}fps)...`);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const snowflakes = Array(80).fill(null).map(() => new Snowflake());
  const sparkles = Array(30).fill(null).map(() => new Sparkle(config.sparkleColor));

  const startTime = Date.now();

  for (let frame = 0; frame < totalFrames; frame++) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const time = frame / FPS;

    let phase;
    if (time < timeline.hookEnd) phase = 'hook';
    else if (time < timeline.buildEnd) phase = 'build';
    else if (time < timeline.transitionEnd) phase = 'transition';
    else if (time < timeline.santaEnd) phase = 'santa';
    else if (time < timeline.bridgeEnd) phase = 'bridge';
    else if (time < timeline.emotionalEnd) phase = 'emotional';
    else phase = 'cta';

    const warmth = drawBackground(ctx, frame, phase, config.colors, timeline);

    for (const flake of snowflakes) {
      flake.update();
      flake.draw(ctx, warmth);
    }

    if (warmth > 0.5) {
      for (const sparkle of sparkles) {
        sparkle.update();
        sparkle.draw(ctx);
      }
    }

    switch (phase) {
      case 'hook':
        drawText(ctx, config.hookText, 110, HEIGHT * 0.35);
        break;
      case 'build':
        drawText(ctx, config.buildText, 100, HEIGHT * 0.35);
        break;
      case 'transition':
        drawText(ctx, `Listen to what he told ${config.pronoun}:`, 90, HEIGHT * 0.35);
        break;
      case 'santa':
        drawText(ctx, config.santaLabelText, 52, HEIGHT * 0.15, { color: 'rgba(255, 255, 255, 0.8)' });
        break;
      case 'bridge':
        drawText(ctx, "That's just the beginning... \u{1F90D}", 90, HEIGHT * 0.4);
        break;
      case 'emotional':
        drawText(ctx, 'Every child deserves to feel seen \u{2764}\u{FE0F}', 88, HEIGHT * 0.4);
        break;
      case 'cta':
        drawText(ctx, 'personalizedoutput.com', 92, HEIGHT * 0.20);
        drawText(ctx, "We'll create one for your child today", 58, HEIGHT * 0.33, { color: '#FFE4B5' });
        drawText(ctx, 'Deeply personalized. Instant delivery.', 54, HEIGHT * 0.45, { color: '#FFE4B5' });
        drawText(ctx, "Ready before Christmas \u{1F384}", 54, HEIGHT * 0.57, { color: '#FFE4B5' });
        drawText(ctx, '@PersonalizedOutput', 48, HEIGHT * 0.72, { color: 'rgba(255, 255, 255, 0.9)' });
        break;
    }

    const framePath = path.join(framesDir, `frame_${String(frame).padStart(5, '0')}.png`);
    fs.writeFileSync(framePath, canvas.toBuffer('image/png'));

    if (frame % 150 === 0 || frame === totalFrames - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  Frame ${frame + 1}/${totalFrames} (${((frame + 1) / totalFrames * 100).toFixed(1)}%) - ${elapsed}s`);
    }
  }
  console.log('  ✓ Frames rendered');

  // Step 3: Compile video
  console.log('[3/4] Compiling video...');
  const videoOnly = path.join(OUTPUT_DIR, `${config.name}_video.mp4`);
  execSync(`ffmpeg -y -framerate ${FPS} -i "${framesDir}/frame_%05d.png" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "${videoOnly}"`, { stdio: 'pipe' });
  console.log('  ✓ Video compiled');

  // Step 4: Add audio
  console.log('[4/4] Adding Santa audio...');
  const finalVideo = path.join(FINAL_VIDEOS_DIR, config.filename);
  const santaDelay = timeline.santaStart * 1000;

  execSync(`ffmpeg -y -i "${videoOnly}" -i "${santaAudioProcessed}" -filter_complex "[1:a]adelay=${santaDelay}|${santaDelay}[delayed];[delayed]apad=whole_dur=${totalDuration}[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest "${finalVideo}"`, { stdio: 'pipe' });
  console.log('  ✓ Audio added');

  // Cleanup
  fs.rmSync(framesDir, { recursive: true });
  fs.unlinkSync(videoOnly);
  fs.unlinkSync(santaAudioProcessed);

  const stats = fs.statSync(finalVideo);
  const finalDuration = parseFloat(execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${finalVideo}"`).toString().trim());

  console.log('');
  console.log(`✓ COMPLETE: ${config.filename}`);
  console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Duration: ${finalDuration.toFixed(1)}s`);

  return { filename: config.filename, duration: finalDuration, size: stats.size };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('='.repeat(70));
  console.log('SANTA VIDEO BATCH GENERATOR V2 - FIXES APPLIED');
  console.log('='.repeat(70));
  console.log('');
  console.log('FIXES:');
  console.log('  1. Marcus → Elijah (nobody notices kindness)');
  console.log('  2. Sofia - clearer script');
  console.log('  3. James - "celebrate him" + regenerated audio');
  console.log('  4. Lily - better cut point');
  console.log('  5. ALL voices use IDENTICAL settings as Emma');
  console.log('');

  fs.mkdirSync(FINAL_VIDEOS_DIR, { recursive: true });
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  // Delete old Marcus video if it exists
  const oldMarcus = path.join(FINAL_VIDEOS_DIR, '02_marcus_lost_grandmother.mp4');
  if (fs.existsSync(oldMarcus)) {
    fs.unlinkSync(oldMarcus);
    console.log('  ✓ Removed old Marcus video');
  }

  const results = [];

  for (const config of VIDEOS) {
    try {
      const result = await createVideo(config);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ ERROR creating ${config.filename}:`, error.message);
      results.push({ filename: config.filename, error: error.message });
    }
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('BATCH V2 COMPLETE');
  console.log('='.repeat(70));
  console.log('');
  console.log('Videos created:');
  for (const result of results) {
    if (result.error) {
      console.log(`  ❌ ${result.filename} - ERROR: ${result.error}`);
    } else {
      console.log(`  ✓ ${result.filename} (${result.duration.toFixed(1)}s, ${(result.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  }
  console.log('');
  console.log(`Output folder: ${FINAL_VIDEOS_DIR}`);
}

main().catch(console.error);
