#!/usr/bin/env npx ts-node
/**
 * Demo Lesson Video Generator
 * Creates sample 10-minute personalized lesson demos for the website
 *
 * These demos show the Thought Organizer in action - personalized lessons
 * that use what a learner LOVES to teach what they NEED.
 *
 * Usage:
 *   npx ts-node scripts/generateDemoLessons.ts [demo-name]
 *   npx ts-node scripts/generateDemoLessons.ts all
 *   npx ts-node scripts/generateDemoLessons.ts joe
 *   npx ts-node scripts/generateDemoLessons.ts maya
 *   npx ts-node scripts/generateDemoLessons.ts sarah
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import {
  generateVoiceover,
  VISUAL_STYLES,
  BACKGROUND_MUSIC
} from '../src/video/videoGenerator';
import {
  NARRATOR_VOICES,
  NATURAL_VOICE_SETTINGS,
  VIDEO_END_CTA,
  ELEVENLABS_MODELS
} from '../src/video/voiceConfig';

const OUTPUT_DIR = path.join(__dirname, '..', 'outputs', 'demos');
const AUDIO_DIR = path.join(__dirname, '..', 'outputs', 'audio');

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Demo Lesson Scripts
// These are the EXACT scripts from user requirements
interface DemoLesson {
  id: string;
  name: string;
  age: string;
  interest: string;
  subject: string;
  targetAudience: 'kid' | 'adult';
  script: string;
  visualStyle: keyof typeof VISUAL_STYLES;
}

const DEMO_LESSONS: DemoLesson[] = [
  {
    id: 'joe_dinosaurs_fractions',
    name: 'Joe',
    age: '6',
    interest: 'dinosaurs',
    subject: 'fractions',
    targetAudience: 'kid',
    visualStyle: 'gradient_warm',
    script: `Hey Joe! Ready for some dinosaur math?

Imagine a T-Rex pizza split into 4 pieces. You eat 1 piece. That's one-fourth, or 1 over 4.

Now imagine a Brontosaurus cake cut into 2 pieces. You share half with your friend. That's one-half, or 1 over 2.

Which piece is bigger?

The one-half piece! Because when you split something in fewer pieces, each piece is bigger.

Just like how a T-Rex and Brontosaurus both share food differently with their dino-friends!

You're learning fractions, Joe, one dinosaur at a time!`
  },
  {
    id: 'maya_art_solar_system',
    name: 'Maya',
    age: '10',
    interest: 'art',
    subject: 'solar system',
    targetAudience: 'kid',
    visualStyle: 'gradient_purple',  // Purple Dream for artistic feel
    script: `Hey Maya! Let's paint the solar system today!

Picture your canvas. In the center, paint a big, bright yellow sun - that's our star!

Now add 8 circles spinning around it. The first 4 are rocky - like sketching with charcoal. Mercury, Venus, Earth, Mars.

The outer 4 are gas giants - fluffy like watercolors! Jupiter, Saturn, Uranus, Neptune.

Think of the asteroid belt between Mars and Jupiter like scattered paint drops!

Each planet is a different color: rusty red Mars, swirly blue Neptune, ringed golden Saturn.

You're not just learning planets, Maya - you're creating a masterpiece of the cosmos!`
  },
  {
    id: 'sarah_bakery_mortgage',
    name: 'Sarah',
    age: 'adult',
    interest: 'running her bakery',
    subject: 'understanding her mortgage',
    targetAudience: 'adult',
    visualStyle: 'gradient_dark',  // Dark Premium for professional adult content
    script: `Sarah, let's talk about your mortgage the way you think about your bakery.

Your mortgage is like a big batch of dough you're paying back over time. The principal is the actual dough - the original amount you borrowed.

The interest? That's like the oven's energy bill - the cost of having that dough in your space.

When you make a payment, part pays down the dough, part covers the energy bill. Early on, more goes to interest. Over time, more chips away at the actual amount.

Just like your bakery, you can pay extra to work through that dough faster - and save on that energy bill.

Your mortgage isn't a mystery, Sarah - it's just another recipe to master.`
  }
];

/**
 * Generate a demo lesson video with voiceover
 */
