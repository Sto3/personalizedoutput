/**
 * Generate TikTok Promo Video
 *
 * Takes screenshots of the promo-video.html animation at 30fps
 * and combines them into an MP4 video using ffmpeg.
 *
 * Output: 1080x1920 vertical video, ~37 seconds
 */

const puppeteer = require('puppeteer');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FRAMES_DIR = path.join(__dirname, 'promo-frames');
const OUTPUT_DIR = path.join(__dirname, '../outputs/social-campaign-v2');
const HTML_FILE = path.join(__dirname, 'promo-video.html');

const FPS = 30;
const DURATION = 37; // seconds
const TOTAL_FRAMES = FPS * DURATION;

async function generateVideo() {
  console.log('='.repeat(60));
  console.log('TIKTOK PROMO VIDEO GENERATOR');
  console.log('='.repeat(60));
  console.log(`Target: ${TOTAL_FRAMES} frames at ${FPS}fps (${DURATION}s)`);

  // Create frames directory
  if (fs.existsSync(FRAMES_DIR)) {
    console.log('Cleaning old frames...');
    fs.rmSync(FRAMES_DIR, { recursive: true });
  }
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('\nLaunching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920 });

  console.log('Loading HTML...');
  await page.goto(`file://${HTML_FILE}`, {
    waitUntil: 'networkidle0'
  });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);
  console.log('Fonts loaded.\n');

  console.log(`Capturing ${TOTAL_FRAMES} frames...`);
  const startTime = Date.now();

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const frameNumber = String(i).padStart(5, '0');
    const framePath = path.join(FRAMES_DIR, `frame_${frameNumber}.png`);

    await page.screenshot({
      path: framePath,
      type: 'png'
    });

    // Progress at each second
    if (i > 0 && i % FPS === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const progress = ((i / TOTAL_FRAMES) * 100).toFixed(0);
      console.log(`  ${progress}% (${i}/${TOTAL_FRAMES} frames) - ${elapsed}s elapsed`);
    }

    // Wait for animation to progress (simulate real-time playback)
    await new Promise(r => setTimeout(r, 1000 / FPS));
  }

  const captureTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nCapture complete in ${captureTime}s`);

  await browser.close();

  // Combine frames into video using ffmpeg
  console.log('\nCombining frames into video...');
  const outputPath = path.join(OUTPUT_DIR, 'tiktok-promo-lastminute-gift.mp4');

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-framerate', String(FPS),
      '-i', path.join(FRAMES_DIR, 'frame_%05d.png'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '18',
      '-preset', 'medium',
      outputPath
    ]);

    ffmpeg.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    ffmpeg.stderr.on('data', (data) => {
      // ffmpeg outputs progress to stderr
      const str = data.toString();
      if (str.includes('frame=')) {
        process.stdout.write('.');
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('\n');
        console.log('='.repeat(60));
        console.log('SUCCESS!');
        console.log('='.repeat(60));
        console.log(`Output: ${outputPath}`);

        // Get file size
        const stats = fs.statSync(outputPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`Size: ${sizeMB} MB`);

        // Clean up frames
        console.log('\nCleaning up frames...');
        fs.rmSync(FRAMES_DIR, { recursive: true });
        console.log('Done!');

        resolve(outputPath);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

// Run
generateVideo()
  .then(outputPath => {
    console.log(`\nVideo ready: ${outputPath}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
