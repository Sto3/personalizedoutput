/**
 * Create Vision Board Social Videos
 *
 * Adapted from Santa video template for visual reveal instead of audio.
 * ~30 seconds per video with board reveal as the visual payoff.
 */

require('dotenv').config();
const { createCanvas, registerFont, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Register fonts
try {
  registerFont('/System/Library/Fonts/Supplemental/Bodoni 72 Smallcaps Book.ttf', {
    family: 'Bodoni 72 Smallcaps',
    weight: 'normal'
  });
  registerFont('/System/Library/Fonts/Supplemental/Snell Roundhand.ttf', {
    family: 'Snell Roundhand',
    weight: 'normal'
  });
  console.log('✓ Fonts registered');
} catch (e) {
  console.log('⚠ Some fonts not found:', e.message);
}

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

const PROJECT_ROOT = '/Users/matthewriley/EtsyInnovations';
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'outputs/social-campaign-v2/vision-boards');
const BOARDS_DIR = path.join(OUTPUT_DIR, 'boards');
const FINAL_VIDEOS_DIR = path.join(OUTPUT_DIR, 'final-videos');

// Video configurations
const VIDEOS = [
  {
    id: 'built_different',
    filename: '01_built_different_men.mp4',
    boardFile: 'marcus_built_different.png',
    name: 'Marcus',
    pronoun: 'him',
    hookText: "Marcus was tired of being average",
    buildText: "He told us his vision",
    mantraWords: ["FOCUS", "DISCIPLINE", "EXECUTE"],
    revealText: "We built this for him",
    colors: {
      background: [10, 10, 15],
      accent: [201, 169, 98],  // Gold
      text: '#FFFFFF'
    },
    style: 'masculine',
    sparkleColor: [201, 169, 98]
  },
  {
    id: 'glow_up',
    filename: '02_glow_up_women.mp4',
    boardFile: 'sofia_glow_up.png',
    name: 'Sofia',
    pronoun: 'her',
    hookText: "Sofia decided 2026 is her year",
    buildText: "She told us her vision",
    mantraWords: ["SHINE", "GROW", "BLOOM"],
    revealText: "We built this for her",
    colors: {
      background: [255, 245, 247],
      accent: [232, 180, 184],  // Rose
      text: '#6b4045'
    },
    style: 'feminine',
    sparkleColor: [255, 182, 193]
  },
  {
    id: 'relationship_reset',
    filename: '03_relationship_reset_couples.mp4',
    boardFile: 'emma_noah_relationship_reset.png',
    name: 'Emma & Noah',
    pronoun: 'them',
    hookText: "They'd lost their spark",
    buildText: "They told us their vision",
    mantraWords: ["GROW", "CONNECT", "THRIVE"],
    revealText: "We built this for them",
    colors: {
      background: [250, 246, 241],
      accent: [156, 124, 92],  // Warm brown
      text: '#5a4a3a'
    },
    style: 'romantic',
    sparkleColor: [212, 165, 116]
  },
  {
    id: 'new_year_2026',
    filename: '04_new_year_2026_women.mp4',
    boardFile: 'sarah_new_year_2026.png',
    name: 'Sarah',
    pronoun: 'her',
    hookText: "New year. Same excuses? Not for Sarah.",
    buildText: "She told us her 2026 vision",
    mantraWords: ["DREAM", "BELIEVE", "ACHIEVE"],
    revealText: "We built this for her",
    colors: {
      background: [253, 248, 240],
      accent: [184, 134, 11],  // Gold
      text: '#5a4a2a'
    },
    style: 'feminine',
    sparkleColor: [255, 215, 0]
  },
  {
    id: 'fitness',
    filename: '05_fitness_women.mp4',
    boardFile: 'maya_fitness.png',
    name: 'Maya',
    pronoun: 'her',
    hookText: "Maya was done starting over",
    buildText: "She told us her vision",
    mantraWords: ["STRONG", "CONSISTENT", "UNSTOPPABLE"],
    revealText: "We built this for her",
    colors: {
      background: [240, 245, 245],
      accent: [45, 140, 140],  // Teal
      text: '#2a4a4a'
    },
    style: 'athletic',
    sparkleColor: [78, 205, 196]
  }
];

// Timeline (in seconds)
const TIMELINE = {
  hookEnd: 4,
  buildEnd: 8,
  mantraEnd: 11,
  revealStart: 11,
  revealEnd: 18,  // 7 seconds on board
  bridgeEnd: 22,
  ctaEnd: 30
};

