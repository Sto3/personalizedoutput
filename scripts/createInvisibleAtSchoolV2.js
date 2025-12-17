/**
 * "Invisible at School" V2 - Refined Version
 *
 * Changes from V1:
 * - Font: Bodoni 72 Smallcaps (elegant serif)
 * - Text: "Emma feels invisible" (personalized)
 * - Pacing: Slower (~50 seconds total)
 * - Santa audio: 1-second fade-in, cut at "you did what was right"
 * - CTA: New messaging with urgency
 * - Visual: Softer golden light with gentle particles
 */

require('dotenv').config();
const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================
// REGISTER FONTS
// ============================================================

// Register Bodoni 72 Smallcaps
try {
  registerFont('/System/Library/Fonts/Supplemental/Bodoni 72 Smallcaps Book.ttf', {
    family: 'Bodoni 72 Smallcaps',
    weight: 'normal'
  });
  console.log('✓ Bodoni 72 Smallcaps registered');
} catch (e) {
  console.log('⚠ Could not register Bodoni, using fallback');
}

// Also register Bodoni 72 Bold as fallback
try {
  registerFont('/System/Library/Fonts/Supplemental/Bodoni 72.ttc', {
    family: 'Bodoni 72',
    weight: 'bold'
  });
} catch (e) {}

// ============================================================
// CONFIGURATION
// ============================================================

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

// Output paths
const OUTPUT_DIR = 'outputs/social-campaign-v2/santa';
const FRAMES_DIR = path.join(OUTPUT_DIR, 'frames-v2');
const FINAL_VIDEO = path.join(OUTPUT_DIR, 'videos/invisible_at_school_v2.mp4');

// Santa audio
const SANTA_AUDIO = 'outputs/santa/santa-emma-deep-1764934040825.mp3';
const SANTA_CUT_DURATION = 25; // Extended to ~25 sec to end at "you did what was right"

// NEW SLOWER TIMELINE (target ~50 seconds)
const TIMELINE = {
  hookStart: 0,
  hookEnd: 4,        // 4 seconds for hook (was 2)
  buildStart: 4,
  buildEnd: 8,       // 4 seconds for build (was 2)
  transitionStart: 8,
  transitionEnd: 11, // 3 seconds for transition (was 2)
  santaStart: 11,
  santaEnd: 11 + SANTA_CUT_DURATION, // 36 seconds
  emotionalStart: 36,
  emotionalEnd: 40,  // 4 seconds for emotional beat
  ctaStart: 40,
  ctaEnd: 50         // 10 seconds for CTA (more time to read)
};

const TOTAL_DURATION = TIMELINE.ctaEnd;
const TOTAL_FRAMES = FPS * TOTAL_DURATION;

// Colors
const COLORS = {
  background: '#0a0a0a',
  gold: '#FFD700',
  warmGold: '#FFCC80',
  warmCream: '#FFF8DC',
  white: '#FFFFFF',
  subtleGray: '#aaaaaa'
};

// Font configuration
const FONT_FAMILY = 'Bodoni 72 Smallcaps, Bodoni 72, Georgia, serif';

// ============================================================
// PARTICLE SYSTEM - Softer, More Gentle
// ============================================================