async function generateDemoLesson(demo: DemoLesson): Promise<string> {
  console.log(`\n════════════════════════════════════════════════════`);
  console.log(`GENERATING DEMO: ${demo.name} (${demo.interest} → ${demo.subject})`);
  console.log(`════════════════════════════════════════════════════\n`);

  const videoId = `demo_${demo.id}_${Date.now()}`;
  const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`);
  const tempVideoPath = path.join(OUTPUT_DIR, `${videoId}_temp.mp4`);
  const withTextPath = path.join(OUTPUT_DIR, `${videoId}_text.mp4`);
  const finalVideoPath = path.join(OUTPUT_DIR, `${videoId}.mp4`);

  // Select appropriate voice - Sarah (warm) for kids, Lily (british warm) for adults
  const voice = demo.targetAudience === 'kid'
    ? NARRATOR_VOICES.find(v => v.name === 'Sarah') || NARRATOR_VOICES[0]
    : NARRATOR_VOICES.find(v => v.name === 'Lily') || NARRATOR_VOICES[4];

  // Add follow CTA to end of script
  const fullScript = `${demo.script} ... ${VIDEO_END_CTA.voiceover}`;

  console.log(`[VOICE] Using ${voice.name} (${voice.tone})`);
  console.log(`[SCRIPT] ${demo.script.substring(0, 100)}...`);

  // Step 1: Generate voiceover with educational settings for natural sound
  const voiceType = demo.targetAudience === 'kid' ? 'educational' : 'personalized';
  await generateVoiceover(fullScript, voice, audioPath, voiceType);

  // Get audio duration
  const durationStr = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  ).toString().trim();
  const duration = parseFloat(durationStr) + 2; // Add padding

  console.log(`[DURATION] ${duration.toFixed(1)}s`);

  // Step 2: Generate gradient background using first color from style
  const style = VISUAL_STYLES[demo.visualStyle];
  const primaryColor = style.colors[0].replace('#', '0x');
  const secondaryColor = style.colors[1].replace('#', '0x');

  // Use solid color background (gradient generation requires more complex ffmpeg)
  const bgCommand = `ffmpeg -y -f lavfi -i "color=c=${primaryColor}:s=1080x1920:d=${duration}" \
    -c:v libx264 -pix_fmt yuv420p "${tempVideoPath}"`;

  execSync(bgCommand, { stdio: 'inherit' });
  console.log(`[VIDEO] Background generated (${style.name})`);

  // Step 3: Add text overlays - name banner at top, subject at bottom
  const escapeText = (t: string) => t.replace(/'/g, "'\\''").replace(/:/g, '\\:');

  const titleText = escapeText(`${demo.name}'s Lesson`);
  const subjectText = escapeText(`${demo.interest} → ${demo.subject}`);
  const followText = escapeText(VIDEO_END_CTA.text);

  const ctaStart = duration - 3;

  const textCommand = `ffmpeg -y -i "${tempVideoPath}" -vf "\
drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${titleText}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=h/6,\
drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${subjectText}':fontcolor=0x${style.accentColor.replace('#', '')}:fontsize=48:x=(w-text_w)/2:y=h*5/6,\
drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${followText}':fontcolor=0x${style.accentColor.replace('#', '')}:fontsize=36:x=(w-text_w)/2:y=h*11/12:enable='between(t,${ctaStart},${duration})'\
" -c:a copy "${withTextPath}"`;

  execSync(textCommand, { stdio: 'inherit' });
  console.log(`[VIDEO] Text overlays added`);

  // Step 4: Combine with audio
  execSync(`ffmpeg -y -i "${withTextPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${finalVideoPath}"`, {
    stdio: 'inherit'
  });
  console.log(`[VIDEO] Audio combined`);

  // Cleanup
  [tempVideoPath, withTextPath].forEach(f => {
    if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch {}
  });

  console.log(`\n✓ Demo saved: ${finalVideoPath}\n`);
  return finalVideoPath;
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0]?.toLowerCase() || 'all';

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║           DEMO LESSON GENERATOR - 10-MINUTE PERSONALIZED LESSONS      ║
║                     Powered by Thought Organizer™                      ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

  // Check for ElevenLabs API key
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env');
    console.log('Demo lessons require ElevenLabs for natural voiceover.');
    process.exit(1);
  }

  const generatedVideos: string[] = [];

  if (target === 'all') {
    // Generate all demos
    for (const demo of DEMO_LESSONS) {
      const videoPath = await generateDemoLesson(demo);
      generatedVideos.push(videoPath);
    }
  } else {
    // Find specific demo
    const demo = DEMO_LESSONS.find(d =>
      d.id.toLowerCase().includes(target) ||
      d.name.toLowerCase() === target
    );

    if (!demo) {
      console.error(`Demo not found: ${target}`);
      console.log('Available demos:');
      DEMO_LESSONS.forEach(d => console.log(`  - ${d.name.toLowerCase()} (${d.id})`));
      process.exit(1);
    }

    const videoPath = await generateDemoLesson(demo);
    generatedVideos.push(videoPath);
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                        GENERATION COMPLETE                             ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Generated ${generatedVideos.length} demo video(s)                                          ║
║  Output: ${OUTPUT_DIR}
╚═══════════════════════════════════════════════════════════════════════╝

Demo Videos:
${generatedVideos.map(v => `  • ${path.basename(v)}`).join('\n')}

These demos show Thought Organizer™ in action:
  • Joe: Dinosaurs → Fractions (kid-friendly)
  • Maya: Art → Solar System (kid-friendly)
  • Sarah: Bakery → Mortgage (adult professional)

Ready to deploy to website!
`);
}

main().catch(console.error);
