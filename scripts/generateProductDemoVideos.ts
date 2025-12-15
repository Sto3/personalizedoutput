/**
 * Product Demo Video Generator
 *
 * Creates TikTok/Reels videos that show the ACTUAL PRODUCT
 * Based on feedback: "The product IS the content"
 *
 * Video Types:
 * 1. Santa Message Demos - Actual Santa audio playing with visual context
 * 2. Vision Board Reveals - Before/after transformation with real outputs
 * 3. Lesson Demo Clips - Real lesson audio with supporting visuals
 *
 * Usage: npx ts-node scripts/generateProductDemoVideos.ts [type]
 * Types: santa | vision | lesson | all
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { buildSantaScript } from '../src/lib/thoughtEngine/santa/buildSantaScript';
import { synthesizeSantaMessage, saveSantaAudio } from '../src/lib/thoughtEngine/santa/elevenLabsClient';

const execAsync = promisify(exec);

const OUTPUT_DIR = path.join(__dirname, '../outputs/product_demos');
const VISION_BOARD_DIR = path.join(__dirname, '../outputs');
const LESSON_DEMO_DIR = path.join(__dirname, '../outputs/demos');
const SANTA_PREVIEW_DIR = path.join(__dirname, '../outputs/etsy-previews');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================================
// SANTA MESSAGE DEMO VIDEOS
// ============================================================

interface SantaDemoConfig {
  childName: string;
  age: number;
  pronouns: 'he' | 'she' | 'they';
  proudMoment: string;
  scenario: string;
  hookText: string;  // Text shown at start
}

const SANTA_DEMO_CONFIGS: SantaDemoConfig[] = [
  {
    childName: 'Emma',
    age: 6,
    pronouns: 'she',
    proudMoment: 'learned to ride her bike without training wheels',
    scenario: 'pet',
    hookText: "Watch Emma's face when Santa mentions her dog Max..."
  },
  {
    childName: 'Liam',
    age: 7,
    pronouns: 'he',
    proudMoment: 'helped his little sister learn her ABCs',
    scenario: 'sibling',
    hookText: "He asked how Santa knew about his baby sister..."
  },
  {
    childName: 'Sophia',
    age: 5,
    pronouns: 'she',
    proudMoment: 'was brave at her first day of kindergarten',
    scenario: 'brave',
    hookText: "The moment Santa called her by name..."
  },
  {
    childName: 'Noah',
    age: 8,
    pronouns: 'he',
    proudMoment: 'scored the winning goal in his soccer game',
    scenario: 'achievement',
    hookText: "Santa knew about his soccer goal. His jaw dropped."
  },
  {
    childName: 'Olivia',
    age: 4,
    pronouns: 'she',
    proudMoment: 'shared her favorite toy with a friend who was sad',
    scenario: 'kindness',
    hookText: "She whispered 'How did he know?' when Santa mentioned her friend..."
  },
  {
    childName: 'Jackson',
    age: 6,
    pronouns: 'he',
    proudMoment: 'learned to tie his shoes all by himself',
    scenario: 'milestone',
    hookText: "POV: Your kid hears Santa say his name for the first time"
  },
  {
    childName: 'Ava',
    age: 7,
    pronouns: 'she',
    proudMoment: 'read her first chapter book all by herself',
    scenario: 'reading',
    hookText: "She still talks about the Santa video from last year..."
  },
  {
    childName: 'Lucas',
    age: 5,
    pronouns: 'he',
    proudMoment: 'helped grandma bake cookies for the neighbors',
    scenario: 'family',
    hookText: "Santa mentioned grandma. He ran to show her immediately."
  }
];

async function generateSantaDemoVideo(config: SantaDemoConfig, index: number): Promise<string> {
  console.log(`\n[SANTA DEMO ${index + 1}/${SANTA_DEMO_CONFIGS.length}]`);
  console.log(`  Child: ${config.childName}, Hook: ${config.hookText.slice(0, 40)}...`);

  const timestamp = Date.now();
  const safeChildName = config.childName.toLowerCase();
  const outputPath = path.join(OUTPUT_DIR, `santa_demo_${safeChildName}_${timestamp}.mp4`);

  try {
    // Step 1: Generate actual Santa message
    console.log('  [1/4] Generating Santa script...');
    const scriptOutput = await buildSantaScript({
      childName: config.childName,
      age: config.age,
      pronouns: config.pronouns,
      scenario: config.scenario as any,
      proudMoment: config.proudMoment,
      energyLevel: 'warm'
    });
    console.log(`  [1/4] Script ready (${scriptOutput.wordCount} words)`);

    // Step 2: Synthesize audio
    console.log('  [2/4] Synthesizing Santa voice...');
    const audioBuffer = await synthesizeSantaMessage(scriptOutput.script);
    const { filepath: audioPath, filename: audioFilename } = await saveSantaAudio(audioBuffer);
    console.log(`  [2/4] Audio saved: ${audioFilename}`);

    // Step 3: Get audio duration
    const { stdout: durationStr } = await execAsync(
      `ffprobe -i "${audioPath}" -show_entries format=duration -v quiet -of csv="p=0"`
    );
    const audioDuration = parseFloat(durationStr.trim());
    console.log(`  [3/4] Audio duration: ${audioDuration.toFixed(1)}s`);

    // Step 4: Create video with ffmpeg
    // Structure:
    // - 0-3s: Hook text on warm gradient
    // - 3s-end: "Playing Santa's message..." text while audio plays
    // - End card: CTA

    console.log('  [4/4] Creating video...');

    const hookDuration = 3;
    const totalDuration = hookDuration + audioDuration + 3; // +3 for end card

    // Create temporary files for each segment
    const tempHookVideo = path.join(OUTPUT_DIR, `temp_hook_${timestamp}.mp4`);
    const tempMainVideo = path.join(OUTPUT_DIR, `temp_main_${timestamp}.mp4`);
    const tempEndVideo = path.join(OUTPUT_DIR, `temp_end_${timestamp}.mp4`);

    // Hook segment (first 3 seconds) - larger, impactful text
    const hookEscaped = config.hookText.replace(/'/g, "'\\''").replace(/:/g, '\\:');
    await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x1a1a2e:s=1080x1920:d=${hookDuration}" \
      -vf "drawtext=text='${hookEscaped}':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:line_spacing=20" \
      -c:v libx264 -t ${hookDuration} -pix_fmt yuv420p "${tempHookVideo}"`);

    // Main segment - Santa message playing with visual indicator
    // First create video-only with text overlay, then combine with audio
    const mainText = "Santa Speaking...";
    const childNameDisplay = config.childName;
    const tempMainVideoOnly = path.join(OUTPUT_DIR, `temp_main_video_${timestamp}.mp4`);

    // Create video with text
    await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x2d1f3d:s=1080x1920:d=${audioDuration}" \
      -vf "drawtext=text='${mainText}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=400:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf,drawtext=text='For ${childNameDisplay}':fontsize=72:fontcolor=0xffd700:x=(w-text_w)/2:y=(h/2):fontfile=/System/Library/Fonts/Supplemental/Arial.ttf" \
      -c:v libx264 -t ${audioDuration} -pix_fmt yuv420p "${tempMainVideoOnly}"`);

    // Combine video and audio
    await execAsync(`ffmpeg -y -i "${tempMainVideoOnly}" -i "${audioPath}" \
      -c:v copy -c:a aac -shortest "${tempMainVideo}"`);

    // Clean up intermediate file
    if (fs.existsSync(tempMainVideoOnly)) fs.unlinkSync(tempMainVideoOnly);

    // End card (CTA)
    const endDuration = 3;
    await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x16213e:s=1080x1920:d=${endDuration}" \
      -vf "drawtext=text='Create yours in 2 minutes':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=(h/2)-60:fontfile=/System/Library/Fonts/Supplemental/Arial Bold.ttf,drawtext=text='Link in bio':fontsize=40:fontcolor=0xffd700:x=(w-text_w)/2:y=(h/2)+40:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf" \
      -c:v libx264 -t ${endDuration} -pix_fmt yuv420p "${tempEndVideo}"`);

    // Concatenate all segments
    const concatListPath = path.join(OUTPUT_DIR, `concat_${timestamp}.txt`);
    fs.writeFileSync(concatListPath, `file '${tempHookVideo}'\nfile '${tempMainVideo}'\nfile '${tempEndVideo}'`);

    await execAsync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -c:a aac -pix_fmt yuv420p "${outputPath}"`);

    // Cleanup temp files
    [tempHookVideo, tempMainVideo, tempEndVideo, concatListPath].forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });

    console.log(`  [DONE] ${path.basename(outputPath)}`);
    return outputPath;

  } catch (error) {
    console.error(`  [ERROR] ${(error as Error).message}`);
    throw error;
  }
}

// ============================================================
// VISION BOARD REVEAL VIDEOS
// ============================================================

interface VisionBoardDemoConfig {
  imagePath: string;
  hookText: string;
  inputText: string; // What the user "typed in"
}

async function findBestVisionBoards(): Promise<string[]> {
  const files = fs.readdirSync(VISION_BOARD_DIR)
    .filter(f => f.endsWith('.png') && (f.includes('visionboard') || f.includes('premium')))
    .map(f => path.join(VISION_BOARD_DIR, f))
    .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size) // Larger = more detailed
    .slice(0, 10);

  return files;
}

const VISION_HOOKS = [
  { hookText: "She wrote 3 goals. This is what came back.", inputText: "Career growth • Better health • More travel" },
  { hookText: "From scattered thoughts to crystal clear vision", inputText: "Start business • Learn Spanish • Run marathon" },
  { hookText: "POV: You finally see your dreams organized", inputText: "Financial freedom • Family time • Personal growth" },
  { hookText: "The Thought Organizer transformed this list into...", inputText: "Get promoted • Buy house • Travel Europe" },
  { hookText: "My 2025 goals went from messy notes to this", inputText: "Lose 20 lbs • Read 24 books • Save $10k" },
];

async function generateVisionBoardDemoVideo(imagePath: string, config: typeof VISION_HOOKS[0], index: number): Promise<string> {
  console.log(`\n[VISION DEMO ${index + 1}]`);
  console.log(`  Image: ${path.basename(imagePath)}`);
  console.log(`  Hook: ${config.hookText.slice(0, 40)}...`);

  const timestamp = Date.now();
  const outputPath = path.join(OUTPUT_DIR, `vision_reveal_${index + 1}_${timestamp}.mp4`);

  try {
    // Structure:
    // - 0-3s: Hook text
    // - 3-5s: "Input" text (what user typed)
    // - 5-6s: Transition/loading
    // - 6-14s: Vision board reveal with zoom animation
    // - 14-17s: CTA

    const hookDuration = 3;
    const inputDuration = 2;
    const transitionDuration = 1;
    const revealDuration = 8;
    const ctaDuration = 3;

    const tempFiles: string[] = [];

    // Hook segment
    const tempHook = path.join(OUTPUT_DIR, `temp_vhook_${timestamp}.mp4`);
    tempFiles.push(tempHook);
    const hookEscaped = config.hookText.replace(/'/g, "'\\''").replace(/:/g, '\\:');
    await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x1a1a2e:s=1080x1920:d=${hookDuration}" \
      -vf "drawtext=text='${hookEscaped}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:line_spacing=16" \
      -c:v libx264 -t ${hookDuration} -pix_fmt yuv420p "${tempHook}"`);

    // Input segment (simulating user typing goals)
    const tempInput = path.join(OUTPUT_DIR, `temp_vinput_${timestamp}.mp4`);
    tempFiles.push(tempInput);
    const inputEscaped = config.inputText.replace(/'/g, "'\\''").replace(/:/g, '\\:');
    await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x0f0f23:s=1080x1920:d=${inputDuration}" \
      -vf "drawtext=text='Your goals\\:':fontsize=36:fontcolor=0x888888:x=(w-text_w)/2:y=600:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf,drawtext=text='${inputEscaped}':fontsize=44:fontcolor=white:x=(w-text_w)/2:y=720:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf" \
      -c:v libx264 -t ${inputDuration} -pix_fmt yuv420p "${tempInput}"`);

    // Transition (brief loading)
    const tempTransition = path.join(OUTPUT_DIR, `temp_vtrans_${timestamp}.mp4`);
    tempFiles.push(tempTransition);
    await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x0a0a1a:s=1080x1920:d=${transitionDuration}" \
      -vf "drawtext=text='Creating your vision board...':fontsize=36:fontcolor=0x888888:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf" \
      -c:v libx264 -t ${transitionDuration} -pix_fmt yuv420p "${tempTransition}"`);

    // Reveal segment - show actual vision board with slow zoom
    const tempReveal = path.join(OUTPUT_DIR, `temp_vreveal_${timestamp}.mp4`);
    tempFiles.push(tempReveal);
    await execAsync(`ffmpeg -y -loop 1 -i "${imagePath}" -f lavfi -i "color=c=black:s=1080x1920:d=${revealDuration}" \
      -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,zoompan=z='min(zoom+0.0008,1.15)':d=${revealDuration * 30}:s=1080x1920:fps=30[zoomed];[1:v][zoomed]overlay[v]" \
      -map "[v]" -c:v libx264 -t ${revealDuration} -pix_fmt yuv420p "${tempReveal}"`);

    // CTA segment
    const tempCta = path.join(OUTPUT_DIR, `temp_vcta_${timestamp}.mp4`);
    tempFiles.push(tempCta);
    await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x16213e:s=1080x1920:d=${ctaDuration}" \
      -vf "drawtext=text='Get yours at':fontsize=40:fontcolor=white:x=(w-text_w)/2:y=(h/2)-40:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf,drawtext=text='personalizedoutput.com':fontsize=48:fontcolor=0xffd700:x=(w-text_w)/2:y=(h/2)+40:fontfile=/System/Library/Fonts/Supplemental/Arial Bold.ttf" \
      -c:v libx264 -t ${ctaDuration} -pix_fmt yuv420p "${tempCta}"`);

    // Concatenate
    const concatPath = path.join(OUTPUT_DIR, `concat_v_${timestamp}.txt`);
    tempFiles.push(concatPath);
    fs.writeFileSync(concatPath, tempFiles.filter(f => f.endsWith('.mp4')).map(f => `file '${f}'`).join('\n'));

    await execAsync(`ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`);

    // Cleanup
    tempFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });

    console.log(`  [DONE] ${path.basename(outputPath)}`);
    return outputPath;

  } catch (error) {
    console.error(`  [ERROR] ${(error as Error).message}`);
    throw error;
  }
}

// ============================================================
// LESSON DEMO CLIPS
// ============================================================

async function generateLessonDemoVideo(lessonFile: string, index: number): Promise<string> {
  console.log(`\n[LESSON DEMO ${index + 1}]`);
  console.log(`  Source: ${path.basename(lessonFile)}`);

  const timestamp = Date.now();
  const baseName = path.basename(lessonFile, '.mp4');
  const outputPath = path.join(OUTPUT_DIR, `lesson_clip_${baseName}_${timestamp}.mp4`);

  // Determine hook based on lesson name
  let hookText = "Finally, learning that makes sense";
  let childName = "Your child";
  let topic = "this topic";

  if (baseName.includes('joe')) {
    hookText = "He finally understood fractions...";
    childName = "Joe";
    topic = "dinosaurs";
  } else if (baseName.includes('maya')) {
    hookText = "She learned the solar system through art";
    childName = "Maya";
    topic = "art";
  } else if (baseName.includes('sarah')) {
    hookText = "Mortgages finally made sense";
    childName = "Sarah";
    topic = "baking";
  }

  try {
    const tempFiles: string[] = [];

    // Hook segment
    const tempHook = path.join(OUTPUT_DIR, `temp_lhook_${timestamp}.mp4`);
    tempFiles.push(tempHook);
    const hookEscaped = hookText.replace(/'/g, "'\\''").replace(/:/g, '\\:');
    await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x1a1a2e:s=1080x1920:d=3" \
      -vf "drawtext=text='${hookEscaped}':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf" \
      -c:v libx264 -t 3 -pix_fmt yuv420p "${tempHook}"`);

    // Context segment (what was input)
    const tempContext = path.join(OUTPUT_DIR, `temp_lcontext_${timestamp}.mp4`);
    tempFiles.push(tempContext);
    await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x0f0f23:s=1080x1920:d=2" \
      -vf "drawtext=text='Personalized for ${childName}':fontsize=40:fontcolor=0x888888:x=(w-text_w)/2:y=600:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf,drawtext=text='Interest\\: ${topic}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=720:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf" \
      -c:v libx264 -t 2 -pix_fmt yuv420p "${tempContext}"`);

    // Get lesson duration
    const { stdout: durationStr } = await execAsync(
      `ffprobe -i "${lessonFile}" -show_entries format=duration -v quiet -of csv="p=0"`
    );
    const lessonDuration = Math.min(parseFloat(durationStr.trim()), 12); // Cap at 12 seconds

    // Lesson clip - take middle portion
    const startTime = 2; // Skip first 2 seconds
    const tempLesson = path.join(OUTPUT_DIR, `temp_llesson_${timestamp}.mp4`);
    tempFiles.push(tempLesson);

    // Scale the existing lesson video to portrait format
    await execAsync(`ffmpeg -y -ss ${startTime} -i "${lessonFile}" \
      -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" \
      -c:v libx264 -c:a aac -t ${lessonDuration} -pix_fmt yuv420p "${tempLesson}"`);

    // CTA
    const tempCta = path.join(OUTPUT_DIR, `temp_lcta_${timestamp}.mp4`);
    tempFiles.push(tempCta);
    await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x16213e:s=1080x1920:d=3" \
      -vf "drawtext=text='Any topic. Any interest.':fontsize=44:fontcolor=white:x=(w-text_w)/2:y=(h/2)-60:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf,drawtext=text='Personalized learning':fontsize=40:fontcolor=0xffd700:x=(w-text_w)/2:y=(h/2)+40:fontfile=/System/Library/Fonts/Supplemental/Arial.ttf" \
      -c:v libx264 -t 3 -pix_fmt yuv420p "${tempCta}"`);

    // Concatenate
    const concatPath = path.join(OUTPUT_DIR, `concat_l_${timestamp}.txt`);
    fs.writeFileSync(concatPath, tempFiles.filter(f => f.endsWith('.mp4')).map(f => `file '${f}'`).join('\n'));

    await execAsync(`ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c:v libx264 -c:a aac -pix_fmt yuv420p "${outputPath}"`);

    // Cleanup
    tempFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
    fs.unlinkSync(concatPath);

    console.log(`  [DONE] ${path.basename(outputPath)}`);
    return outputPath;

  } catch (error) {
    console.error(`  [ERROR] ${(error as Error).message}`);
    throw error;
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function generateSantaDemos(count: number = 8): Promise<void> {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('          SANTA MESSAGE DEMO VIDEOS - ACTUAL PRODUCT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Generating ${count} real Santa message demos with ElevenLabs audio\n`);

  const configs = SANTA_DEMO_CONFIGS.slice(0, count);
  const results: string[] = [];

  for (let i = 0; i < configs.length; i++) {
    try {
      const result = await generateSantaDemoVideo(configs[i], i);
      results.push(result);

      // Rate limit for ElevenLabs API
      if (i < configs.length - 1) {
        console.log('  [RATE LIMIT] Waiting 2s before next...');
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (error) {
      console.error(`  Failed to generate demo ${i + 1}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  COMPLETE: ${results.length} Santa demo videos generated`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

async function generateVisionDemos(count: number = 5): Promise<void> {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('        VISION BOARD REVEAL VIDEOS - REAL OUTPUTS');
  console.log('═══════════════════════════════════════════════════════════════');

  const visionBoardImages = await findBestVisionBoards();
  console.log(`Found ${visionBoardImages.length} vision board images\n`);

  if (visionBoardImages.length === 0) {
    console.log('No vision board images found!');
    return;
  }

  const results: string[] = [];

  for (let i = 0; i < Math.min(count, visionBoardImages.length, VISION_HOOKS.length); i++) {
    try {
      const result = await generateVisionBoardDemoVideo(
        visionBoardImages[i],
        VISION_HOOKS[i],
        i
      );
      results.push(result);
    } catch (error) {
      console.error(`  Failed to generate vision demo ${i + 1}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  COMPLETE: ${results.length} vision board reveal videos generated`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

async function generateLessonDemos(): Promise<void> {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('          LESSON DEMO CLIPS - REAL LESSONS');
  console.log('═══════════════════════════════════════════════════════════════');

  if (!fs.existsSync(LESSON_DEMO_DIR)) {
    console.log('No lesson demos directory found!');
    return;
  }

  const lessonFiles = fs.readdirSync(LESSON_DEMO_DIR)
    .filter(f => f.endsWith('.mp4') && f.includes('demo_'))
    .map(f => path.join(LESSON_DEMO_DIR, f));

  console.log(`Found ${lessonFiles.length} lesson demo files\n`);

  const results: string[] = [];

  for (let i = 0; i < lessonFiles.length; i++) {
    try {
      const result = await generateLessonDemoVideo(lessonFiles[i], i);
      results.push(result);
    } catch (error) {
      console.error(`  Failed to generate lesson demo ${i + 1}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  COMPLETE: ${results.length} lesson demo videos generated`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

async function main(): Promise<void> {
  const type = process.argv[2] || 'all';

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║         PRODUCT DEMO VIDEO GENERATOR                                  ║');
  console.log('║         "The Product IS the Content"                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log(`\nMode: ${type.toUpperCase()}\n`);

  switch (type) {
    case 'santa':
      await generateSantaDemos();
      break;
    case 'vision':
      await generateVisionDemos();
      break;
    case 'lesson':
      await generateLessonDemos();
      break;
    case 'all':
      await generateSantaDemos(5); // 5 Santa demos (API calls)
      await generateVisionDemos(5); // 5 Vision reveals (no API)
      await generateLessonDemos(); // All lesson clips (no API)
      break;
    default:
      console.log('Unknown type. Options: santa | vision | lesson | all');
      process.exit(1);
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    ALL DONE!');
  console.log(`  Output directory: ${OUTPUT_DIR}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
