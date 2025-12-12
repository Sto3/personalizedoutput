/**
 * Video Generation Service
 * Creates marketing videos with ElevenLabs voiceovers and ffmpeg composition
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { MarketingHook, MARKETING_HOOKS, getHooksByProduct } from './marketingHooks';
import { VoiceConfig, NARRATOR_VOICES, getRandomNarratorVoice, ELEVENLABS_MODELS } from './voiceConfig';

const execAsync = promisify(exec);

// Configuration
const OUTPUT_DIR = path.join(process.cwd(), 'outputs', 'videos');
const AUDIO_DIR = path.join(process.cwd(), 'outputs', 'audio');
const ASSETS_DIR = path.join(process.cwd(), 'assets', 'video');

// Ensure directories exist
[OUTPUT_DIR, AUDIO_DIR, ASSETS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export interface VideoGenerationOptions {
  hook: MarketingHook;
  voice?: VoiceConfig;
  includeVoiceover: boolean;
  backgroundStyle: 'gradient' | 'product' | 'lifestyle';
  outputFormat: 'mp4' | 'mov';
  resolution: '1080x1920' | '1080x1080' | '1920x1080'; // Portrait, Square, Landscape
  includeCaptions: boolean;
  includeMusic: boolean;
}

export interface GeneratedVideo {
  id: string;
  path: string;
  audioPath?: string;
  hook: MarketingHook;
  voice?: VoiceConfig;
  duration: number;
  resolution: string;
  createdAt: Date;
}

/**
 * Generate voiceover audio using ElevenLabs API
 */
export async function generateVoiceover(
  text: string,
  voice: VoiceConfig,
  outputPath: string
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  console.log(`[TTS] Generating voiceover with ${voice.name}...`);
  console.log(`[TTS] Text: "${text.substring(0, 100)}..."`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODELS.TURBO_V2_5,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const audioBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(audioBuffer));

  console.log(`[TTS] Audio saved to: ${outputPath}`);
  return outputPath;
}

/**
 * Get audio duration using ffprobe
 */
async function getAudioDuration(audioPath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  );
  return parseFloat(stdout.trim());
}

/**
 * Generate gradient background video
 */
async function generateGradientBackground(
  outputPath: string,
  duration: number,
  resolution: string,
  colors: string[] = ['#e94560', '#1a1a2e', '#16213e']
): Promise<void> {
  const [width, height] = resolution.split('x').map(Number);

  // Create animated gradient using ffmpeg
  const ffmpegCmd = `ffmpeg -y -f lavfi -i "color=c=#1a1a2e:s=${width}x${height}:d=${duration}" \
    -vf "geq=r='128+127*sin(2*PI*T/4+X/${width}*3.14)':g='50+50*sin(2*PI*T/4+Y/${height}*3.14)':b='96+96*sin(2*PI*T/4)'" \
    -t ${duration} -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;

  await execAsync(ffmpegCmd);
}

/**
 * Add captions to video
 */
async function addCaptions(
  inputVideo: string,
  outputVideo: string,
  text: string,
  duration: number
): Promise<void> {
  // Break text into chunks for captions
  const words = text.split(' ');
  const wordsPerCaption = 5;
  const captionDuration = duration / Math.ceil(words.length / wordsPerCaption);

  // Create subtitle file
  const srtPath = inputVideo.replace('.mp4', '.srt');
  let srtContent = '';
  let index = 1;
  let startTime = 0;

  for (let i = 0; i < words.length; i += wordsPerCaption) {
    const chunk = words.slice(i, i + wordsPerCaption).join(' ');
    const endTime = startTime + captionDuration;

    srtContent += `${index}\n`;
    srtContent += `${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}\n`;
    srtContent += `${chunk}\n\n`;

    index++;
    startTime = endTime;
  }

  fs.writeFileSync(srtPath, srtContent);

  // Add subtitles to video
  const ffmpegCmd = `ffmpeg -y -i "${inputVideo}" -vf "subtitles=${srtPath}:force_style='FontSize=24,FontName=Arial,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=3,Outline=2,Shadow=1,MarginV=50'" -c:a copy "${outputVideo}"`;

  await execAsync(ffmpegCmd);

  // Clean up SRT file
  fs.unlinkSync(srtPath);
}

function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Combine audio and video
 */
async function combineAudioVideo(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  const ffmpegCmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`;
  await execAsync(ffmpegCmd);
}

/**
 * Create text overlay on video
 */
