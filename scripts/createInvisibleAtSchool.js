/**
 * "Invisible at School" - Text-Forward Emotional Video
 *
 * Format: Text carries the story, product audio is the payoff
 * No narrator voice - uses silence as pattern interrupt
 */

require('dotenv').config();
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================
// CONFIGURATION
// ============================================================

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

// Output paths
const OUTPUT_DIR = 'outputs/social-campaign-v2/santa';
const FRAMES_DIR = path.join(OUTPUT_DIR, 'frames');
const FINAL_VIDEO = path.join(OUTPUT_DIR, 'videos/invisible_at_school_v1.mp4');

// Santa audio
const SANTA_AUDIO = 'outputs/santa/santa-emma-deep-1764934040825.mp3';
const SANTA_CUT_DURATION = 17; // Cut at "you did what was right"

// Timeline (in seconds)
const TIMELINE = {
  hookStart: 0,
  hookEnd: 2,
  buildStart: 2,
  buildEnd: 4,
  transitionStart: 4,
  transitionEnd: 6,
  santaStart: 6,
  santaEnd: 6 + SANTA_CUT_DURATION, // 23 seconds
  emotionalStart: 23,
  emotionalEnd: 27,
  ctaStart: 27,
  ctaEnd: 34
};

const TOTAL_DURATION = TIMELINE.ctaEnd;
const TOTAL_FRAMES = FPS * TOTAL_DURATION;

// Colors
const COLORS = {
  background: '#0a0a0a',
  gold: '#FFD700',
  warmCream: '#FFF8DC',
  softOrange: '#FFCC80',
  white: '#FFFFFF',
  subtleGold: 'rgba(255, 215, 0, 0.6)'
};

// ============================================================
// PARTICLE SYSTEM
// ============================================================

class GoldParticle {
  constructor(phase = 'subtle') {
    this.reset(phase);
  }

