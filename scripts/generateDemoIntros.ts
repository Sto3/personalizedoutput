#!/usr/bin/env npx ts-node
/**
 * Demo INTRO Generator (NOT full lessons)
 *
 * Creates 40-second PREVIEW intros that:
 * 1. Show personalization ("Hi Joe, I know you love dinosaurs...")
 * 2. Tease the connection ("...and we're going to use that to teach fractions")
 * 3. Make it clear this is a PREVIEW of a deeper experience
 *
 * Voice Quality Focus:
 * - Uses WARM conversational voices (River, Will, Roger)
 * - SLOW pacing with natural pauses
 * - High style settings for emotional warmth
 * - Sounds like a real person, NOT like Siri
 *
 * Usage:
 *   npx ts-node scripts/generateDemoIntros.ts [demo-name]
 *   npx ts-node scripts/generateDemoIntros.ts all
 *   npx ts-node scripts/generateDemoIntros.ts joe
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import {
  ELEVENLABS_MODELS,
  NATURAL_VOICE_SETTINGS,
  WARM_VOICES,
  VIDEO_END_CTA
} from '../src/video/voiceConfig';
import { VISUAL_STYLES } from '../src/video/videoGenerator';

const OUTPUT_DIR = path.join(__dirname, '..', 'outputs', 'demos');
const AUDIO_DIR = path.join(__dirname, '..', 'outputs', 'audio');
const PUBLIC_DEMOS = path.join(__dirname, '..', 'public', 'demos');

// Ensure directories exist
[OUTPUT_DIR, AUDIO_DIR, PUBLIC_DEMOS].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * DEMO INTRO Scripts
 *
 * These are 40-SECOND PREVIEWS that:
 * 1. Personalize immediately (Hi [Name]!)
 * 2. Show we know their interest
 * 3. Tease the learning connection
 * 4. Make clear: "Your full 10-minute lesson is ready"
 *
 * PACING: Use "..." for pauses. More dots = longer pause.
 * This creates natural breathing rhythm.
 */
interface DemoIntro {
  id: string;
  name: string;
  interest: string;
  subject: string;
  targetAudience: 'kid' | 'adult';
  voiceKey: keyof typeof WARM_VOICES;
  visualStyle: keyof typeof VISUAL_STYLES;
  // Script with "..." for pauses - SLOW PACING
  script: string;
}

const DEMO_INTROS: DemoIntro[] = [
  {
    id: 'joe_dinosaurs_fractions',
    name: 'Joe',
    interest: 'dinosaurs',
    subject: 'fractions',
    targetAudience: 'kid',
    voiceKey: 'will',  // Young, chill, friendly male - perfect for kids
    visualStyle: 'gradient_warm',
    // PREMIUM SCRIPT - sophisticated, warm, intelligent
    script: `Hey Joe... ...

I heard you love dinosaurs. ... Me too. ...

So here's something interesting... ...

T-Rex? ... Could eat about one-fourth of its body weight... in a single bite. ...

One-fourth... that's a fraction. ...

And if a Brontosaurus shared its lunch... with three friends... each friend gets one-fourth too. ...

You're already thinking in fractions... ...

This preview is about forty seconds... ... your full lesson goes deeper... thirty minutes of dinosaur math... ...

Ready when you are, Joe.`
  },
  {
    id: 'maya_art_solar_system',
    name: 'Maya',
    interest: 'art',
    subject: 'solar system',
    targetAudience: 'kid',
    voiceKey: 'matilda',  // Warm, upbeat female - great for creative content
    visualStyle: 'gradient_purple',
    // PREMIUM SCRIPT - sophisticated, warm, intelligent
    script: `Hey Maya... ...

I know you're an artist... ...

So picture this... ...

Your canvas. ... In the center... a huge, warm, yellow sun. ... That's your star. ...

Now... eight planets swirling around it. ... Each one a different color... ...

Rusty red Mars. ... Swirly blue Neptune. ... Golden Saturn... with those gorgeous rings. ...

The solar system is already a masterpiece. ... ...

This preview gives you a glimpse... ... your full thirty-minute lesson shows you how to paint it... ...

Ready when you are, Maya.`
  },
  {
    id: 'sarah_bakery_mortgage',
    name: 'Sarah',
    interest: 'bakery business',
    subject: 'mortgages',
    targetAudience: 'adult',
    voiceKey: 'roger',  // Classy, warm male - perfect for professional adult content
    visualStyle: 'gradient_dark',
    // PREMIUM SCRIPT - sophisticated, warm, intelligent
    script: `Hi Sarah... ...

You run a bakery. ... And mortgages have always felt... confusing. ...

But here's the thing... ...

You already understand mortgages... you just don't know it yet. ...

When you borrow flour from your supplier... and pay it back over time... that's essentially what a mortgage is. ...

The flour is your principal... the original amount. ...

The interest? ... That's like the delivery fee... for having that flour available when you needed it. ...

This preview is just the beginning... ...

Your full thirty-minute lesson... explains amortization, equity, refinancing... all through your bakery. ...

Ready when you are, Sarah.`
  }
];

/**
 * Generate voiceover with MAXIMUM naturalness
 * Uses warm voices and slow pacing settings
 */
async function generateNaturalVoiceover(
  text: string,
  voiceId: string,
  voiceName: string,
  outputPath: string
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  // Use demo_intro settings for maximum naturalness
  const voiceSettings = NATURAL_VOICE_SETTINGS.demo_intro;

  console.log(`[TTS] Generating with ${voiceName} (ultra-natural mode)...`);
  console.log(`[TTS] Settings: stability=${voiceSettings.stability}, style=${voiceSettings.style}`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text,
      // CRITICAL: Use multilingual_v2 for BEST quality
      model_id: ELEVENLABS_MODELS.MULTILINGUAL_V2,
      voice_settings: voiceSettings
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const audioBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(audioBuffer));

  console.log(`[TTS] Audio saved: ${outputPath}`);
  return outputPath;
}