class Particle {
  constructor(color, isCTA = false) {
    this.color = color;
    this.isCTA = isCTA;
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * WIDTH;
    this.y = initial ? Math.random() * HEIGHT : -10;
    this.size = Math.random() * (this.isCTA ? 4 : 3) + 1;
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
  const {
    color = '#FFFFFF',
    maxWidth = WIDTH * 0.85,
    lineHeight = 1.3,
    glow = false,
    font = 'Bodoni 72 Smallcaps',
    align = 'center'
  } = options;

  ctx.save();
  ctx.font = `${fontSize}px "${font}", Georgia, serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = glow ? 'rgba(255, 215, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = glow ? 40 : 20;
  ctx.shadowOffsetY = glow ? 0 : 4;
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
  const x = align === 'center' ? WIDTH / 2 : (align === 'left' ? 60 : WIDTH - 60);
  for (const line of lines) {
    ctx.fillText(line, x, startY);
    startY += fontSize * lineHeight;
  }
  ctx.restore();
}

function drawMantra(ctx, words, progress, accentColor) {
  const fontSize = 72;
  const spacing = 100;
  const startY = HEIGHT * 0.35;

  ctx.save();
  ctx.font = `${fontSize}px "Bodoni 72 Smallcaps", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  words.forEach((word, i) => {
    const wordProgress = Math.max(0, Math.min(1, (progress * words.length) - i));
    const alpha = wordProgress;
    const scale = 0.8 + wordProgress * 0.2;

    const y = startY + i * spacing;

    ctx.save();
    ctx.translate(WIDTH / 2, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    // Glow effect
    ctx.shadowColor = `rgba(${accentColor[0]}, ${accentColor[1]}, ${accentColor[2]}, 0.6)`;
    ctx.shadowBlur = 30;
    ctx.fillStyle = `rgb(${accentColor[0]}, ${accentColor[1]}, ${accentColor[2]})`;
    ctx.fillText(word, 0, 0);

    ctx.restore();
  });

  ctx.restore();
}

function drawBackground(ctx, colors, style, isCTA = false) {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);

  if (isCTA) {
    // Bright burgundy CTA background (like Santa videos)
    gradient.addColorStop(0, 'rgb(120, 30, 50)');
    gradient.addColorStop(0.5, 'rgb(140, 40, 60)');
    gradient.addColorStop(1, 'rgb(80, 20, 35)');
  } else if (style === 'masculine') {
    // Dark/black for men's boards
    gradient.addColorStop(0, `rgb(${colors.background[0]}, ${colors.background[1]}, ${colors.background[2]})`);
    gradient.addColorStop(1, 'rgb(5, 5, 8)');
  } else {
    // Soft gradient for women's/romantic boards
    const r = colors.background[0];
    const g = colors.background[1];
    const b = colors.background[2];
    gradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
    gradient.addColorStop(1, `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

async function createVideo(config) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`CREATING: ${config.id.toUpperCase()}`);
  console.log(`Board: ${config.boardFile}`);
  console.log('='.repeat(70));

  const framesDir = path.join(OUTPUT_DIR, `frames-${config.id}`);
  const boardPath = path.join(BOARDS_DIR, config.boardFile);

  // Check if board exists
  if (!fs.existsSync(boardPath)) {
    console.log(`❌ Board not found: ${boardPath}`);
    console.log('   Please generate boards first with: node scripts/generateSocialVisionBoards.js');
    return null;
  }

  // Load the vision board image
  const boardImage = await loadImage(boardPath);

  // Setup
  if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const totalFrames = Math.ceil(TIMELINE.ctaEnd * FPS);
  const particles = Array(40).fill(null).map(() => new Particle(config.sparkleColor));
  const ctaParticles = Array(50).fill(null).map(() => new Particle([255, 215, 0], true));

  console.log(`[1/3] Rendering ${totalFrames} frames...`);

  for (let frame = 0; frame < totalFrames; frame++) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const time = frame / FPS;

    let phase;
    if (time < TIMELINE.hookEnd) phase = 'hook';
    else if (time < TIMELINE.buildEnd) phase = 'build';
    else if (time < TIMELINE.mantraEnd) phase = 'mantra';
    else if (time < TIMELINE.revealEnd) phase = 'reveal';
    else if (time < TIMELINE.bridgeEnd) phase = 'bridge';
    else phase = 'cta';

    const isCTA = phase === 'cta';
    drawBackground(ctx, config.colors, config.style, isCTA);

    // Draw particles
    if (phase !== 'reveal') {
      for (const p of particles) { p.update(); p.draw(ctx); }
    }
    if (isCTA) {
      for (const p of ctaParticles) { p.update(); p.draw(ctx); }
    }

    // Determine text color based on style
    const textColor = config.style === 'masculine' ? '#FFFFFF' : config.colors.text;
    const ctaTextColor = '#FFFFFF';

    switch (phase) {
      case 'hook':
        drawText(ctx, config.hookText, 90, HEIGHT * 0.4, { color: textColor });
        break;

      case 'build':
        drawText(ctx, config.buildText, 85, HEIGHT * 0.4, { color: textColor });
        break;

      case 'mantra':
        const mantraProgress = (time - TIMELINE.buildEnd) / (TIMELINE.mantraEnd - TIMELINE.buildEnd);
        drawMantra(ctx, config.mantraWords, mantraProgress, config.sparkleColor);
        break;

      case 'reveal':
        // Draw the vision board with subtle zoom
        const revealProgress = (time - TIMELINE.mantraEnd) / (TIMELINE.revealEnd - TIMELINE.mantraEnd);
        const scale = 1 + revealProgress * 0.05;  // Subtle zoom from 1.0 to 1.05

        // Calculate dimensions to fit board in frame with padding
        const padding = 80;
        const maxWidth = WIDTH - padding * 2;
        const maxHeight = HEIGHT - padding * 2 - 200;  // Leave room for text

        const boardAspect = boardImage.width / boardImage.height;
        let drawWidth, drawHeight;

        if (boardAspect > maxWidth / maxHeight) {
          drawWidth = maxWidth;
          drawHeight = maxWidth / boardAspect;
        } else {
          drawHeight = maxHeight;
          drawWidth = maxHeight * boardAspect;
        }

        drawWidth *= scale;
        drawHeight *= scale;

        const drawX = (WIDTH - drawWidth) / 2;
        const drawY = (HEIGHT - drawHeight) / 2 + 50;

        // Draw shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 10;
        ctx.drawImage(boardImage, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        // Draw label at top
        drawText(ctx, config.revealText, 48, 100, { color: textColor });
        break;

      case 'bridge':
        drawText(ctx, "Your vision. Your board. ✨", 80, HEIGHT * 0.4, { color: textColor });
        break;

      case 'cta':
        // Bright CTA screen with glow
        drawText(ctx, "We'll create yours today", 78, HEIGHT * 0.18, { color: ctaTextColor, glow: true });
        drawText(ctx, "Start 2026 with clarity 🎯", 68, HEIGHT * 0.32, { color: '#FFD700' });
        drawText(ctx, 'personalizedoutput.com', 92, HEIGHT * 0.48, { color: ctaTextColor });
        drawText(ctx, 'Deeply personalized. Instant delivery.', 54, HEIGHT * 0.62, { color: '#FFE4B5' });
        drawText(ctx, '@PersonalizedOutput', 48, HEIGHT * 0.76, { color: 'rgba(255,255,255,0.9)' });
        break;
    }

    fs.writeFileSync(
      path.join(framesDir, `frame_${String(frame).padStart(5, '0')}.png`),
      canvas.toBuffer('image/png')
    );

    if (frame % 150 === 0 || frame === totalFrames - 1) {
      console.log(`  Frame ${frame + 1}/${totalFrames} (${((frame + 1) / totalFrames * 100).toFixed(0)}%)`);
    }
  }

  console.log('[2/3] Compiling video...');
  const finalVideo = path.join(FINAL_VIDEOS_DIR, config.filename);

  // Compile frames to video (no audio for vision board videos, or add soft music later)
  execSync(`ffmpeg -y -framerate ${FPS} -i "${framesDir}/frame_%05d.png" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "${finalVideo}"`, { stdio: 'pipe' });

  console.log('[3/3] Cleaning up...');
  fs.rmSync(framesDir, { recursive: true });

  const stats = fs.statSync(finalVideo);
  const duration = parseFloat(execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${finalVideo}"`).toString().trim());

  console.log(`✓ ${config.id.toUpperCase()} COMPLETE`);
  console.log(`  Duration: ${duration.toFixed(1)}s | Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  return finalVideo;
}

async function main() {
  console.log('='.repeat(70));
  console.log('VISION BOARD VIDEO GENERATOR');
  console.log('Creating 5 videos for social campaign');
  console.log('='.repeat(70));

  // Ensure output directory exists
  if (!fs.existsSync(FINAL_VIDEOS_DIR)) {
    fs.mkdirSync(FINAL_VIDEOS_DIR, { recursive: true });
  }

  const results = [];

  for (const video of VIDEOS) {
    try {
      const result = await createVideo(video);
      results.push({ id: video.id, success: !!result, path: result });
    } catch (error) {
      console.error(`❌ Failed: ${video.id}:`, error.message);
      results.push({ id: video.id, success: false, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('ALL VIDEOS COMPLETE');
  console.log('='.repeat(70));
  console.log(`Successful: ${results.filter(r => r.success).length}/${VIDEOS.length}`);
  results.forEach(r => {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.id}: ${r.path || r.error}`);
  });

  // Open the first video to preview
  if (results[0]?.path) {
    execSync(`open "${results[0].path}"`);
  }
}

main().catch(console.error);