  reset(phase) {
    this.x = Math.random() * WIDTH;
    this.y = Math.random() * HEIGHT;
    this.size = phase === 'expanding' ? 2 + Math.random() * 6 : 1 + Math.random() * 3;
    this.speedY = -0.2 - Math.random() * 0.3;
    this.speedX = (Math.random() - 0.5) * 0.2;
    this.alpha = 0.1 + Math.random() * 0.4;
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

  draw(ctx, frame) {
    const pulse = Math.sin(frame * 0.05 + this.pulseOffset) * 0.2 + 0.8;
    const alpha = this.alpha * pulse;

    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.size * 2
    );
    gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(255, 200, 100, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(255, 180, 80, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Initialize particles
const subtleParticles = Array.from({ length: 30 }, () => new GoldParticle('subtle'));
const expandingParticles = Array.from({ length: 60 }, () => new GoldParticle('expanding'));

// ============================================================
// BACKGROUND RENDERERS
// ============================================================

function drawDarkBackground(ctx) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawSubtleParticles(ctx, frame) {
  subtleParticles.forEach(p => {
    p.update();
    p.draw(ctx, frame);
  });
}

function drawExpandingLight(ctx, frame, progress) {
  // Central expanding golden glow
  const maxRadius = Math.max(WIDTH, HEIGHT) * 0.8;
  const radius = maxRadius * progress;

  // Multiple layers for depth
  for (let i = 0; i < 5; i++) {
    const layerRadius = radius * (1 - i * 0.15);
    const alpha = 0.15 * (1 - i * 0.2) * Math.min(1, progress * 2);

    const gradient = ctx.createRadialGradient(
      WIDTH / 2, HEIGHT / 2, 0,
      WIDTH / 2, HEIGHT / 2, layerRadius
    );
    gradient.addColorStop(0, `rgba(255, 220, 100, ${alpha})`);
    gradient.addColorStop(0.3, `rgba(255, 200, 80, ${alpha * 0.7})`);
    gradient.addColorStop(0.6, `rgba(255, 180, 60, ${alpha * 0.4})`);
    gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // God rays effect
  const rayCount = 12;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + frame * 0.002;
    const rayLength = radius * 1.2;

    ctx.save();
    ctx.translate(WIDTH / 2, HEIGHT / 2);
    ctx.rotate(angle);

    const rayGradient = ctx.createLinearGradient(0, 0, rayLength, 0);
    rayGradient.addColorStop(0, `rgba(255, 230, 150, ${0.1 * progress})`);
    rayGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

    ctx.fillStyle = rayGradient;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(rayLength, -5);
    ctx.lineTo(rayLength, 5);
    ctx.lineTo(0, 20);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Floating particles during expansion
  expandingParticles.forEach(p => {
    p.update();
    p.draw(ctx, frame);
  });
}

function drawElegantCTA(ctx, frame) {
  // Dark gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#0d0d0d');
  gradient.addColorStop(0.5, '#0a0808');
  gradient.addColorStop(1, '#050505');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Gold sparkles
  for (let i = 0; i < 50; i++) {
    const x = (Math.sin(i * 0.7 + frame * 0.02) * 0.5 + 0.5) * WIDTH;
    const y = (Math.cos(i * 0.5 + frame * 0.015) * 0.5 + 0.5) * HEIGHT;
    const size = 1 + Math.sin(frame * 0.1 + i) * 0.5;
    const alpha = 0.2 + Math.sin(frame * 0.05 + i * 0.3) * 0.15;

    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle vignette
  const vignette = ctx.createRadialGradient(
    WIDTH / 2, HEIGHT / 2, HEIGHT * 0.3,
    WIDTH / 2, HEIGHT / 2, HEIGHT * 0.8
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

// ============================================================
// TEXT RENDERING
// ============================================================

function drawText(ctx, text, fontSize, y, options = {}) {
  const {
    color = COLORS.white,
    opacity = 1,
    scale = 1,
    shadowBlur = 15,
    maxWidth = WIDTH - 100
  } = options;

  ctx.save();

  // Apply scale from center
  if (scale !== 1) {
    ctx.translate(WIDTH / 2, y);
    ctx.scale(scale, scale);
    ctx.translate(-WIDTH / 2, -y);
  }

  ctx.globalAlpha = opacity;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  // Text color
  ctx.fillStyle = color;

  // Word wrap if needed
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

  // Draw lines
  const lineHeight = fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;
  const startY = y - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, startY + i * lineHeight);
  });

  ctx.restore();
}

// ============================================================
// ANIMATION HELPERS
// ============================================================

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function fadeIn(frame, startFrame, duration) {
  const progress = (frame - startFrame) / duration;
  return Math.min(1, Math.max(0, progress));
}

function fadeOut(frame, startFrame, duration) {
  return 1 - fadeIn(frame, startFrame, duration);
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

  // Draw background based on phase
  drawDarkBackground(ctx);

  if (phase === 'hook') {
    drawSubtleParticles(ctx, frameNum);
  } else if (phase === 'santa' || phase === 'emotional') {
    // Calculate expansion progress
    const santaProgress = (time - TIMELINE.santaStart) / (TIMELINE.emotionalEnd - TIMELINE.santaStart);
    const expandProgress = Math.min(1, easeInOut(Math.max(0, santaProgress)));
    drawExpandingLight(ctx, frameNum, expandProgress);
  } else if (phase === 'cta') {
    drawElegantCTA(ctx, frameNum);
  }

  // Draw text based on timeline
  // HOOK: "She feels invisible at school" (0-2s)
  if (time >= TIMELINE.hookStart && time < TIMELINE.buildStart) {
    const fadeProgress = fadeIn(frameNum, 0, FPS * 0.5);
    const scale = 1 + fadeProgress * 0.02;
    drawText(ctx, "She feels invisible at school", 80, 400, {
      opacity: fadeProgress,
      scale: scale
    });
  }

  // BUILD: "Her mom asked Santa for help" (2-4s)
  if (time >= TIMELINE.buildStart && time < TIMELINE.transitionStart) {
    const localFrame = frameNum - TIMELINE.buildStart * FPS;
    const fadeProgress = fadeIn(localFrame, 0, FPS * 0.5);
    drawText(ctx, "Her mom asked Santa for help", 60, 450, {
      opacity: fadeProgress
    });
  }

  // TRANSITION: "Listen to what he told her:" (4-6s)
  if (time >= TIMELINE.transitionStart && time < TIMELINE.santaStart) {
    const localFrame = frameNum - TIMELINE.transitionStart * FPS;
    const fadeProgress = fadeIn(localFrame, 0, FPS * 0.5);
    drawText(ctx, "Listen to what he told her:", 56, 500, {
      opacity: fadeProgress,
      color: COLORS.warmCream
    });
  }

  // EMOTIONAL BEAT: "Every child deserves to feel seen 💛" (23-27s)
  if (time >= TIMELINE.emotionalStart && time < TIMELINE.ctaStart) {
    const localFrame = frameNum - TIMELINE.emotionalStart * FPS;
    const fadeProgress = fadeIn(localFrame, 0, FPS * 0.8);
    drawText(ctx, "Every child deserves to feel seen 💛", 64, HEIGHT / 2, {
      opacity: fadeProgress,
      color: COLORS.warmCream
    });
  }

  // CTA (27-34s)
  if (time >= TIMELINE.ctaStart) {
    const localFrame = frameNum - TIMELINE.ctaStart * FPS;
    const fadeProgress = fadeIn(localFrame, 0, FPS * 0.5);

    // Main URL
    drawText(ctx, "personalizedoutput.com", 72, HEIGHT / 2 - 60, {
      opacity: fadeProgress
    });

    // Tagline
    if (time >= TIMELINE.ctaStart + 1) {
      const tagFade = fadeIn(localFrame - FPS, 0, FPS * 0.5);
      drawText(ctx, "Create one for your child ✨", 48, HEIGHT / 2 + 40, {
        opacity: tagFade,
        color: COLORS.softOrange
      });
    }

    // Handle
    if (time >= TIMELINE.ctaStart + 2) {
      const handleFade = fadeIn(localFrame - FPS * 2, 0, FPS * 0.5);
      drawText(ctx, "@PersonalizedOutput", 36, HEIGHT / 2 + 120, {
        opacity: handleFade * 0.7,
        color: '#aaaaaa'
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
  console.log('CREATING "INVISIBLE AT SCHOOL" VIDEO');
  console.log('Text-Forward Emotional Format');
  console.log('='.repeat(70));
  console.log('');

  // Create directories
  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true });
  }
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(FINAL_VIDEO), { recursive: true });

  // Step 1: Process Santa audio
  console.log('[1/4] Processing Santa audio...');
  const santaProcessed = path.join(OUTPUT_DIR, 'audio/santa_cut.mp3');
  fs.mkdirSync(path.dirname(santaProcessed), { recursive: true });

  execSync(`ffmpeg -y -i "${SANTA_AUDIO}" -t ${SANTA_CUT_DURATION} -af "asetrate=44100*0.95,aresample=44100,volume=1.1" "${santaProcessed}" 2>/dev/null`);
  console.log(`  ✓ Santa audio cut to ${SANTA_CUT_DURATION}s`);

  // Step 2: Render frames
  console.log(`[2/4] Rendering ${TOTAL_FRAMES} frames...`);
  const startTime = Date.now();

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const canvas = renderFrame(frame);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(FRAMES_DIR, `frame_${String(frame).padStart(5, '0')}.png`), buffer);

    if (frame % 100 === 0 || frame === TOTAL_FRAMES - 1) {
      const percent = ((frame + 1) / TOTAL_FRAMES * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r  Frame ${frame + 1}/${TOTAL_FRAMES} (${percent}%) - ${elapsed}s`);
    }
  }
  console.log('\n  ✓ Frames rendered');

  // Step 3: Create silent video from frames
  console.log('[3/4] Compiling video...');
  const tempVideo = path.join(OUTPUT_DIR, 'temp_video.mp4');

  execSync(`ffmpeg -y -framerate ${FPS} -i "${FRAMES_DIR}/frame_%05d.png" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${tempVideo}" 2>/dev/null`);
  console.log('  ✓ Video compiled');

  // Step 4: Add audio with proper timing
  console.log('[4/4] Adding Santa audio...');

  // Santa audio starts at TIMELINE.santaStart (6 seconds)
  // Add silence before, then Santa audio
  const audioFilter = `[1:a]adelay=${TIMELINE.santaStart * 1000}|${TIMELINE.santaStart * 1000}[santa];[santa]apad=whole_dur=${TOTAL_DURATION}[aout]`;

  execSync(`ffmpeg -y -i "${tempVideo}" -i "${santaProcessed}" -filter_complex "${audioFilter}" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -t ${TOTAL_DURATION} "${FINAL_VIDEO}"`, { stdio: 'pipe' });

  console.log('  ✓ Audio added');

  // Cleanup
  console.log('\nCleaning up...');
  fs.rmSync(FRAMES_DIR, { recursive: true });
  if (fs.existsSync(tempVideo)) fs.unlinkSync(tempVideo);

  // Verify output
  const stats = fs.statSync(FINAL_VIDEO);

  console.log('');
  console.log('='.repeat(70));
  console.log('VIDEO COMPLETE');
  console.log('='.repeat(70));
  console.log(`File: ${FINAL_VIDEO}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Duration: ${TOTAL_DURATION}s`);
  console.log('');
  console.log('Timeline:');
  console.log('  0:00-0:02 - Hook: "She feels invisible at school" (SILENCE)');
  console.log('  0:02-0:04 - Build: "Her mom asked Santa for help" (SILENCE)');
  console.log('  0:04-0:06 - Transition: "Listen to what he told her:"');
  console.log('  0:06-0:23 - Santa audio plays (golden light expands)');
  console.log('  0:23-0:27 - Emotional beat: "Every child deserves to feel seen"');
  console.log('  0:27-0:34 - CTA');
  console.log('');

  execSync(`open "${FINAL_VIDEO}"`);
}

main().catch(console.error);
