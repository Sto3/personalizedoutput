/**
 * Social Campaign V2 - "Invisible at School" V3
 *
 * CRITICAL FIXES FROM V2:
 * 1. TEXT SIZE - Much larger (80-100px for hooks)
 * 2. SNOWFALL - Animated snow instead of bokeh/glow
 * 3. BRIDGE TEXT - "That's just the beginning..." after Santa
 * 4. SANTA CUT - Exact cut at "you did what was right" with fade-out
 * 5. READABLE CTA - All text easily readable on phone
 */

require('dotenv').config();
const { createCanvas, registerFont } = require('canvas');
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

// SANTA AUDIO - Cut at "you did what was right"
// Try 21 seconds - adjust if needed
const SANTA_CUT_DURATION = 21;

// TIMELINE (Total: ~50 seconds)
const TIMELINE = {
  hookStart: 0,
  hookEnd: 4,           // 4 seconds for hook
  buildStart: 4,
  buildEnd: 8,          // 4 seconds for build
  transitionStart: 8,
  transitionEnd: 11,    // 3 seconds for transition
  santaStart: 11,
  santaEnd: 32,         // 21 seconds of Santa audio
  bridgeStart: 32,
  bridgeEnd: 36,        // 4 seconds for bridge ("That's just the beginning...")
  emotionalStart: 36,
  emotionalEnd: 40,     // 4 seconds emotional beat
  ctaStart: 40,
  ctaEnd: 50            // 10 seconds CTA
};

const TOTAL_DURATION = TIMELINE.ctaEnd;
const TOTAL_FRAMES = TOTAL_DURATION * FPS;

// Paths - use absolute paths
const PROJECT_ROOT = '/Users/matthewriley/EtsyInnovations';
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'outputs/social-campaign-v2/santa');
const FRAMES_DIR = path.join(OUTPUT_DIR, 'frames-v3');
const SANTA_AUDIO = path.join(PROJECT_ROOT, 'outputs/santa/santa-emma-deep-1764934040825.mp3');

// ============================================================
// SNOWFLAKE CLASS
// ============================================================

class Snowflake {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * WIDTH;
    this.y = initial ? Math.random() * HEIGHT : -20;
    this.size = Math.random() * 6 + 2; // 2-8px
    this.speed = Math.random() * 1.5 + 0.5; // Slow fall
    this.drift = Math.random() * 0.5 - 0.25; // Horizontal drift
    this.driftPhase = Math.random() * Math.PI * 2;
    this.opacity = Math.random() * 0.6 + 0.4; // 0.4-1.0
    this.blur = this.size > 5 ? 0 : (Math.random() > 0.7 ? 2 : 0); // Some blurred for depth
  }

  update() {
    this.y += this.speed;
    this.driftPhase += 0.02;
    this.x += Math.sin(this.driftPhase) * this.drift;

    if (this.y > HEIGHT + 20) {
      this.reset();
    }
    if (this.x < -20) this.x = WIDTH + 20;
    if (this.x > WIDTH + 20) this.x = -20;
  }

  draw(ctx, warmth = 0) {
    ctx.save();

    // Color shifts slightly warmer during Santa audio
    const r = 255;
    const g = Math.floor(255 - warmth * 10);
    const b = Math.floor(255 - warmth * 20);

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.opacity})`;

    if (this.blur > 0) {
      ctx.shadowBlur = this.blur;
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${this.opacity * 0.5})`;
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ============================================================
// GOLDEN SPARKLE CLASS (for Santa section)
// ============================================================

class GoldenSparkle {
  constructor() {
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

    if (this.y > HEIGHT + 10) {
      this.reset();
    }
  }

