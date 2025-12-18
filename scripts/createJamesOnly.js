/**
 * Create James video only (retry after API error)
 */

require('dotenv').config();
const { createCanvas, registerFont } = require('canvas');
const axios = require('axios');
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
const AUDIO_DIR = path.join(OUTPUT_DIR, 'audio');

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const SANTA_VOICE_SETTINGS = {
  stability: 0.68,
  similarity_boost: 0.82,
  style: 0.32,
  use_speaker_boost: true
};

const config = {
  name: 'james',
  filename: '04_james_protecting_sister.mp4',
  childName: 'James',
  pronoun: 'him',
  possessive: 'His',
  hookText: 'James has been protecting his little sister',
  buildText: 'His mom asked Santa to celebrate him',
  santaLabelText: "James's Personalized Santa Message",
  colors: {
    darkStart: [15, 20, 40],
    darkEnd: [10, 15, 30],
    warmStart: [20, 50, 55],
    warmEnd: [15, 40, 45]
  },
  sparkleColor: [100, 180, 255],
  santaScript: `Ho ho ho, James. It's Santa Claus. Your mom told me what you did for your little sister, and I had to come talk to you myself. James, what you did took real courage. Standing up for someone you love, even when you're scared? That's what heroes do. Being brave doesn't mean you're not afraid. It means you do the right thing even when you are afraid. And that's exactly what you did. Protectors like you are rare and special, James. Your little sister is so lucky to have a big brother who loves her enough to stand up for her. That kind of love, that kind of bravery, that's a gift. I am so proud of you, James.`,
  cutDuration: 25.5
};

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
  const { color = '#FFFFFF', maxWidth = WIDTH * 0.85, lineHeight = 1.3 } = options;
  ctx.save();
  ctx.font = `${fontSize}px "Bodoni 72 Smallcaps, Georgia, serif"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 6;
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

function drawBackground(ctx, warmth, colors) {
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
}

async function main() {
  console.log('='.repeat(70));
  console.log('CREATING JAMES VIDEO (RETRY)');
  console.log('='.repeat(70));

  const framesDir = path.join(OUTPUT_DIR, 'frames-james');
  const santaAudioRaw = path.join(AUDIO_DIR, 'santa_james.mp3');
  const santaAudioProcessed = path.join(AUDIO_DIR, 'santa_james_processed.mp3');

  if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });

  // Generate audio
  console.log('[1/4] Generating Santa audio (IDENTICAL settings to Emma)...');
  console.log('  Using: stability=0.68, similarity_boost=0.82, style=0.32');

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
      text: config.santaScript,
      model_id: 'eleven_monolingual_v1',
      voice_settings: SANTA_VOICE_SETTINGS
    },
    responseType: 'arraybuffer',
    timeout: 60000
  });

  const rawPath = santaAudioRaw.replace('.mp3', '_raw.mp3');
  fs.writeFileSync(rawPath, Buffer.from(response.data));
  execSync(`ffmpeg -y -i "${rawPath}" -af "asetrate=44100*0.95,aresample=44100,volume=1.1" "${santaAudioRaw}"`, { stdio: 'pipe' });
  fs.unlinkSync(rawPath);

  const rawDuration = parseFloat(execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${santaAudioRaw}"`).toString().trim());
  console.log(`  ✓ Generated: santa_james.mp3 (${rawDuration.toFixed(1)}s)`);

  execSync(`ffmpeg -y -i "${santaAudioRaw}" -t ${config.cutDuration} -af "afade=t=in:st=0:d=1" "${santaAudioProcessed}"`, { stdio: 'pipe' });
  console.log(`  ✓ Processed: ${config.cutDuration}s with fade-in, clean cut`);

  const timeline = {
    hookEnd: 4, buildEnd: 8, transitionEnd: 11,
    santaStart: 11, santaEnd: 11 + config.cutDuration,
    bridgeEnd: 11 + config.cutDuration + 4,
    emotionalEnd: 11 + config.cutDuration + 8,
    ctaEnd: 11 + config.cutDuration + 18
  };

  const totalDuration = timeline.ctaEnd;
  const totalFrames = Math.ceil(totalDuration * FPS);

  console.log(`[2/4] Rendering ${totalFrames} frames (${totalDuration.toFixed(1)}s)...`);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const snowflakes = Array(80).fill(null).map(() => new Snowflake());
  const sparkles = Array(30).fill(null).map(() => new Sparkle(config.sparkleColor));

  const startTime = Date.now();

  for (let frame = 0; frame < totalFrames; frame++) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const time = frame / FPS;

    let phase, warmth = 0;
    if (time < timeline.hookEnd) phase = 'hook';
    else if (time < timeline.buildEnd) phase = 'build';
    else if (time < timeline.transitionEnd) { phase = 'transition'; warmth = (time - 8) / 3 * 0.5; }
    else if (time < timeline.santaEnd) { phase = 'santa'; warmth = 0.7; }
    else if (time < timeline.bridgeEnd) { phase = 'bridge'; warmth = 0.7; }
    else if (time < timeline.emotionalEnd) { phase = 'emotional'; warmth = 0.7; }
    else { phase = 'cta'; warmth = 0.3; }

    drawBackground(ctx, warmth, config.colors);

    for (const flake of snowflakes) { flake.update(); flake.draw(ctx, warmth); }
    if (warmth > 0.5) for (const sparkle of sparkles) { sparkle.update(); sparkle.draw(ctx); }

    switch (phase) {
      case 'hook': drawText(ctx, config.hookText, 110, HEIGHT * 0.35); break;
      case 'build': drawText(ctx, config.buildText, 100, HEIGHT * 0.35); break;
      case 'transition': drawText(ctx, `Listen to what he told ${config.pronoun}:`, 90, HEIGHT * 0.35); break;
      case 'santa': drawText(ctx, config.santaLabelText, 52, HEIGHT * 0.15, { color: 'rgba(255,255,255,0.8)' }); break;
      case 'bridge': drawText(ctx, "That's just the beginning... \u{1F90D}", 90, HEIGHT * 0.4); break;
      case 'emotional': drawText(ctx, 'Every child deserves to feel seen \u{2764}\u{FE0F}', 88, HEIGHT * 0.4); break;
      case 'cta':
        drawText(ctx, 'personalizedoutput.com', 92, HEIGHT * 0.20);
        drawText(ctx, "We'll create one for your child today", 58, HEIGHT * 0.33, { color: '#FFE4B5' });
        drawText(ctx, 'Deeply personalized. Instant delivery.', 54, HEIGHT * 0.45, { color: '#FFE4B5' });
        drawText(ctx, "Ready before Christmas \u{1F384}", 54, HEIGHT * 0.57, { color: '#FFE4B5' });
        drawText(ctx, '@PersonalizedOutput', 48, HEIGHT * 0.72, { color: 'rgba(255,255,255,0.9)' });
        break;
    }

    fs.writeFileSync(path.join(framesDir, `frame_${String(frame).padStart(5, '0')}.png`), canvas.toBuffer('image/png'));

    if (frame % 150 === 0 || frame === totalFrames - 1) {
      console.log(`  Frame ${frame + 1}/${totalFrames} (${((frame + 1) / totalFrames * 100).toFixed(1)}%) - ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    }
  }
  console.log('  ✓ Frames rendered');

  console.log('[3/4] Compiling video...');
  const videoOnly = path.join(OUTPUT_DIR, 'james_video.mp4');
  execSync(`ffmpeg -y -framerate ${FPS} -i "${framesDir}/frame_%05d.png" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "${videoOnly}"`, { stdio: 'pipe' });
  console.log('  ✓ Video compiled');

  console.log('[4/4] Adding Santa audio...');
  const finalVideo = path.join(FINAL_VIDEOS_DIR, config.filename);
  execSync(`ffmpeg -y -i "${videoOnly}" -i "${santaAudioProcessed}" -filter_complex "[1:a]adelay=${timeline.santaStart * 1000}|${timeline.santaStart * 1000}[delayed];[delayed]apad=whole_dur=${totalDuration}[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest "${finalVideo}"`, { stdio: 'pipe' });
  console.log('  ✓ Audio added');

  fs.rmSync(framesDir, { recursive: true });
  fs.unlinkSync(videoOnly);
  fs.unlinkSync(santaAudioProcessed);

  const stats = fs.statSync(finalVideo);
  const finalDuration = parseFloat(execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${finalVideo}"`).toString().trim());

  console.log('');
  console.log('='.repeat(70));
  console.log('✓ JAMES VIDEO COMPLETE');
  console.log('='.repeat(70));
  console.log(`File: ${config.filename}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Duration: ${finalDuration.toFixed(1)}s`);
  console.log(`Build text: "${config.buildText}"`);

  execSync(`open "${finalVideo}"`);
}

main().catch(console.error);