async function addTextOverlay(
  inputVideo: string,
  outputVideo: string,
  mainText: string,
  ctaText: string,
  duration: number
): Promise<void> {
  // Escape special characters for ffmpeg
  const escapeText = (t: string) => t.replace(/'/g, "'\\''").replace(/:/g, '\\:');

  const mainEscaped = escapeText(mainText);
  const ctaEscaped = escapeText(ctaText);

  // Calculate fade timing
  const fadeInEnd = 0.5;
  const ctaStart = duration - 3;

  const ffmpegCmd = `ffmpeg -y -i "${inputVideo}" -vf "\
drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial Bold.ttf:text='${mainEscaped}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=h/2-th:enable='between(t,0,${ctaStart})',\
drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial Bold.ttf:text='${ctaEscaped}':fontcolor=#f8b500:fontsize=36:x=(w-text_w)/2:y=h/2+50:enable='between(t,${ctaStart},${duration})'\
" -c:a copy "${outputVideo}"`;

  await execAsync(ffmpegCmd);
}

/**
 * Main video generation function
 */
export async function generateMarketingVideo(options: VideoGenerationOptions): Promise<GeneratedVideo> {
  const { hook, includeVoiceover, resolution, includeCaptions } = options;
  const voice = options.voice || getRandomNarratorVoice(hook.product);

  const videoId = `${hook.id}_${Date.now()}`;
  const tempVideoPath = path.join(OUTPUT_DIR, `${videoId}_temp.mp4`);
  const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`);
  const finalVideoPath = path.join(OUTPUT_DIR, `${videoId}.mp4`);

  console.log(`\n[VIDEO] Generating marketing video: ${videoId}`);
  console.log(`[VIDEO] Hook: ${hook.hook.substring(0, 50)}...`);
  console.log(`[VIDEO] Resolution: ${resolution}`);
  console.log(`[VIDEO] Voiceover: ${includeVoiceover ? voice.name : 'None'}`);

  let duration: number;
  const fullScript = `${hook.hook} ${hook.cta}`;

  // Step 1: Generate voiceover if needed
  if (includeVoiceover) {
    await generateVoiceover(fullScript, voice, audioPath);
    duration = await getAudioDuration(audioPath);
    // Add padding
    duration += 1.5;
  } else {
    // Duration based on reading speed (~150 words/min for visual)
    const wordCount = fullScript.split(' ').length;
    duration = Math.max(5, (wordCount / 150) * 60 + 2);
  }

  console.log(`[VIDEO] Duration: ${duration.toFixed(1)}s`);

  // Step 2: Generate background video
  await generateGradientBackground(tempVideoPath, duration, resolution);
  console.log(`[VIDEO] Background generated`);

  // Step 3: Add text overlay
  const withTextPath = path.join(OUTPUT_DIR, `${videoId}_text.mp4`);
  await addTextOverlay(tempVideoPath, withTextPath, hook.hook, hook.cta, duration);
  console.log(`[VIDEO] Text overlay added`);

  // Step 4: Combine with audio if voiceover
  if (includeVoiceover) {
    await combineAudioVideo(withTextPath, audioPath, finalVideoPath);
    console.log(`[VIDEO] Audio combined`);
  } else {
    fs.renameSync(withTextPath, finalVideoPath);
  }

  // Clean up temp files
  if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
  if (fs.existsSync(withTextPath) && withTextPath !== finalVideoPath) {
    try { fs.unlinkSync(withTextPath); } catch {}
  }

  console.log(`[VIDEO] ✓ Complete: ${finalVideoPath}`);

  return {
    id: videoId,
    path: finalVideoPath,
    audioPath: includeVoiceover ? audioPath : undefined,
    hook,
    voice: includeVoiceover ? voice : undefined,
    duration,
    resolution,
    createdAt: new Date()
  };
}

/**
 * Generate batch of marketing videos
 */
export async function generateVideoBatch(
  product: MarketingHook['product'],
  count: number,
  includeVoiceover: boolean = true
): Promise<GeneratedVideo[]> {
  const hooks = getHooksByProduct(product);
  const selectedHooks = hooks.slice(0, Math.min(count, hooks.length));

  console.log(`\n[BATCH] Generating ${selectedHooks.length} videos for ${product}`);

  const results: GeneratedVideo[] = [];

  for (let i = 0; i < selectedHooks.length; i++) {
    const hook = selectedHooks[i];
    console.log(`\n[BATCH] Progress: ${i + 1}/${selectedHooks.length}`);

    try {
      const video = await generateMarketingVideo({
        hook,
        includeVoiceover,
        backgroundStyle: 'gradient',
        outputFormat: 'mp4',
        resolution: '1080x1920', // TikTok/Reels/Shorts format
        includeCaptions: true,
        includeMusic: false
      });
      results.push(video);
    } catch (error) {
      console.error(`[BATCH] Error generating video for hook ${hook.id}:`, error);
    }

    // Small delay between videos to avoid rate limiting
    if (includeVoiceover && i < selectedHooks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n[BATCH] ✓ Complete: ${results.length}/${selectedHooks.length} videos generated`);
  return results;
}

/**
 * Generate ALL marketing videos (full library)
 */
export async function generateFullVideoLibrary(
  includeVoiceover: boolean = true
): Promise<{ [product: string]: GeneratedVideo[] }> {
  const products: MarketingHook['product'][] = ['santa', 'vision_board', 'flash_cards', 'clarity_planner', 'general'];
  const results: { [product: string]: GeneratedVideo[] } = {};

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  FULL VIDEO LIBRARY GENERATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const product of products) {
    console.log(`\n▶ Generating ${product} videos...`);
    results[product] = await generateVideoBatch(product, 100, includeVoiceover);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  GENERATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let total = 0;
  for (const [product, videos] of Object.entries(results)) {
    console.log(`  ${product}: ${videos.length} videos`);
    total += videos.length;
  }
  console.log(`\n  TOTAL: ${total} videos`);
  console.log(`  Output directory: ${OUTPUT_DIR}`);

  return results;
}

// Export for CLI usage
export { MARKETING_HOOKS, NARRATOR_VOICES };