  draw(ctx) {
    const alpha = this.opacity * (0.5 + 0.5 * Math.sin(this.twinkle));

    ctx.save();
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = `rgba(255, 200, 100, ${alpha * 0.8})`;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================
// TEXT DRAWING FUNCTIONS
// ============================================================

function drawText(ctx, text, fontSize, y, options = {}) {
  const {
    color = '#FFFFFF',
    fontFamily = 'Bodoni 72 Smallcaps, Georgia, serif',
    shadowBlur = 20,
    shadowOffsetY = 4,
    maxWidth = WIDTH * 0.85,
    lineHeight = 1.3
  } = options;

  ctx.save();

  // Set font
  ctx.font = `${fontSize}px "${fontFamily}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow for readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = shadowOffsetY;

  // Text color
  ctx.fillStyle = color;

  // Word wrap if needed
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

  // Draw each line
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

function drawBackground(ctx, frame, phase) {
  // Calculate warmth (0 = cold/dark, 1 = warm)
  let warmth = 0;

  if (phase === 'santa' || phase === 'bridge' || phase === 'emotional') {
    warmth = 0.7;
  } else if (phase === 'transition') {
    const progress = (frame / FPS - TIMELINE.transitionStart) / (TIMELINE.transitionEnd - TIMELINE.transitionStart);
    warmth = progress * 0.5;
  } else if (phase === 'cta') {
    warmth = 0.3;
  }

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);

  if (warmth > 0.5) {
    // Warm burgundy/dark red
    gradient.addColorStop(0, `rgb(${30 + warmth * 20}, ${10 + warmth * 5}, ${20 + warmth * 10})`);
    gradient.addColorStop(1, `rgb(${15 + warmth * 10}, ${5}, ${10 + warmth * 5})`);
  } else {
    // Deep navy/black
    gradient.addColorStop(0, `rgb(${10 + warmth * 20}, ${15 + warmth * 10}, ${30 + warmth * 20})`);
    gradient.addColorStop(1, `rgb(${5 + warmth * 10}, ${8 + warmth * 5}, ${20 + warmth * 10})`);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  return warmth;
}

// ============================================================
// FRAME RENDERING
// ============================================================

function renderFrame(ctx, frame, snowflakes, sparkles) {
  const time = frame / FPS;

  // Determine phase
  let phase;
  if (time < TIMELINE.hookEnd) phase = 'hook';
  else if (time < TIMELINE.buildEnd) phase = 'build';
  else if (time < TIMELINE.transitionEnd) phase = 'transition';
  else if (time < TIMELINE.santaEnd) phase = 'santa';
  else if (time < TIMELINE.bridgeEnd) phase = 'bridge';
  else if (time < TIMELINE.emotionalEnd) phase = 'emotional';
  else phase = 'cta';

  // Draw background
  const warmth = drawBackground(ctx, frame, phase);

  // Update and draw snowflakes
  for (const flake of snowflakes) {
    flake.update();
    flake.draw(ctx, warmth);
  }

  // Draw golden sparkles during warm phases
  if (warmth > 0.5) {
    for (const sparkle of sparkles) {
      sparkle.update();
      sparkle.draw(ctx);
    }
  }

  // Draw text based on phase
  switch (phase) {
    case 'hook':
      // HOOK: "Emma feels invisible at school" - LARGE TEXT
      drawText(ctx, 'Emma feels invisible at school', 88, HEIGHT * 0.35, {
        color: '#FFFFFF'
      });
      break;

    case 'build':
      // BUILD: "Her mom asked Santa for help" - LARGE TEXT
      drawText(ctx, 'Her mom asked Santa for help', 80, HEIGHT * 0.35, {
        color: '#FFFFFF'
      });
      break;

    case 'transition':
      // TRANSITION: "Listen to what he told her:"
      drawText(ctx, 'Listen to what he told her:', 72, HEIGHT * 0.35, {
        color: '#FFFFFF'
      });
      break;

    case 'santa':
      // SANTA: Subtle label
      drawText(ctx, "Emma's Personalized Santa Message", 42, HEIGHT * 0.15, {
        color: 'rgba(255, 255, 255, 0.7)'
      });
      break;

    case 'bridge':
      // BRIDGE: "That's just the beginning..." - NEW
      drawText(ctx, "That's just the beginning... \u{1F49B}", 72, HEIGHT * 0.4, {
        color: '#FFFFFF'
      });
      break;

    case 'emotional':
      // EMOTIONAL: "Every child deserves to feel seen"
      drawText(ctx, 'Every child deserves to feel seen', 68, HEIGHT * 0.4, {
        color: '#FFFFFF'
      });
      break;

    case 'cta':
      // CTA - ALL LARGE AND READABLE
      // Main URL - largest
      drawText(ctx, 'personalizedoutput.com', 78, HEIGHT * 0.32, {
        color: '#FFFFFF'
      });

      // Tagline - gold/cream, still large
      drawText(ctx, 'Deeply personalized. Instant delivery.', 52, HEIGHT * 0.44, {
        color: '#FFE4B5' // Moccasin/gold
      });

      // Urgency - gold/cream
      drawText(ctx, "Ready before Christmas \u{1F384}", 52, HEIGHT * 0.54, {
        color: '#FFE4B5'
      });

      // Handle - slightly smaller but readable
      drawText(ctx, '@PersonalizedOutput', 44, HEIGHT * 0.68, {
        color: 'rgba(255, 255, 255, 0.85)'
      });
      break;
  }
}

// ============================================================
// MAIN FUNCTION
// ============================================================

async function createV3() {
  console.log('='.repeat(70));
  console.log('CREATING "INVISIBLE AT SCHOOL" V3');
  console.log('CRITICAL FIXES: Large text, snowfall, bridge text, audio fades');
  console.log('='.repeat(70));
  console.log('');

  // Create directories
  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true });
  }
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'videos'), { recursive: true });

  // Step 1: Process Santa audio with fade-in AND fade-out
  console.log('[1/4] Processing Santa audio (fade-in + fade-out)...');
  const santaProcessed = path.join(OUTPUT_DIR, 'audio', 'santa_v3.mp3');
  fs.mkdirSync(path.join(OUTPUT_DIR, 'audio'), { recursive: true });

  // Apply: pitch shift, 1s fade-in, 1s fade-out, volume boost
  execSync(`ffmpeg -y -i "${SANTA_AUDIO}" -t ${SANTA_CUT_DURATION} -af "asetrate=44100*0.95,aresample=44100,afade=t=in:st=0:d=1,afade=t=out:st=${SANTA_CUT_DURATION - 1}:d=1,volume=1.1" "${santaProcessed}"`, { stdio: 'pipe' });

  const santaDuration = parseFloat(execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${santaProcessed}"`).toString().trim());
  console.log(`  ✓ Santa audio: ${santaDuration.toFixed(1)}s with fade-in + fade-out`);
  console.log('');

