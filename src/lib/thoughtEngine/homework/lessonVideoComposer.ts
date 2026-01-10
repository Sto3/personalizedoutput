/**
 * Homework Rescue - Lesson Video Composer
 *
 * Combines:
 * - ElevenLabs voiceover audio
 * - Generated visual frames
 * - Background music (optional)
 *
 * Into a polished 10-minute tutoring video using FFmpeg.
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import {
  LessonScript,
  LessonVisuals,
  VideoScene,
  HomeworkIntake
} from './types';
import { generateLessonVisuals, getVisualsOutputDir } from './lessonVisualGenerator';

const execAsync = promisify(exec);

// ElevenLabs configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Tutor voice options (warm, encouraging voices)
const TUTOR_VOICES = {
  warm_female: {
    id: 'EXAVITQu4vr4xnSDxMaL', // Sarah
    name: 'Sarah',
    description: 'Warm, professional, encouraging'
  },
  calm_female: {
    id: 'pFZP5JQG7iQjIQuC4Bku', // Lily
    name: 'Lily',
    description: 'Calm, clear British accent'
  },
  friendly_female: {
    id: 'FGY2WhTYpPnrIDTdsKH5', // Laura
    name: 'Laura',
    description: 'Enthusiastic, sunny'
  },
  calm_male: {
    id: 'N2lVS1w4EtoT3dr4eOWO', // River
    name: 'River',
    description: 'Calm, conversational'
  }
};

// Voice settings for educational content
const EDUCATIONAL_VOICE_SETTINGS = {
  stability: 0.28,         // Lower = more natural variation
  similarity_boost: 0.72,  // Balanced character
  style: 0.70,             // High = warm, engaging
  use_speaker_boost: true
};

// Video output settings
const VIDEO_SETTINGS = {
  width: 1080,
  height: 1920,
  fps: 30,
  bitrate: '4M',
  audioCodec: 'aac',
  audioBitrate: '192k'
};

/**
 * Generate the complete lesson video
 */
export async function composeLessonVideo(
  script: LessonScript,
  intake: HomeworkIntake,
  orderId: string,
  voiceType: keyof typeof TUTOR_VOICES = 'warm_female'
): Promise<{
  videoPath: string;
  audioPath: string;
  duration: number;
}> {
  const outputDir = path.join(process.cwd(), 'outputs', 'homework', orderId);
  const visualsDir = getVisualsOutputDir(orderId);
  const audioPath = path.join(outputDir, 'voiceover.mp3');
  const videoPath = path.join(outputDir, 'lesson.mp4');

  // Ensure directories exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`[VideoComposer] Starting video composition for order ${orderId}`);

  // Step 1: Generate voiceover audio
  console.log('[VideoComposer] Generating voiceover audio...');
  await generateVoiceover(script.fullScript, audioPath, voiceType);

  // Step 2: Get audio duration
  const audioDuration = await getAudioDuration(audioPath);
  console.log(`[VideoComposer] Audio duration: ${audioDuration}s`);

  // Step 3: Generate visual frames
  console.log('[VideoComposer] Generating visual frames...');
  const visuals = await generateLessonVisuals(script, visualsDir);

  // Step 4: Create video from frames synced to audio
  console.log('[VideoComposer] Composing final video...');
  await composeVideoFromScenes(visuals, audioPath, videoPath, audioDuration);

  console.log(`[VideoComposer] Video complete: ${videoPath}`);

  return {
    videoPath,
    audioPath,
    duration: audioDuration
  };
}

/**
 * Generate voiceover using ElevenLabs
 */
