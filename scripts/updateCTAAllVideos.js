/**
 * Update Emma, James, Sofia, Lily with bright CTA format
 * - Preserves their locked audio
 * - Removes "That's just the beginning"
 * - Adds bright burgundy CTA with gold sparkles and glow effect
 */

const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  registerFont('/System/Library/Fonts/Supplemental/Bodoni 72 Smallcaps Book.ttf', {
    family: 'Bodoni 72 Smallcaps',
    weight: 'normal'
  });
  console.log('✓ Bodoni 72 Smallcaps registered');
} catch (e) {
  console.log('⚠ Bodoni font not found');
}

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

const PROJECT_ROOT = '/Users/matthewriley/EtsyInnovations';
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'outputs/social-campaign-v2/santa');
const FINAL_VIDEOS_DIR = path.join(OUTPUT_DIR, 'final-videos');

const videos = [
  {
    name: 'emma',
    filename: '01_emma_invisible_at_school.mp4',
    childName: 'Emma',
    pronoun: 'her',
    hookText: "Emma feels invisible at school",
    buildText: 'Her dad asked Santa for help',
    santaLabelText: "Emma's Personalized Santa Message",
    colors: {
      darkStart: [25, 20, 45],
      darkEnd: [15, 10, 35],
      warmStart: [55, 35, 60],
      warmEnd: [40, 25, 50]
    },
    sparkleColor: [255, 182, 193]
  },
  {
    name: 'james',
    filename: '04_james_protecting_sister.mp4',
    childName: 'James',
    pronoun: 'him',
    hookText: "James worries about protecting his little sister",
    buildText: 'His parents asked Santa to help',
    santaLabelText: "James' Personalized Santa Message",
    colors: {
      darkStart: [20, 25, 45],
      darkEnd: [10, 15, 35],
      warmStart: [45, 40, 65],
      warmEnd: [30, 30, 55]
    },
    sparkleColor: [135, 206, 250]
  },
  {
    name: 'sofia',
    filename: '03_sofia_not_smart_enough.mp4',
    childName: 'Sofia',
    pronoun: 'her',
    hookText: "Sofia thinks she's not smart enough",
    buildText: 'Her mom asked Santa for help',
    santaLabelText: "Sofia's Personalized Santa Message",
    colors: {
      darkStart: [35, 20, 40],
      darkEnd: [25, 12, 30],
      warmStart: [65, 35, 55],
      warmEnd: [50, 25, 45]
    },
    sparkleColor: [255, 215, 0]
  },
  {
    name: 'lily',
    filename: '05_lily_just_moved.mp4',
    childName: 'Lily',
    pronoun: 'her',
    hookText: "Lily just moved and has no friends",
    buildText: 'Her mom asked Santa for help',
    santaLabelText: "Lily's Personalized Santa Message",
    colors: {
      darkStart: [40, 20, 35],
      darkEnd: [28, 12, 25],
      warmStart: [70, 35, 50],
      warmEnd: [55, 25, 40]
    },
    sparkleColor: [255, 182, 255]
  }
];

class Snowflake {
  constructor() { this.reset(true); }
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
    ctx.fillStyle = `rgba(255, ${255 - warmth * 10}, ${255 - warmth * 20}, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Sparkle {
  constructor(color) { this.color = color; this.reset(true); }
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

function drawText(ctx, text, fontSize, y, options = {}) {
  const { color = '#FFFFFF', maxWidth = WIDTH * 0.85, lineHeight = 1.3, glow = false } = options;
  ctx.save();
  ctx.font = `${fontSize}px "Bodoni 72 Smallcaps, Georgia, serif"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = glow ? 'rgba(255, 215, 0, 0.8)' : 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = glow ? 40 : 30;
  ctx.shadowOffsetY = glow ? 0 : 6;
  ctx.fillStyle = color;

  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  let startY = y - (lines.length * fontSize * lineHeight) / 2 + fontSize * lineHeight / 2;
  for (const line of lines) {
    ctx.fillText(line, WIDTH / 2, startY);
    startY += fontSize * lineHeight;
  }
  ctx.restore();
}

function drawBackground(ctx, warmth, colors, isCTA = false) {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);

  if (isCTA) {
    gradient.addColorStop(0, 'rgb(120, 30, 50)');
    gradient.addColorStop(0.5, 'rgb(140, 40, 60)');
    gradient.addColorStop(1, 'rgb(80, 20, 35)');
  } else if (warmth > 0.5) {
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
}