  // Step 2: Render frames
  console.log(`[2/4] Rendering ${TOTAL_FRAMES} frames (${TOTAL_DURATION}s @ ${FPS}fps)...`);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Initialize particles
  const snowflakes = Array(80).fill(null).map(() => new Snowflake());
  const sparkles = Array(30).fill(null).map(() => new GoldenSparkle());

  const startTime = Date.now();

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    // Clear canvas
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Render frame
    renderFrame(ctx, frame, snowflakes, sparkles);

    // Save frame
    const framePath = path.join(FRAMES_DIR, `frame_${String(frame).padStart(5, '0')}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(framePath, buffer);

    // Progress
    if (frame % 150 === 0 || frame === TOTAL_FRAMES - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  Frame ${frame + 1}/${TOTAL_FRAMES} (${((frame + 1) / TOTAL_FRAMES * 100).toFixed(1)}%) - ${elapsed}s`);
    }
  }
  console.log('  ✓ Frames rendered');
  console.log('');

  // Step 3: Compile video from frames
  console.log('[3/4] Compiling video...');
  const videoOnly = path.join(OUTPUT_DIR, 'videos', 'invisible_v3_video.mp4');

  execSync(`ffmpeg -y -framerate ${FPS} -i "${FRAMES_DIR}/frame_%05d.png" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "${videoOnly}"`, { stdio: 'pipe' });
  console.log('  ✓ Video compiled');
  console.log('');

  // Step 4: Add Santa audio at correct position
  console.log('[4/4] Adding Santa audio...');
  const finalVideo = path.join(OUTPUT_DIR, 'videos', 'invisible_at_school_v3.mp4');

  // Santa audio starts at TIMELINE.santaStart (11 seconds)
  const santaDelay = TIMELINE.santaStart * 1000; // ms

  execSync(`ffmpeg -y -i "${videoOnly}" -i "${santaProcessed}" -filter_complex "[1:a]adelay=${santaDelay}|${santaDelay}[delayed];[delayed]apad=whole_dur=${TOTAL_DURATION}[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest "${finalVideo}"`, { stdio: 'pipe' });

  console.log('  ✓ Audio added');
  console.log('');

  // Cleanup
  console.log('Cleaning up frames...');
  fs.rmSync(FRAMES_DIR, { recursive: true });
  fs.unlinkSync(videoOnly);

  // Final stats
  const stats = fs.statSync(finalVideo);
  const finalDuration = parseFloat(execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${finalVideo}"`).toString().trim());

  console.log('');
  console.log('='.repeat(70));
  console.log('V3 COMPLETE');
  console.log('='.repeat(70));
  console.log(`File: ${finalVideo}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Duration: ${finalDuration.toFixed(1)}s`);
  console.log('');
  console.log('CRITICAL FIXES APPLIED:');
  console.log('  ✓ TEXT SIZE: 88px hook, 78px CTA (much larger)');
  console.log('  ✓ SNOWFALL: Animated snow particles (not bokeh)');
  console.log('  ✓ BRIDGE: "That\'s just the beginning..." added');
  console.log('  ✓ SANTA: 1-sec fade-in + 1-sec fade-out');
  console.log(`  ✓ SANTA CUT: ${SANTA_CUT_DURATION}s (should end at "you did what was right")`);
  console.log('');
  console.log('Timeline:');
  console.log('  0:00-0:04 - "Emma feels invisible at school"');
  console.log('  0:04-0:08 - "Her mom asked Santa for help"');
  console.log('  0:08-0:11 - "Listen to what he told her:"');
  console.log('  0:11-0:32 - Santa audio (with fades)');
  console.log('  0:32-0:36 - "That\'s just the beginning..." (NEW)');
  console.log('  0:36-0:40 - "Every child deserves to feel seen"');
  console.log('  0:40-0:50 - CTA');
  console.log('');
  console.log('CHECKLIST:');
  console.log('  [ ] Text readable on phone?');
  console.log('  [ ] Hook text ~88px?');
  console.log('  [ ] Santa ends at "you did what was right"?');
  console.log('  [ ] Santa fades in smoothly?');
  console.log('  [ ] Santa fades out smoothly?');
  console.log('  [ ] Bridge text appears after Santa?');
  console.log('  [ ] Snowfall animation (not bokeh)?');
  console.log('  [ ] Elegant serif font?');
  console.log('  [ ] CTA text readable?');

  // Open video
  execSync(`open "${finalVideo}"`);
}

createV3().catch(console.error);
