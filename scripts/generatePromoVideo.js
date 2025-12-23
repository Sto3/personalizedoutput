/**
 * Generate TikTok Promo Video
 *
 * Takes screenshots of the promo HTML animation at 30fps
 * and combines them into an MP4 video using ffmpeg.
 *
 * Output: 1080x1920 vertical video, ~46 seconds
 *
 * Usage:
 *   node generatePromoVideo.js                    # Generate vision board video
 *   node generatePromoVideo.js --template=santa   # Generate Santa message video
 *   node generatePromoVideo.js --template=all     # Generate both videos
 */

const puppeteer = require('puppeteer');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FRAMES_DIR = path.join(__dirname, 'promo-frames');
const OUTPUT_DIR = path.join(__dirname, '../outputs/social-campaign-v2');

const FPS = 30;
const DURATION = 46; // seconds (updated from 37)
const TOTAL_FRAMES = FPS * DURATION;

// Template configurations
const TEMPLATES = {
  'vision-board': {
    htmlFile: path.join(__dirname, 'promo-video.html'),
    outputName: 'tiktok-promo-vision-board-newyear.mp4',
    description: 'Vision Board + New Year\'s Theme'
  },
  'santa': {
    htmlFile: path.join(__dirname, 'promo-santa.html'),
    outputName: 'tiktok-promo-santa-message.mp4',
    description: 'Santa Message - Christmas Theme'
  }
};

async function generateVideo(templateKey) {
  const template = TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Unknown template: ${templateKey}. Available: ${Object.keys(TEMPLATES).join(', ')}`);
  }

  console.log('='.repeat(60));
  console.log(`TIKTOK PROMO VIDEO GENERATOR`);
  console.log(`Template: ${template.description}`);
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

  console.log(`Loading HTML: ${path.basename(template.htmlFile)}`);
  await page.goto(`file://${template.htmlFile}`, {
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
      const second = i / FPS;
      console.log(`  ${progress}% (${second}s/${DURATION}s) - ${elapsed}s elapsed`);
    }

    // Wait for animation to progress (simulate real-time playback)
    await new Promise(r => setTimeout(r, 1000 / FPS));
  }

  const captureTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nCapture complete in ${captureTime}s`);

  await browser.close();

  // Combine frames into video using ffmpeg
  console.log('\nCombining frames into video...');
  const outputPath = path.join(OUTPUT_DIR, template.outputName);

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

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let templateArg = 'vision-board'; // default

  for (const arg of args) {
    if (arg.startsWith('--template=')) {
      templateArg = arg.split('=')[1];
    }
  }

  try {
    if (templateArg === 'all') {
      // Generate both videos
      console.log('\n' + '='.repeat(60));
      console.log('GENERATING BOTH VIDEO TEMPLATES');
      console.log('='.repeat(60) + '\n');

      const outputs = [];

      // Vision Board first
      console.log('\n[1/2] Vision Board + New Year\'s Theme\n');
      const vbOutput = await generateVideo('vision-board');
      outputs.push(vbOutput);

      // Santa second
      console.log('\n[2/2] Santa Message - Christmas Theme\n');
      const santaOutput = await generateVideo('santa');
      outputs.push(santaOutput);

      console.log('\n' + '='.repeat(60));
      console.log('ALL VIDEOS COMPLETE!');
      console.log('='.repeat(60));
      outputs.forEach(o => console.log(`  - ${o}`));

    } else {
      // Generate single video
      await generateVideo(templateArg);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Run
main();