/**
 * Generate a demo intro video
 */
async function generateDemoIntro(demo: DemoIntro): Promise<string> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`GENERATING INTRO: ${demo.name} (${demo.interest} → ${demo.subject})`);
  console.log(`${'═'.repeat(60)}\n`);

  const videoId = `intro_${demo.id}_${Date.now()}`;
  const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`);
  const tempVideoPath = path.join(OUTPUT_DIR, `${videoId}_temp.mp4`);
  const withTextPath = path.join(OUTPUT_DIR, `${videoId}_text.mp4`);
  const finalVideoPath = path.join(OUTPUT_DIR, `${videoId}.mp4`);

  // Get the warm voice
  const voice = WARM_VOICES[demo.voiceKey];
  console.log(`[VOICE] Using ${voice.name}: ${voice.description}`);

  // Step 1: Generate voiceover
  await generateNaturalVoiceover(demo.script, voice.id, voice.name, audioPath);

  // Get audio duration
  const durationStr = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  ).toString().trim();
  const duration = parseFloat(durationStr) + 2;

  console.log(`[DURATION] ${duration.toFixed(1)}s`);

  // Step 2: Generate gradient background
  const style = VISUAL_STYLES[demo.visualStyle];
  const primaryColor = style.colors[0].replace('#', '0x');

  const bgCommand = `ffmpeg -y -f lavfi -i "color=c=${primaryColor}:s=1080x1920:d=${duration}" -c:v libx264 -pix_fmt yuv420p "${tempVideoPath}"`;
  execSync(bgCommand, { stdio: 'inherit' });
  console.log(`[VIDEO] Background generated`);

  // Step 3: Add text overlays
  const escapeText = (t: string) => t.replace(/'/g, "'\\''" ).replace(/:/g, '\\:');

  const titleText = escapeText(`${demo.name}'s Preview`);
  const subjectText = escapeText(`${demo.interest} → ${demo.subject}`);
  const previewTag = escapeText('PREVIEW');
  const fullLessonText = escapeText('Full 10-min lesson ready!');

  const ctaStart = duration - 4;

  const textCommand = `ffmpeg -y -i "${tempVideoPath}" -vf "\
drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${previewTag}':fontcolor=0x${style.accentColor.replace('#', '')}:fontsize=32:x=(w-text_w)/2:y=h/12,\
drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${titleText}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=h/6,\
drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${subjectText}':fontcolor=0x${style.accentColor.replace('#', '')}:fontsize=48:x=(w-text_w)/2:y=h*5/6,\
drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${fullLessonText}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=h*11/12:enable='between(t,${ctaStart},${duration})'\
" -c:a copy "${withTextPath}"`;

  execSync(textCommand, { stdio: 'inherit' });
  console.log(`[VIDEO] Text overlays added`);

  // Step 4: Combine with audio
  execSync(`ffmpeg -y -i "${withTextPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${finalVideoPath}"`, {
    stdio: 'inherit'
  });
  console.log(`[VIDEO] Audio combined`);

  // Copy to public directory with clean name
  const publicPath = path.join(PUBLIC_DEMOS, `${demo.id.replace(/_/g, '-')}.mp4`);
  fs.copyFileSync(finalVideoPath, publicPath);
  console.log(`[PUBLIC] Copied to: ${publicPath}`);

  // Cleanup
  [tempVideoPath, withTextPath].forEach(f => {
    if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch {}
  });

  console.log(`\n✓ Demo intro saved: ${finalVideoPath}\n`);
  return finalVideoPath;
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0]?.toLowerCase() || 'all';

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║         DEMO INTRO GENERATOR - 40-Second Preview Clips                ║
║                                                                       ║
║   These are INTROS that preview full 10-minute lessons.               ║
║   Focus: Warm voices, slow pacing, natural human sound.               ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env');
    process.exit(1);
  }

  const generatedVideos: string[] = [];

  if (target === 'all') {
    for (const demo of DEMO_INTROS) {
      const videoPath = await generateDemoIntro(demo);
      generatedVideos.push(videoPath);
    }
  } else {
    const demo = DEMO_INTROS.find(d =>
      d.id.toLowerCase().includes(target) ||
      d.name.toLowerCase() === target
    );

    if (!demo) {
      console.error(`Demo not found: ${target}`);
      console.log('Available demos:');
      DEMO_INTROS.forEach(d => console.log(`  - ${d.name.toLowerCase()} (${d.id})`));
      process.exit(1);
    }

    const videoPath = await generateDemoIntro(demo);
    generatedVideos.push(videoPath);
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                        GENERATION COMPLETE                             ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Generated ${generatedVideos.length} demo intro(s)                                         ║
╚═══════════════════════════════════════════════════════════════════════╝

Demo Intros (40-second previews):
${generatedVideos.map(v => `  • ${path.basename(v)}`).join('\n')}

These are PREVIEWS that:
  • Show personalization immediately
  • Tease the learning connection
  • Make clear "your full lesson is ready"
  • Sound like a real person (warm, slow, natural)

Public URLs:
  • /demos/joe-dinosaurs-fractions.mp4
  • /demos/maya-art-solar-system.mp4
  • /demos/sarah-bakery-mortgage.mp4
`);
}

main().catch(console.error);