class GentleParticle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * WIDTH;
    this.y = Math.random() * HEIGHT;
    this.size = 1 + Math.random() * 4;
    this.speedY = -0.1 - Math.random() * 0.2; // Slower
    this.speedX = (Math.random() - 0.5) * 0.1;
    this.alpha = 0.1 + Math.random() * 0.3;
    this.pulseOffset = Math.random() * Math.PI * 2;
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    if (this.y < -10) {
      this.y = HEIGHT + 10;
      this.x = Math.random() * WIDTH;
    }
  }

  draw(ctx, frame, intensityMultiplier = 1) {
    const pulse = Math.sin(frame * 0.03 + this.pulseOffset) * 0.15 + 0.85;
    const alpha = this.alpha * pulse * intensityMultiplier;

    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.size * 3
    );
    gradient.addColorStop(0, `rgba(255, 220, 150, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(255, 200, 100, ${alpha * 0.4})`);
    gradient.addColorStop(1, 'rgba(255, 180, 80, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Initialize particles
const particles = Array.from({ length: 50 }, () => new GentleParticle());

// ============================================================
// BACKGROUND RENDERERS - Softer Golden Glow
// ============================================================

function drawDarkBackground(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#0c0808');
  gradient.addColorStop(0.5, '#0a0606');
  gradient.addColorStop(1, '#080404');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawSoftGoldenGlow(ctx, frame, progress) {
  // Soft, warm central glow - no sharp rays
  const maxRadius = Math.max(WIDTH, HEIGHT) * 0.7;
  const radius = maxRadius * Math.min(1, progress * 1.2);

  // Multiple soft layers
  for (let i = 0; i < 4; i++) {
    const layerRadius = radius * (1 - i * 0.2);
    const alpha = 0.12 * (1 - i * 0.25) * Math.min(1, progress * 1.5);

    const gradient = ctx.createRadialGradient(
      WIDTH / 2, HEIGHT * 0.45, 0,
      WIDTH / 2, HEIGHT * 0.45, layerRadius
    );
    gradient.addColorStop(0, `rgba(255, 230, 180, ${alpha})`);
    gradient.addColorStop(0.4, `rgba(255, 210, 140, ${alpha * 0.6})`);
    gradient.addColorStop(0.7, `rgba(255, 190, 100, ${alpha * 0.3})`);
    gradient.addColorStop(1, 'rgba(255, 170, 80, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Gentle pulsing overlay
  const pulseAlpha = 0.03 * Math.sin(frame * 0.02) + 0.03;
  const pulseGradient = ctx.createRadialGradient(
    WIDTH / 2, HEIGHT * 0.45, 0,
    WIDTH / 2, HEIGHT * 0.45, maxRadius * 0.8
  );
  pulseGradient.addColorStop(0, `rgba(255, 240, 200, ${pulseAlpha * progress})`);
  pulseGradient.addColorStop(1, 'rgba(255, 200, 150, 0)');
  ctx.fillStyle = pulseGradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Floating particles with intensity based on progress
  particles.forEach(p => {
    p.update();
    p.draw(ctx, frame, progress);
  });
}

function drawElegantCTA(ctx, frame) {
  // Dark gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#0d0908');
  gradient.addColorStop(0.5, '#0a0706');
  gradient.addColorStop(1, '#060404');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle gold shimmer
  for (let i = 0; i < 40; i++) {
    const x = (Math.sin(i * 0.8 + frame * 0.015) * 0.5 + 0.5) * WIDTH;
    const y = (Math.cos(i * 0.6 + frame * 0.01) * 0.5 + 0.5) * HEIGHT;
    const size = 1 + Math.sin(frame * 0.08 + i) * 0.5;
    const alpha = 0.15 + Math.sin(frame * 0.04 + i * 0.4) * 0.1;

    ctx.fillStyle = `rgba(255, 215, 100, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warm vignette
  const vignette = ctx.createRadialGradient(
    WIDTH / 2, HEIGHT / 2, HEIGHT * 0.25,
    WIDTH / 2, HEIGHT / 2, HEIGHT * 0.75
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

// ============================================================
// TEXT RENDERING - Elegant Serif
// ============================================================

function drawText(ctx, text, fontSize, y, options = {}) {
  const {
    color = COLORS.white,
    opacity = 1,
    scale = 1,
    shadowBlur = 20,
    maxWidth = WIDTH - 120,
    letterSpacing = 2
  } = options;

  ctx.save();

  // Apply scale from center
  if (scale !== 1) {
    ctx.translate(WIDTH / 2, y);
    ctx.scale(scale, scale);
    ctx.translate(-WIDTH / 2, -y);
  }

  ctx.globalAlpha = opacity;
  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  ctx.fillStyle = color;

  // Word wrap
  const words = text.split(' ');
  let lines = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);

  // Draw lines with letter spacing
  const lineHeight = fontSize * 1.3;
  const totalHeight = lines.length * lineHeight;
  const startY = y - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    // Draw with letter spacing by drawing each character
    if (letterSpacing > 0) {
      const chars = line.split('');
      let totalWidth = 0;
      chars.forEach(char => {
        totalWidth += ctx.measureText(char).width + letterSpacing;
      });
      totalWidth -= letterSpacing;

      let xPos = (WIDTH - totalWidth) / 2;
      chars.forEach(char => {
        ctx.fillText(char, xPos + ctx.measureText(char).width / 2, startY + i * lineHeight);
        xPos += ctx.measureText(char).width + letterSpacing;
      });
    } else {
      ctx.fillText(line, WIDTH / 2, startY + i * lineHeight);
    }
  });

  ctx.restore();
}

// ============================================================
// ANIMATION HELPERS
// ============================================================

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function fadeIn(frame, startFrame, durationFrames) {
  const progress = (frame - startFrame) / durationFrames;
  return Math.min(1, Math.max(0, easeOut(progress)));
}

// ============================================================
// FRAME RENDERER
// ============================================================

function renderFrame(frameNum) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const time = frameNum / FPS;

  // Determine phase
  let phase;
  if (time < TIMELINE.transitionEnd) {
    phase = 'hook';
  } else if (time < TIMELINE.emotionalStart) {
    phase = 'santa';
  } else if (time < TIMELINE.ctaStart) {
    phase = 'emotional';
  } else {
    phase = 'cta';
  }

  // Draw background
  drawDarkBackground(ctx);

  if (phase === 'hook') {
    // Subtle particles only
    particles.forEach(p => {
      p.update();
      p.draw(ctx, frameNum, 0.3);
    });
  } else if (phase === 'santa' || phase === 'emotional') {
    // Soft expanding golden glow
    const santaProgress = (time - TIMELINE.santaStart) / (TIMELINE.emotionalEnd - TIMELINE.santaStart);
    const glowProgress = Math.min(1, easeInOut(Math.max(0, santaProgress)));
    drawSoftGoldenGlow(ctx, frameNum, glowProgress);
  } else if (phase === 'cta') {
    drawElegantCTA(ctx, frameNum);
  }

  // ========== TEXT RENDERING ==========

  // HOOK: "Emma feels invisible at school" (0-4s)
  if (time >= TIMELINE.hookStart && time < TIMELINE.buildStart) {
    const localFrame = frameNum - TIMELINE.hookStart * FPS;
    const fadeProgress = fadeIn(localFrame, 0, FPS * 0.8);
    const scale = 1 + fadeProgress * 0.015;
    drawText(ctx, "Emma feels invisible at school", 88, 380, {
      opacity: fadeProgress,
      scale: scale,
      letterSpacing: 3
    });
  }

  // BUILD: "Her mom asked Santa for help" (4-8s)
  if (time >= TIMELINE.buildStart && time < TIMELINE.transitionStart) {
    const localFrame = frameNum - TIMELINE.buildStart * FPS;
    const fadeProgress = fadeIn(localFrame, 0, FPS * 0.8);
    drawText(ctx, "Her mom asked Santa for help", 68, 480, {
      opacity: fadeProgress,
      letterSpacing: 2
    });
  }

  // TRANSITION: "Listen to what he told her:" (8-11s)
  if (time >= TIMELINE.transitionStart && time < TIMELINE.santaStart) {
    const localFrame = frameNum - TIMELINE.transitionStart * FPS;
    const fadeProgress = fadeIn(localFrame, 0, FPS * 0.6);
    drawText(ctx, "Listen to what he told her:", 60, 560, {
      opacity: fadeProgress,
      color: COLORS.warmCream,
      letterSpacing: 2
    });
  }

  // EMOTIONAL BEAT: "Every child deserves to feel seen 💛" (36-40s)
  if (time >= TIMELINE.emotionalStart && time < TIMELINE.ctaStart) {
    const localFrame = frameNum - TIMELINE.emotionalStart * FPS;
    const fadeProgress = fadeIn(localFrame, 0, FPS * 1);
    drawText(ctx, "Every child deserves to feel seen 💛", 64, HEIGHT / 2, {
      opacity: fadeProgress,
      color: COLORS.warmCream,
      letterSpacing: 2
    });
  }

  // CTA (40-50s) - New messaging
  if (time >= TIMELINE.ctaStart) {
    const localFrame = frameNum - TIMELINE.ctaStart * FPS;

    // Main URL (appears first)
    const urlFade = fadeIn(localFrame, 0, FPS * 0.6);
    drawText(ctx, "personalizedoutput.com", 76, HEIGHT / 2 - 100, {
      opacity: urlFade,
      letterSpacing: 2
    });

    // "Deeply personalized. Instant delivery."
    if (time >= TIMELINE.ctaStart + 1.5) {
      const tagFade = fadeIn(localFrame - FPS * 1.5, 0, FPS * 0.5);
      drawText(ctx, "Deeply personalized. Instant delivery.", 44, HEIGHT / 2, {
        opacity: tagFade,
        color: COLORS.warmGold,
        letterSpacing: 1
      });
    }

    // "Ready before Christmas 🎄"
    if (time >= TIMELINE.ctaStart + 3) {
      const xmasFade = fadeIn(localFrame - FPS * 3, 0, FPS * 0.5);
      drawText(ctx, "Ready before Christmas 🎄", 44, HEIGHT / 2 + 70, {
        opacity: xmasFade,
        color: COLORS.warmGold,
        letterSpacing: 1
      });
    }

    // Handle
    if (time >= TIMELINE.ctaStart + 4.5) {
      const handleFade = fadeIn(localFrame - FPS * 4.5, 0, FPS * 0.5);
      drawText(ctx, "@PersonalizedOutput", 36, HEIGHT / 2 + 160, {
        opacity: handleFade * 0.6,
        color: COLORS.subtleGray,
        letterSpacing: 1
      });
    }
  }

  return canvas;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('='.repeat(70));
  console.log('CREATING "INVISIBLE AT SCHOOL" V2');
  console.log('Refined: Bodoni font, slower pacing, softer glow');
  console.log('='.repeat(70));
  console.log('');

  // Create directories
  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true });
  }
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(FINAL_VIDEO), { recursive: true });

  // Step 1: Process Santa audio with fade-in
  console.log('[1/4] Processing Santa audio (with 1s fade-in)...');
  const santaProcessed = path.join(OUTPUT_DIR, 'audio/santa_cut_v2.mp3');
  fs.mkdirSync(path.dirname(santaProcessed), { recursive: true });

  // Add 1-second fade-in at beginning, cut at duration, apply pitch shift
  execSync(`ffmpeg -y -i "${SANTA_AUDIO}" -t ${SANTA_CUT_DURATION} -af "afade=t=in:st=0:d=1,asetrate=44100*0.95,aresample=44100,volume=1.1" "${santaProcessed}" 2>/dev/null`);
  console.log(`  ✓ Santa audio: ${SANTA_CUT_DURATION}s with 1s fade-in`);

  // Step 2: Render frames
  console.log(`[2/4] Rendering ${TOTAL_FRAMES} frames (${TOTAL_DURATION}s @ ${FPS}fps)...`);
  const startTime = Date.now();

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const canvas = renderFrame(frame);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(FRAMES_DIR, `frame_${String(frame).padStart(5, '0')}.png`), buffer);

    if (frame % 150 === 0 || frame === TOTAL_FRAMES - 1) {
      const percent = ((frame + 1) / TOTAL_FRAMES * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r  Frame ${frame + 1}/${TOTAL_FRAMES} (${percent}%) - ${elapsed}s`);
    }
  }
  console.log('\n  ✓ Frames rendered');

  // Step 3: Compile video
  console.log('[3/4] Compiling video...');
  const tempVideo = path.join(OUTPUT_DIR, 'temp_video_v2.mp4');

  execSync(`ffmpeg -y -framerate ${FPS} -i "${FRAMES_DIR}/frame_%05d.png" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${tempVideo}" 2>/dev/null`);
  console.log('  ✓ Video compiled');

  // Step 4: Add audio
  console.log('[4/4] Adding Santa audio...');

  const audioFilter = `[1:a]adelay=${TIMELINE.santaStart * 1000}|${TIMELINE.santaStart * 1000}[santa];[santa]apad=whole_dur=${TOTAL_DURATION}[aout]`;

  execSync(`ffmpeg -y -i "${tempVideo}" -i "${santaProcessed}" -filter_complex "${audioFilter}" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -t ${TOTAL_DURATION} "${FINAL_VIDEO}"`, { stdio: 'pipe' });

  console.log('  ✓ Audio added');

  // Cleanup
  console.log('\nCleaning up...');
  fs.rmSync(FRAMES_DIR, { recursive: true });
  if (fs.existsSync(tempVideo)) fs.unlinkSync(tempVideo);

  // Verify
  const stats = fs.statSync(FINAL_VIDEO);

  console.log('');
  console.log('='.repeat(70));
  console.log('V2 COMPLETE');
  console.log('='.repeat(70));
  console.log(`File: ${FINAL_VIDEO}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Duration: ${TOTAL_DURATION}s`);
  console.log('');
  console.log('REFINEMENTS APPLIED:');
  console.log('  ✓ Font: Bodoni 72 Smallcaps (elegant serif)');
  console.log('  ✓ Text: "Emma feels invisible at school"');
  console.log('  ✓ Pacing: Slower (50 seconds total)');
  console.log('  ✓ Santa: 1-second fade-in, 25s duration');
  console.log('  ✓ Visual: Softer golden glow (no sharp rays)');
  console.log('  ✓ CTA: New messaging with urgency');
  console.log('');
  console.log('Timeline:');
  console.log('  0:00-0:04 - "Emma feels invisible at school"');
  console.log('  0:04-0:08 - "Her mom asked Santa for help"');
  console.log('  0:08-0:11 - "Listen to what he told her:"');
  console.log('  0:11-0:36 - Santa audio (with fade-in)');
  console.log('  0:36-0:40 - "Every child deserves to feel seen 💛"');
  console.log('  0:40-0:50 - CTA');
  console.log('');

  execSync(`open "${FINAL_VIDEO}"`);
}

main().catch(console.error);
