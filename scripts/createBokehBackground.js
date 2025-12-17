/**
 * Create Animated Bokeh Background
 *
 * Generates a series of frames with floating, glowing bokeh circles
 * that create a warm, festive, premium feel.
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Video settings
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 25;
const DURATION = 50; // seconds (enough for 45+ second video)
const TOTAL_FRAMES = FPS * DURATION;

// Output directory for frames
const FRAMES_DIR = 'outputs/social-videos/bokeh-frames';
const OUTPUT_VIDEO = 'outputs/social-videos/bokeh_background.mp4';

// Bokeh particle settings
const NUM_PARTICLES = 40;

// Warm festive color palette
const COLORS = [
  { r: 255, g: 200, b: 100, a: 0.3 },  // Warm gold
  { r: 255, g: 150, b: 80, a: 0.25 },   // Soft orange
  { r: 255, g: 100, b: 100, a: 0.2 },   // Soft red
  { r: 255, g: 220, b: 180, a: 0.35 },  // Cream
  { r: 255, g: 255, b: 200, a: 0.2 },   // Warm white
  { r: 200, g: 80, b: 80, a: 0.15 },    // Deep red
];

// Particle class for bokeh circles
class BokehParticle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * WIDTH;
    this.y = Math.random() * HEIGHT;
    this.size = 20 + Math.random() * 120; // Varying sizes
    this.speedX = (Math.random() - 0.5) * 0.5; // Slow horizontal drift
    this.speedY = -0.2 - Math.random() * 0.3; // Gentle upward float
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.pulseOffset = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.02 + Math.random() * 0.02;
    this.blur = 10 + Math.random() * 30; // Depth blur
  }

  update(frame) {
    this.x += this.speedX;
    this.y += this.speedY;

    // Wrap around edges
    if (this.y < -this.size) {
      this.y = HEIGHT + this.size;
      this.x = Math.random() * WIDTH;
    }
    if (this.x < -this.size) this.x = WIDTH + this.size;
    if (this.x > WIDTH + this.size) this.x = -this.size;
  }

  draw(ctx, frame) {
    // Pulsing alpha
    const pulse = Math.sin(frame * this.pulseSpeed + this.pulseOffset) * 0.1 + 0.9;
    const alpha = this.color.a * pulse;

    // Create gradient for soft bokeh effect
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.size
    );

    gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`);
    gradient.addColorStop(0.4, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * 0.6})`);
    gradient.addColorStop(0.7, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * 0.2})`);
    gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Create particles
const particles = [];
for (let i = 0; i < NUM_PARTICLES; i++) {
  particles.push(new BokehParticle());
}

// Sort by size (smaller = further = render first)
particles.sort((a, b) => a.size - b.size);

function drawBackground(ctx, frame) {
  // Deep, warm gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);

  // Subtle color shift over time for life
  const shift = Math.sin(frame * 0.01) * 10;

  gradient.addColorStop(0, `rgb(${40 + shift}, ${15}, ${20})`);      // Deep burgundy top
  gradient.addColorStop(0.5, `rgb(${30 + shift/2}, ${10}, ${15})`);  // Darker middle
  gradient.addColorStop(1, `rgb(${20}, ${8}, ${12})`);               // Almost black bottom

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Add subtle vignette
  const vignette = ctx.createRadialGradient(
    WIDTH / 2, HEIGHT / 2, HEIGHT * 0.3,
    WIDTH / 2, HEIGHT / 2, HEIGHT * 0.9
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function renderFrame(frameNum) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Draw background
  drawBackground(ctx, frameNum);

  // Update and draw particles
  for (const particle of particles) {
    particle.update(frameNum);
    particle.draw(ctx, frameNum);
  }

  // Add very subtle noise/grain for warmth
  ctx.globalAlpha = 0.02;
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * WIDTH;
    const y = Math.random() * HEIGHT;
    const brightness = Math.random() * 255;
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;

  return canvas;
}

async function main() {
  console.log('='.repeat(60));
  console.log('CREATING ANIMATED BOKEH BACKGROUND');
  console.log('='.repeat(60));
  console.log(`Resolution: ${WIDTH}x${HEIGHT}`);
  console.log(`Duration: ${DURATION}s @ ${FPS}fps = ${TOTAL_FRAMES} frames`);
  console.log(`Particles: ${NUM_PARTICLES}`);
  console.log('');

  // Create frames directory
  if (fs.existsSync(FRAMES_DIR)) {
    console.log('Cleaning old frames...');
    fs.rmSync(FRAMES_DIR, { recursive: true });
  }
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  // Render frames
  console.log('Rendering frames...');
  const startTime = Date.now();

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const canvas = renderFrame(frame);
    const buffer = canvas.toBuffer('image/png');
    const filename = `frame_${String(frame).padStart(5, '0')}.png`;
    fs.writeFileSync(path.join(FRAMES_DIR, filename), buffer);

    // Progress update every 100 frames
    if (frame % 100 === 0 || frame === TOTAL_FRAMES - 1) {
      const percent = ((frame + 1) / TOTAL_FRAMES * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r  Frame ${frame + 1}/${TOTAL_FRAMES} (${percent}%) - ${elapsed}s elapsed`);
    }
  }

  console.log('\n');
  console.log('Compiling video with FFmpeg...');

  // Compile frames into video
  execSync(`ffmpeg -y -framerate ${FPS} -i "${FRAMES_DIR}/frame_%05d.png" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${OUTPUT_VIDEO}"`, { stdio: 'inherit' });

  console.log('');
  console.log('='.repeat(60));
  console.log(`✓ Bokeh background created: ${OUTPUT_VIDEO}`);
  console.log('='.repeat(60));

  // Clean up frames to save space
  console.log('Cleaning up frames...');
  fs.rmSync(FRAMES_DIR, { recursive: true });

  // Open the video
  execSync(`open "${OUTPUT_VIDEO}"`);
}

main().catch(console.error);