async function processVideo(config) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`UPDATING ${config.name.toUpperCase()} WITH BRIGHT CTA`);
  console.log('='.repeat(70));

  const originalVideo = path.join(FINAL_VIDEOS_DIR, config.filename);
  const framesDir = path.join(OUTPUT_DIR, `frames-${config.name}-update`);
  const extractedAudio = path.join(OUTPUT_DIR, `${config.name}_extracted_audio.aac`);
  const tempVideo = path.join(OUTPUT_DIR, `${config.name}_temp.mp4`);

  // Get original video duration and extract audio
  const videoDuration = parseFloat(execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${originalVideo}"`).toString().trim());
  console.log(`Original duration: ${videoDuration.toFixed(1)}s`);

  // Extract audio from original
  console.log('[1/4] Extracting audio from original...');
  execSync(`ffmpeg -y -i "${originalVideo}" -vn -acodec copy "${extractedAudio}"`, { stdio: 'pipe' });

  // Determine Santa audio duration by probing
  // We know the structure: hook(4s) + build(4s) + transition(3s) = 11s before Santa
  // Then Santa plays, then emotional(5s) + cta(10s) = 15s after
  // So Santa duration = videoDuration - 11 - 15 = videoDuration - 26 (for new format)
  // But old format had bridge(4s), so: videoDuration - 11 - 4 - 4 - 10 = old Santa duration

  // For the new format without bridge:
  // hook(4) + build(4) + transition(3) + santa + emotional(5) + cta(10)
  // Santa duration from old video: need to calculate based on old timeline
  // Old timeline: hook(4) + build(4) + transition(3) + santa + bridge(4) + emotional(4) + cta(10) = 29 + santa
  // So santa duration = videoDuration - 29

  const santaDuration = videoDuration - 29;
  console.log(`  Santa audio duration: ${santaDuration.toFixed(1)}s`);

  // New timeline without bridge
  const timeline = {
    hookEnd: 4,
    buildEnd: 8,
    transitionEnd: 11,
    santaStart: 11,
    santaEnd: 11 + santaDuration,
    emotionalEnd: 11 + santaDuration + 5,
    ctaEnd: 11 + santaDuration + 10
  };

  const totalDuration = timeline.ctaEnd;
  const totalFrames = Math.ceil(totalDuration * FPS);

  console.log(`[2/4] Rendering ${totalFrames} frames (${totalDuration.toFixed(1)}s)...`);

  if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const snowflakes = Array(80).fill(null).map(() => new Snowflake());
  const sparkles = Array(30).fill(null).map(() => new Sparkle(config.sparkleColor));
  const ctaSparkles = Array(50).fill(null).map(() => new Sparkle([255, 215, 0]));

  for (let frame = 0; frame < totalFrames; frame++) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const time = frame / FPS;

    let phase, warmth = 0;
    if (time < timeline.hookEnd) phase = 'hook';
    else if (time < timeline.buildEnd) phase = 'build';
    else if (time < timeline.transitionEnd) { phase = 'transition'; warmth = (time - 8) / 3 * 0.5; }
    else if (time < timeline.santaEnd) { phase = 'santa'; warmth = 0.7; }
    else if (time < timeline.emotionalEnd) { phase = 'emotional'; warmth = 0.7; }
    else { phase = 'cta'; warmth = 0.8; }

    const isCTA = phase === 'cta';
    drawBackground(ctx, warmth, config.colors, isCTA);

    for (const flake of snowflakes) { flake.update(); flake.draw(ctx, warmth); }
    if (warmth > 0.5) for (const sparkle of sparkles) { sparkle.update(); sparkle.draw(ctx); }
    if (isCTA) for (const sparkle of ctaSparkles) { sparkle.update(); sparkle.draw(ctx); }

    switch (phase) {
      case 'hook': drawText(ctx, config.hookText, 110, HEIGHT * 0.35); break;
      case 'build': drawText(ctx, config.buildText, 100, HEIGHT * 0.35); break;
      case 'transition': drawText(ctx, `Listen to what he told ${config.pronoun}:`, 90, HEIGHT * 0.35); break;
      case 'santa': drawText(ctx, config.santaLabelText, 52, HEIGHT * 0.15, { color: 'rgba(255,255,255,0.8)' }); break;
      case 'emotional': drawText(ctx, 'Every child deserves to feel seen \u{2764}\u{FE0F}', 88, HEIGHT * 0.4); break;
      case 'cta':
        drawText(ctx, "We'll create one for your child today", 78, HEIGHT * 0.18, { color: '#FFFFFF', glow: true });
        drawText(ctx, "Ready before Christmas \u{1F384}", 68, HEIGHT * 0.32, { color: '#FFD700' });
        drawText(ctx, 'personalizedoutput.com', 92, HEIGHT * 0.48);
        drawText(ctx, 'Deeply personalized. Instant delivery.', 54, HEIGHT * 0.62, { color: '#FFE4B5' });
        drawText(ctx, '@PersonalizedOutput', 48, HEIGHT * 0.76, { color: 'rgba(255,255,255,0.9)' });
        break;
    }

    fs.writeFileSync(path.join(framesDir, `frame_${String(frame).padStart(5, '0')}.png`), canvas.toBuffer('image/png'));

    if (frame % 300 === 0 || frame === totalFrames - 1) {
      console.log(`  Frame ${frame + 1}/${totalFrames} (${((frame + 1) / totalFrames * 100).toFixed(0)}%)`);
    }
  }

  console.log('[3/4] Compiling video...');
  execSync(`ffmpeg -y -framerate ${FPS} -i "${framesDir}/frame_%05d.png" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "${tempVideo}"`, { stdio: 'pipe' });

  console.log('[4/4] Adding original audio...');
  // Combine with extracted audio, trimming to new duration
  execSync(`ffmpeg -y -i "${tempVideo}" -i "${extractedAudio}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t ${totalDuration} "${originalVideo}"`, { stdio: 'pipe' });

  // Cleanup
  fs.rmSync(framesDir, { recursive: true });
  fs.unlinkSync(tempVideo);
  fs.unlinkSync(extractedAudio);

  const finalDuration = parseFloat(execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${originalVideo}"`).toString().trim());
  console.log(`✓ ${config.name.toUpperCase()} COMPLETE: ${finalDuration.toFixed(1)}s`);
}

async function main() {
  console.log('='.repeat(70));
  console.log('UPDATING ALL VIDEOS WITH BRIGHT CTA');
  console.log('='.repeat(70));
  console.log('- Preserving locked audio');
  console.log('- Removing "That\'s just the beginning"');
  console.log('- Adding bright burgundy CTA with glow');

  for (const video of videos) {
    await processVideo(video);
  }

  console.log('\n' + '='.repeat(70));
  console.log('ALL VIDEOS UPDATED!');
  console.log('='.repeat(70));
}

main().catch(console.error);