async function generateVoiceover(
  text: string,
  outputPath: string,
  voiceType: keyof typeof TUTOR_VOICES
): Promise<void> {
  const voice = TUTOR_VOICES[voiceType];
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not set');
  }

  // Clean text for TTS
  const cleanedText = text
    .replace(/\.\.\./g, '... ') // Preserve pauses
    .replace(/\n\n/g, ' ... ') // Paragraph breaks become pauses
    .replace(/\n/g, ' ')
    .trim();

  try {
    const response = await axios({
      method: 'post',
      url: `${ELEVENLABS_API_URL}/${voice.id}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      data: {
        text: cleanedText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: EDUCATIONAL_VOICE_SETTINGS
      },
      responseType: 'arraybuffer',
      timeout: 300000 // 5 minute timeout for long audio
    });

    fs.writeFileSync(outputPath, Buffer.from(response.data));
  } catch (error: any) {
    console.error('[Voiceover] Error generating audio:', error.message);

    // Retry with exponential backoff
    if (error.response?.status === 429) {
      console.log('[Voiceover] Rate limited, waiting 60s...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      return generateVoiceover(text, outputPath, voiceType);
    }

    throw error;
  }
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
 * Compose video from scenes and audio
 */
async function composeVideoFromScenes(
  visuals: LessonVisuals,
  audioPath: string,
  outputPath: string,
  audioDuration: number
): Promise<void> {
  const visualsDir = path.dirname(outputPath).replace('/homework/', '/homework/') + '/visuals';

  // Get all scene images
  const sceneFiles = fs.readdirSync(visualsDir)
    .filter(f => f.startsWith('scene_') && f.endsWith('.png'))
    .sort();

  if (sceneFiles.length === 0) {
    throw new Error('No scene images found');
  }

  // Create a concat file for FFmpeg
  const concatFilePath = path.join(path.dirname(outputPath), 'concat.txt');

  // Calculate duration per scene to match audio
  const durationPerScene = audioDuration / sceneFiles.length;

  // Write concat file with durations
  const concatContent = sceneFiles.map(file => {
    const fullPath = path.join(visualsDir, file);
    return `file '${fullPath}'\nduration ${durationPerScene.toFixed(3)}`;
  }).join('\n');

  // Add last file again (FFmpeg concat requirement)
  const lastFile = path.join(visualsDir, sceneFiles[sceneFiles.length - 1]);
  fs.writeFileSync(concatFilePath, concatContent + `\nfile '${lastFile}'`);

  // FFmpeg command to create video
  const ffmpegCmd = `ffmpeg -y \
    -f concat -safe 0 -i "${concatFilePath}" \
    -i "${audioPath}" \
    -c:v libx264 -preset fast -crf 23 \
    -c:a ${VIDEO_SETTINGS.audioCodec} -b:a ${VIDEO_SETTINGS.audioBitrate} \
    -pix_fmt yuv420p \
    -r ${VIDEO_SETTINGS.fps} \
    -shortest \
    "${outputPath}"`;

  try {
    await execAsync(ffmpegCmd, { maxBuffer: 50 * 1024 * 1024 });
  } catch (error: any) {
    console.error('[FFmpeg] Error:', error.message);
    throw new Error(`Video composition failed: ${error.message}`);
  }

  // Clean up concat file
  fs.unlinkSync(concatFilePath);
}

/**
 * Alternative: Create video with smoother transitions
 */
export async function composeLessonVideoSmooth(
  script: LessonScript,
  intake: HomeworkIntake,
  orderId: string,
  voiceType: keyof typeof TUTOR_VOICES = 'warm_female'
): Promise<{ videoPath: string; audioPath: string; duration: number }> {
  const outputDir = path.join(process.cwd(), 'outputs', 'homework', orderId);
  const visualsDir = getVisualsOutputDir(orderId);
  const audioPath = path.join(outputDir, 'voiceover.mp3');
  const videoPath = path.join(outputDir, 'lesson.mp4');

  // Ensure directories
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate voiceover
  console.log('[VideoComposer] Generating voiceover...');
  await generateVoiceover(script.fullScript, audioPath, voiceType);

  const audioDuration = await getAudioDuration(audioPath);

  // Generate visuals
  console.log('[VideoComposer] Generating visuals...');
  const visuals = await generateLessonVisuals(script, visualsDir);

  // Create slideshow with crossfade transitions
  const sceneFiles = fs.readdirSync(visualsDir)
    .filter(f => f.startsWith('scene_') && f.endsWith('.png'))
    .sort()
    .map(f => path.join(visualsDir, f));

  if (sceneFiles.length === 0) {
    throw new Error('No scene files generated');
  }

  // Calculate timing for each scene
  const baseSceneDuration = audioDuration / sceneFiles.length;
  const transitionDuration = Math.min(0.5, baseSceneDuration / 4);

  // Build FFmpeg filter complex for crossfade
  const inputArgs = sceneFiles.map((f, i) => `-loop 1 -t ${baseSceneDuration} -i "${f}"`).join(' ');

  let filterComplex = '';
  let lastOutput = '[0:v]';

  for (let i = 1; i < sceneFiles.length; i++) {
    const offset = (i - 1) * baseSceneDuration + baseSceneDuration - transitionDuration;
    const outputLabel = i === sceneFiles.length - 1 ? 'vout' : `v${i}`;
    filterComplex += `${lastOutput}[${i}:v]xfade=transition=fade:duration=${transitionDuration}:offset=${offset.toFixed(3)}[${outputLabel}];`;
    lastOutput = `[${outputLabel}]`;
  }

  if (sceneFiles.length === 1) {
    filterComplex = '[0:v]copy[vout]';
  }

  // Remove trailing semicolon
  filterComplex = filterComplex.replace(/;$/, '');

  const ffmpegCmd = `ffmpeg -y ${inputArgs} -i "${audioPath}" \
    -filter_complex "${filterComplex}" \
    -map "[vout]" -map ${sceneFiles.length}:a \
    -c:v libx264 -preset fast -crf 23 \
    -c:a ${VIDEO_SETTINGS.audioCodec} -b:a ${VIDEO_SETTINGS.audioBitrate} \
    -pix_fmt yuv420p \
    -shortest \
    "${videoPath}"`;

  try {
    await execAsync(ffmpegCmd, { maxBuffer: 100 * 1024 * 1024, timeout: 600000 });
  } catch (error: any) {
    // If smooth fails, fall back to basic
    console.warn('[VideoComposer] Smooth composition failed, using basic method');
    return composeLessonVideo(script, intake, orderId, voiceType);
  }

  return { videoPath, audioPath, duration: audioDuration };
}

/**
 * Upload video to storage (Cloudflare R2)
 */
export async function uploadVideo(
  videoPath: string,
  orderId: string
): Promise<string> {
  // For MVP, we'll serve from local storage
  // In production, this would upload to R2/S3

  const publicDir = path.join(process.cwd(), 'public', 'homework-videos');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const filename = `lesson_${orderId}.mp4`;
  const destPath = path.join(publicDir, filename);

  fs.copyFileSync(videoPath, destPath);

  // Return public URL
  const baseUrl = process.env.BASE_URL || 'https://personalizedoutput.com';
  return `${baseUrl}/homework-videos/${filename}`;
}

/**
 * Get voice selection based on intake preferences
 */
export function selectVoiceForIntake(intake: HomeworkIntake): keyof typeof TUTOR_VOICES {
  switch (intake.tone) {
    case 'enthusiastic':
      return 'friendly_female';
    case 'calm':
      return 'calm_female';
    case 'matter_of_fact':
      return 'calm_male';
    case 'encouraging':
    default:
      return 'warm_female';
  }
}

/**
 * Get output paths for an order
 */
export function getOrderPaths(orderId: string): {
  outputDir: string;
  visualsDir: string;
  audioPath: string;
  videoPath: string;
} {
  const outputDir = path.join(process.cwd(), 'outputs', 'homework', orderId);
  return {
    outputDir,
    visualsDir: path.join(outputDir, 'visuals'),
    audioPath: path.join(outputDir, 'voiceover.mp3'),
    videoPath: path.join(outputDir, 'lesson.mp4')
  };
}
