/**
 * Video Generation Service
 * Creates marketing videos with ElevenLabs voiceovers, background music, and ffmpeg composition
 * Supports both voiceover and silent demo formats with visual variety
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { MarketingHook, MARKETING_HOOKS, getHooksByProduct } from './marketingHooks';
import {
  VoiceConfig,
  NARRATOR_VOICES,
  getRandomNarratorVoice,
  ELEVENLABS_MODELS,
  NATURAL_VOICE_SETTINGS,
  VIDEO_END_CTA
} from './voiceConfig';

const execAsync = promisify(exec);

// Configuration
const OUTPUT_DIR = path.join(process.cwd(), 'outputs', 'videos');
const AUDIO_DIR = path.join(process.cwd(), 'outputs', 'audio');
const MUSIC_DIR = path.join(process.cwd(), 'assets', 'music');
const ASSETS_DIR = path.join(process.cwd(), 'assets', 'video');

// Ensure directories exist
[OUTPUT_DIR, AUDIO_DIR, MUSIC_DIR, ASSETS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Visual style configurations for variety
export const VISUAL_STYLES = {
  gradient_warm: {
    name: 'Warm Gradient',
    colors: ['#e94560', '#ff6b6b', '#ffc93c'],
    textColor: 'white',
    accentColor: '#ffc93c'
  },
  gradient_cool: {
    name: 'Cool Gradient',
    colors: ['#667eea', '#764ba2', '#6B73FF'],
    textColor: 'white',
    accentColor: '#a8edea'
  },
  gradient_dark: {
    name: 'Dark Premium',
    colors: ['#1a1a2e', '#16213e', '#0f3460'],
    textColor: 'white',
    accentColor: '#e94560'
  },
  gradient_festive: {
    name: 'Holiday Festive',
    colors: ['#c41e3a', '#228b22', '#ffd700'],
    textColor: 'white',
    accentColor: '#ffd700'
  },
  gradient_ocean: {
    name: 'Ocean Blue',
    colors: ['#00c6ff', '#0072ff', '#005bea'],
    textColor: 'white',
    accentColor: '#00f260'
  },
  gradient_sunset: {
    name: 'Sunset Glow',
    colors: ['#f12711', '#f5af19', '#fc4a1a'],
    textColor: 'white',
    accentColor: '#f8b500'
  },
  gradient_purple: {
    name: 'Purple Dream',
    colors: ['#9d50bb', '#6e48aa', '#4776E6'],
    textColor: 'white',
    accentColor: '#ff9a9e'
  },
  gradient_minimal: {
    name: 'Minimal Clean',
    colors: ['#ffecd2', '#fcb69f', '#ffeaa7'],
    textColor: '#2d3436',
    accentColor: '#e17055'
  }
};

// Text animation styles
export const TEXT_STYLES = {
  bold_center: { fontFile: 'Arial Bold', position: 'center', size: 42 },
  elegant_top: { fontFile: 'Georgia Bold', position: 'top', size: 38 },
  modern_bottom: { fontFile: 'Helvetica Bold', position: 'bottom', size: 40 },
  dramatic_center: { fontFile: 'Impact', position: 'center', size: 48 }
};

// Video length presets
export const VIDEO_LENGTHS = {
  short: { target: 15, minDuration: 12, maxDuration: 20, wordsPerMinute: 180 },
  medium: { target: 30, minDuration: 25, maxDuration: 40, wordsPerMinute: 150 },
  long: { target: 60, minDuration: 50, maxDuration: 75, wordsPerMinute: 130 }
};

export interface VideoGenerationOptions {
  hook: MarketingHook;
  voice?: VoiceConfig;
  includeVoiceover: boolean;
  backgroundStyle: 'gradient' | 'product' | 'lifestyle';
  visualStyle?: keyof typeof VISUAL_STYLES;
  textStyle?: keyof typeof TEXT_STYLES;
  videoLength?: keyof typeof VIDEO_LENGTHS;
  outputFormat: 'mp4' | 'mov';
  resolution: '1080x1920' | '1080x1080' | '1920x1080'; // Portrait, Square, Landscape
  includeCaptions: boolean;
  includeMusic: boolean;
  musicVolume?: number; // 0-1, default 0.3 for voiceover, 0.6 for silent
}

export interface GeneratedVideo {
  id: string;
  path: string;
  audioPath?: string;
  musicPath?: string;
  hook: MarketingHook;
  voice?: VoiceConfig;
  duration: number;
  resolution: string;
  visualStyle: string;
  videoType: 'voiceover' | 'silent';
  createdAt: Date;
}

// Royalty-free background music tracks (placeholder URLs - replace with actual tracks)
export const BACKGROUND_MUSIC = {
  uplifting: { name: 'Uplifting Corporate', mood: 'positive', bpm: 120 },
  emotional: { name: 'Emotional Piano', mood: 'warm', bpm: 80 },
  energetic: { name: 'Energetic Pop', mood: 'exciting', bpm: 140 },
  festive: { name: 'Holiday Bells', mood: 'festive', bpm: 110 },
  inspiring: { name: 'Inspiring Acoustic', mood: 'motivational', bpm: 100 },
  calm: { name: 'Calm Ambient', mood: 'peaceful', bpm: 70 }
};

/**
 * Select random visual style for variety
 */
export function getRandomVisualStyle(product: string): keyof typeof VISUAL_STYLES {
  const styles = Object.keys(VISUAL_STYLES) as (keyof typeof VISUAL_STYLES)[];

  // Prefer certain styles for certain products
  const productPreferences: { [key: string]: (keyof typeof VISUAL_STYLES)[] } = {
    santa: ['gradient_festive', 'gradient_warm', 'gradient_dark'],
    vision_board: ['gradient_cool', 'gradient_purple', 'gradient_ocean', 'gradient_sunset'],
    flash_cards: ['gradient_cool', 'gradient_minimal', 'gradient_ocean'],
    clarity_planner: ['gradient_dark', 'gradient_cool', 'gradient_minimal'],
    general: styles
  };

  const preferred = productPreferences[product] || styles;
  return preferred[Math.floor(Math.random() * preferred.length)];
}

/**
 * Select random text style for variety
 */
export function getRandomTextStyle(): keyof typeof TEXT_STYLES {
  const styles = Object.keys(TEXT_STYLES) as (keyof typeof TEXT_STYLES)[];
  return styles[Math.floor(Math.random() * styles.length)];
}

/**
 * Get appropriate music mood for product/hook
 */
export function getMusicMoodForHook(hook: MarketingHook): keyof typeof BACKGROUND_MUSIC {
  const toneToMood: { [key: string]: keyof typeof BACKGROUND_MUSIC } = {
    warm: 'emotional',
    excited: 'energetic',
    curious: 'inspiring',
    urgent: 'uplifting',
    proud: 'uplifting',
    hopeful: 'inspiring',
    confident: 'energetic'
  };

  // Special case for Santa during holidays
  if (hook.product === 'santa') {
    return Math.random() > 0.5 ? 'festive' : 'emotional';
  }

  return toneToMood[hook.tone] || 'uplifting';
}

/**
 * Generate voiceover audio using ElevenLabs API
 *
 * OPTIMIZED FOR MAXIMUM NATURALNESS:
 * - Uses multilingual_v2 model (highest quality, most natural)
 * - Lower stability = more natural speech variation
 * - Higher similarity_boost = maintains voice character
 * - Style parameter adds emotional inflection
 * - Speaker boost for clarity
 */
export async function generateVoiceover(
  text: string,
  voice: VoiceConfig,
  outputPath: string,
  voiceType: 'marketing' | 'educational' | 'emotional' | 'personalized' = 'marketing'
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  // Get natural voice settings based on content type
  const voiceSettings = NATURAL_VOICE_SETTINGS[voiceType];

  console.log(`[TTS] Generating voiceover with ${voice.name} (${voiceType} mode)...`);
  console.log(`[TTS] Settings: stability=${voiceSettings.stability}, style=${voiceSettings.style}`);
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
      // Use multilingual_v2 for BEST quality and most natural sound
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
 * Generate gradient background video with variety
 */
async function generateGradientBackground(
  outputPath: string,
  duration: number,
  resolution: string,
  visualStyle: keyof typeof VISUAL_STYLES = 'gradient_dark'
): Promise<void> {
  const [width, height] = resolution.split('x').map(Number);
  const style = VISUAL_STYLES[visualStyle];

  // Parse colors to RGB for ffmpeg
  const parseColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  const color1 = parseColor(style.colors[0]);
  const color2 = parseColor(style.colors[1] || style.colors[0]);

  // Create animated gradient with style-specific colors
  // Different animation patterns for variety
  const animationPatterns = [
    // Horizontal wave
    `geq=r='${color1.r}+${(color2.r - color1.r)}*sin(2*PI*T/5+X/${width}*3.14)*0.5+0.5':g='${color1.g}+${(color2.g - color1.g)}*sin(2*PI*T/5+X/${width}*3.14)*0.5+0.5':b='${color1.b}+${(color2.b - color1.b)}*sin(2*PI*T/5+X/${width}*3.14)*0.5+0.5'`,
    // Vertical pulse
    `geq=r='${color1.r}+${(color2.r - color1.r)/2}*sin(2*PI*T/4+Y/${height}*3.14)':g='${color1.g}+${(color2.g - color1.g)/2}*sin(2*PI*T/4+Y/${height}*3.14)':b='${color1.b}+${(color2.b - color1.b)/2}*sin(2*PI*T/4+Y/${height}*3.14)'`,
    // Diagonal gradient
    `geq=r='${color1.r}+${(color2.r - color1.r)/2}*sin(2*PI*T/6+(X+Y)/${Math.max(width, height)}*3.14)':g='${color1.g}+${(color2.g - color1.g)/2}*sin(2*PI*T/6+(X+Y)/${Math.max(width, height)}*3.14)':b='${color1.b}+${(color2.b - color1.b)/2}*sin(2*PI*T/6+(X+Y)/${Math.max(width, height)}*3.14)'`,
    // Radial pulse
    `geq=r='${color1.r}+${(color2.r - color1.r)/2}*sin(2*PI*T/4+hypot(X-${width/2},Y-${height/2})/${Math.min(width, height)}*6.28)':g='${color1.g}+${(color2.g - color1.g)/2}*sin(2*PI*T/4+hypot(X-${width/2},Y-${height/2})/${Math.min(width, height)}*6.28)':b='${color1.b}+${(color2.b - color1.b)/2}*sin(2*PI*T/4+hypot(X-${width/2},Y-${height/2})/${Math.min(width, height)}*6.28)'`
  ];

  // Randomly select animation pattern for variety
  const pattern = animationPatterns[Math.floor(Math.random() * animationPatterns.length)];

  const ffmpegCmd = `ffmpeg -y -f lavfi -i "color=c=${style.colors[0].replace('#', '0x')}:s=${width}x${height}:d=${duration}" \
    -vf "${pattern}" \
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
 * Create text overlay on video with style variety
 */
async function addTextOverlay(
  inputVideo: string,
  outputVideo: string,
  mainText: string,
  ctaText: string,
  duration: number,
  visualStyle: keyof typeof VISUAL_STYLES = 'gradient_dark',
  textStyle: keyof typeof TEXT_STYLES = 'bold_center'
): Promise<void> {
  const vStyle = VISUAL_STYLES[visualStyle];
  const tStyle = TEXT_STYLES[textStyle];

  // Escape special characters for ffmpeg
  const escapeText = (t: string) => t.replace(/'/g, "'\\''").replace(/:/g, '\\:');

  // Word wrap for long text (max ~6 words per line)
  const wrapText = (text: string, maxWords: number = 6): string => {
    const words = text.split(' ');
    const lines: string[] = [];
    for (let i = 0; i < words.length; i += maxWords) {
      lines.push(words.slice(i, i + maxWords).join(' '));
    }
    return lines.join('\\n');
  };

  const mainWrapped = wrapText(mainText);
  const mainEscaped = escapeText(mainWrapped);
  const ctaEscaped = escapeText(ctaText);

  // Follow CTA at the END of ALL videos
  const followCtaText = VIDEO_END_CTA.text;
  const followCtaEscaped = escapeText(followCtaText);

  // Calculate timing - main text, then CTA, then Follow CTA at very end
  const ctaStart = duration - 4.5;  // Product CTA starts 4.5s before end
  const followCtaStart = duration - 2.5;  // Follow CTA last 2.5 seconds

  // Position calculations based on text style
  let mainY = 'h/2-th';
  let ctaY = 'h/2+100';
  let followCtaY = 'h*7/8';  // Bottom of screen for Follow CTA

  if (tStyle.position === 'top') {
    mainY = 'h/4';
    ctaY = 'h*3/4';
    followCtaY = 'h*7/8';
  } else if (tStyle.position === 'bottom') {
    mainY = 'h*2/3-th';
    ctaY = 'h*5/6';
    followCtaY = 'h*11/12';
  }

  // Font file paths (macOS)
  const fontMap: { [key: string]: string } = {
    'Arial Bold': '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    'Georgia Bold': '/System/Library/Fonts/Supplemental/Georgia Bold.ttf',
    'Helvetica Bold': '/System/Library/Fonts/Helvetica.ttc',
    'Impact': '/System/Library/Fonts/Supplemental/Impact.ttf'
  };
  const fontFile = fontMap[tStyle.fontFile] || fontMap['Arial Bold'];

  // Convert accent color to ffmpeg format
  const accentHex = vStyle.accentColor.replace('#', '');
  const textHex = vStyle.textColor === 'white' ? 'ffffff' : vStyle.textColor.replace('#', '');

  // Build ffmpeg command with THREE text overlays:
  // 1. Main hook text (first part of video)
  // 2. Product CTA (middle/end)
  // 3. Follow @PersonalizedOutput CTA (ALWAYS at end of ALL videos)
  const ffmpegCmd = `ffmpeg -y -i "${inputVideo}" -vf "\
drawtext=fontfile='${fontFile}':text='${mainEscaped}':fontcolor=0x${textHex}:fontsize=${tStyle.size}:x=(w-text_w)/2:y=${mainY}:enable='between(t,0,${ctaStart})',\
drawtext=fontfile='${fontFile}':text='${ctaEscaped}':fontcolor=0x${accentHex}:fontsize=${Math.round(tStyle.size * 0.85)}:x=(w-text_w)/2:y=${ctaY}:enable='between(t,${ctaStart},${duration})',\
drawtext=fontfile='${fontFile}':text='${followCtaEscaped}':fontcolor=0x${accentHex}:fontsize=${Math.round(tStyle.size * 0.6)}:x=(w-text_w)/2:y=${followCtaY}:enable='between(t,${followCtaStart},${duration})'\
" -c:a copy "${outputVideo}"`;

  await execAsync(ffmpegCmd);
}

/**
 * Generate silent background music track using ffmpeg (synthesized)
 * This is a placeholder - in production, use actual royalty-free music files
 */
async function generateBackgroundMusic(
  outputPath: string,
  duration: number,
  mood: keyof typeof BACKGROUND_MUSIC
): Promise<void> {
  const music = BACKGROUND_MUSIC[mood];
  // Generate a simple ambient tone as placeholder
  // In production, this would select from pre-loaded royalty-free tracks
  const freq = mood === 'festive' ? 440 : mood === 'energetic' ? 523 : 392;

  const ffmpegCmd = `ffmpeg -y -f lavfi -i "sine=frequency=${freq}:duration=${duration}" \
    -af "volume=0.1,lowpass=f=800,tremolo=f=2:d=0.3" \
    -c:a aac -b:a 128k "${outputPath}"`;

  await execAsync(ffmpegCmd);
}

/**
 * Mix voiceover with background music
 */
async function mixAudioWithMusic(
  voiceoverPath: string,
  musicPath: string,
  outputPath: string,
  musicVolume: number = 0.3
): Promise<void> {
  // Mix voiceover (full volume) with background music (reduced volume)
  const ffmpegCmd = `ffmpeg -y -i "${voiceoverPath}" -i "${musicPath}" \
    -filter_complex "[1:a]volume=${musicVolume}[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=2" \
    -c:a aac -b:a 192k "${outputPath}"`;

  await execAsync(ffmpegCmd);
}

/**
 * Main video generation function with full variety support
 */
export async function generateMarketingVideo(options: VideoGenerationOptions): Promise<GeneratedVideo> {
  const {
    hook,
    includeVoiceover,
    resolution,
    includeCaptions,
    includeMusic,
    musicVolume
  } = options;

  // Select visual and text styles for variety
  const visualStyle = options.visualStyle || getRandomVisualStyle(hook.product);
  const textStyle = options.textStyle || getRandomTextStyle();
  const voice = options.voice || getRandomNarratorVoice(hook.product);

  const videoType = includeVoiceover ? 'voiceover' : 'silent';
  const videoId = `${hook.id}_${videoType}_${visualStyle}_${Date.now()}`;
  const tempVideoPath = path.join(OUTPUT_DIR, `${videoId}_temp.mp4`);
  const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`);
  const musicPath = path.join(AUDIO_DIR, `${videoId}_music.aac`);
  const mixedAudioPath = path.join(AUDIO_DIR, `${videoId}_mixed.aac`);
  const finalVideoPath = path.join(OUTPUT_DIR, `${videoId}.mp4`);

  console.log(`\n[VIDEO] ═══════════════════════════════════════════════`);
  console.log(`[VIDEO] Generating: ${videoId}`);
  console.log(`[VIDEO] Type: ${videoType.toUpperCase()}`);
  console.log(`[VIDEO] Visual Style: ${VISUAL_STYLES[visualStyle].name}`);
  console.log(`[VIDEO] Hook: ${hook.hook.substring(0, 50)}...`);
  console.log(`[VIDEO] Resolution: ${resolution}`);
  console.log(`[VIDEO] Voiceover: ${includeVoiceover ? voice.name : 'None (Silent Demo)'}`);
  console.log(`[VIDEO] Music: ${includeMusic ? 'Yes' : 'No'}`);

  let duration: number;

  // Build full script - ALWAYS include Follow CTA at the end for voiceover
  const productScript = `${hook.hook} ${hook.cta}`;
  const fullScript = includeVoiceover
    ? `${productScript} ... ${VIDEO_END_CTA.voiceover}`  // Add "Follow us for more at Personalized Output"
    : productScript;

  // Step 1: Determine duration and generate voiceover if needed
  if (includeVoiceover) {
    await generateVoiceover(fullScript, voice, audioPath, 'marketing');
    duration = await getAudioDuration(audioPath);
    duration += 1.5; // Add padding
  } else {
    // For silent videos, use reading speed to determine duration
    // Add extra time for Follow CTA text at the end
    const wordCount = productScript.split(' ').length;
    duration = Math.max(10, (wordCount / 120) * 60 + 5);  // Extra time for Follow CTA
  }

  console.log(`[VIDEO] Duration: ${duration.toFixed(1)}s`);

  // Step 2: Generate background video with selected visual style
  await generateGradientBackground(tempVideoPath, duration, resolution, visualStyle);
  console.log(`[VIDEO] ✓ Background generated (${VISUAL_STYLES[visualStyle].name})`);

  // Step 3: Add text overlay with selected text style
  const withTextPath = path.join(OUTPUT_DIR, `${videoId}_text.mp4`);
  await addTextOverlay(tempVideoPath, withTextPath, hook.hook, hook.cta, duration, visualStyle, textStyle);
  console.log(`[VIDEO] ✓ Text overlay added (${TEXT_STYLES[textStyle].position} position)`);

  // Step 4: Handle audio - voiceover, music, or both
  let finalAudioPath: string | undefined;

  if (includeVoiceover && includeMusic) {
    // Generate music and mix with voiceover
    const musicMood = getMusicMoodForHook(hook);
    await generateBackgroundMusic(musicPath, duration, musicMood);
    await mixAudioWithMusic(audioPath, musicPath, mixedAudioPath, musicVolume || 0.25);
    finalAudioPath = mixedAudioPath;
    console.log(`[VIDEO] ✓ Audio mixed (voiceover + ${BACKGROUND_MUSIC[musicMood].name})`);
  } else if (includeVoiceover) {
    finalAudioPath = audioPath;
    console.log(`[VIDEO] ✓ Voiceover ready`);
  } else if (includeMusic) {
    // Silent video with music only
    const musicMood = getMusicMoodForHook(hook);
    const silentMusicVolume = musicVolume || 0.6; // Louder music for silent videos
    await generateBackgroundMusic(musicPath, duration, musicMood);
    // Adjust volume for silent video
    const adjustedMusicPath = path.join(AUDIO_DIR, `${videoId}_music_adjusted.aac`);
    await execAsync(`ffmpeg -y -i "${musicPath}" -af "volume=${silentMusicVolume}" -c:a aac "${adjustedMusicPath}"`);
    finalAudioPath = adjustedMusicPath;
    console.log(`[VIDEO] ✓ Music track ready (${BACKGROUND_MUSIC[musicMood].name} @ ${silentMusicVolume * 100}% volume)`);
  }

  // Step 5: Combine video with audio
  if (finalAudioPath) {
    await combineAudioVideo(withTextPath, finalAudioPath, finalVideoPath);
    console.log(`[VIDEO] ✓ Audio combined`);
  } else {
    fs.renameSync(withTextPath, finalVideoPath);
    console.log(`[VIDEO] ✓ Silent video (no audio)`);
  }

  // Clean up temp files
  const tempFiles = [tempVideoPath, withTextPath, musicPath, mixedAudioPath];
  tempFiles.forEach(file => {
    if (file && file !== finalVideoPath && fs.existsSync(file)) {
      try { fs.unlinkSync(file); } catch {}
    }
  });

  console.log(`[VIDEO] ✓ Complete: ${path.basename(finalVideoPath)}`);
  console.log(`[VIDEO] ═══════════════════════════════════════════════\n`);

  return {
    id: videoId,
    path: finalVideoPath,
    audioPath: includeVoiceover ? audioPath : undefined,
    musicPath: includeMusic ? musicPath : undefined,
    hook,
    voice: includeVoiceover ? voice : undefined,
    duration,
    resolution,
    visualStyle: VISUAL_STYLES[visualStyle].name,
    videoType,
    createdAt: new Date()
  };
}

/**
 * Options for batch video generation
 */
export interface BatchGenerationOptions {
  product: MarketingHook['product'];
  count: number;
  includeVoiceover?: boolean; // true = voiceover videos, false = silent demos
  includeMusic?: boolean;
  resolutions?: VideoGenerationOptions['resolution'][];
  generateBothFormats?: boolean; // If true, generates both voiceover AND silent versions
}

/**
 * Generate batch of marketing videos with variety
 */
export async function generateVideoBatch(
  product: MarketingHook['product'],
  count: number,
  includeVoiceover: boolean = true
): Promise<GeneratedVideo[]> {
  return generateVideoBatchAdvanced({
    product,
    count,
    includeVoiceover,
    includeMusic: true,
    generateBothFormats: false
  });
}

/**
 * Advanced batch generation with full variety options
 */
export async function generateVideoBatchAdvanced(
  options: BatchGenerationOptions
): Promise<GeneratedVideo[]> {
  const {
    product,
    count,
    includeVoiceover = true,
    includeMusic = true,
    resolutions = ['1080x1920'], // Default: Portrait for TikTok/Reels/Shorts
    generateBothFormats = false
  } = options;

  const hooks = getHooksByProduct(product);
  const selectedHooks = hooks.slice(0, Math.min(count, hooks.length));

  const totalVideos = generateBothFormats ? selectedHooks.length * 2 : selectedHooks.length;
  console.log(`\n[BATCH] ════════════════════════════════════════════════════════`);
  console.log(`[BATCH] Starting batch generation for: ${product.toUpperCase()}`);
  console.log(`[BATCH] Hooks selected: ${selectedHooks.length}`);
  console.log(`[BATCH] Generate both formats: ${generateBothFormats ? 'YES (voiceover + silent)' : 'NO'}`);
  console.log(`[BATCH] Total videos to generate: ${totalVideos}`);
  console.log(`[BATCH] ════════════════════════════════════════════════════════\n`);

  const results: GeneratedVideo[] = [];
  let videoCount = 0;

  for (let i = 0; i < selectedHooks.length; i++) {
    const hook = selectedHooks[i];

    // Generate voiceover version
    if (includeVoiceover || generateBothFormats) {
      videoCount++;
      console.log(`\n[BATCH] Progress: ${videoCount}/${totalVideos} (Voiceover)`);

      try {
        const video = await generateMarketingVideo({
          hook,
          includeVoiceover: true,
          backgroundStyle: 'gradient',
          outputFormat: 'mp4',
          resolution: resolutions[Math.floor(Math.random() * resolutions.length)],
          includeCaptions: true,
          includeMusic
        });
        results.push(video);
      } catch (error) {
        console.error(`[BATCH] Error generating voiceover video for hook ${hook.id}:`, error);
      }

      // Rate limiting delay for ElevenLabs
      if (videoCount < totalVideos) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Generate silent version
    if (!includeVoiceover || generateBothFormats) {
      videoCount++;
      console.log(`\n[BATCH] Progress: ${videoCount}/${totalVideos} (Silent Demo)`);

      try {
        const video = await generateMarketingVideo({
          hook,
          includeVoiceover: false,
          backgroundStyle: 'gradient',
          outputFormat: 'mp4',
          resolution: resolutions[Math.floor(Math.random() * resolutions.length)],
          includeCaptions: true,
          includeMusic // Silent demos with music are great for scroll-without-sound
        });
        results.push(video);
      } catch (error) {
        console.error(`[BATCH] Error generating silent video for hook ${hook.id}:`, error);
      }
    }
  }

  // Summary
  console.log(`\n[BATCH] ════════════════════════════════════════════════════════`);
  console.log(`[BATCH] ✓ BATCH COMPLETE`);
  console.log(`[BATCH] Videos generated: ${results.length}/${totalVideos}`);

  const voiceoverCount = results.filter(v => v.videoType === 'voiceover').length;
  const silentCount = results.filter(v => v.videoType === 'silent').length;
  console.log(`[BATCH] - Voiceover videos: ${voiceoverCount}`);
  console.log(`[BATCH] - Silent demos: ${silentCount}`);
  console.log(`[BATCH] Output directory: ${OUTPUT_DIR}`);
  console.log(`[BATCH] ════════════════════════════════════════════════════════\n`);

  return results;
}

/**
 * Full library generation options
 */
export interface FullLibraryOptions {
  generateBothFormats?: boolean; // Generate both voiceover AND silent for each hook
  includeMusic?: boolean;
  productsToGenerate?: MarketingHook['product'][];
  hooksPerProduct?: number; // Limit hooks per product (default: all)
}

/**
 * Generate ALL marketing videos (full library)
 * This is the main automation command - generates 80+ unique videos
 */
export async function generateFullVideoLibrary(
  options: FullLibraryOptions = {}
): Promise<{ [product: string]: GeneratedVideo[] }> {
  const {
    generateBothFormats = true, // Default: generate BOTH voiceover and silent
    includeMusic = true,
    productsToGenerate = ['santa', 'vision_board', 'flash_cards', 'clarity_planner', 'general'],
    hooksPerProduct = 100
  } = options;

  const results: { [product: string]: GeneratedVideo[] } = {};

  // Count total expected videos
  let totalHooks = 0;
  for (const product of productsToGenerate) {
    const hooks = getHooksByProduct(product);
    totalHooks += Math.min(hooks.length, hooksPerProduct);
  }
  const expectedVideos = generateBothFormats ? totalHooks * 2 : totalHooks;

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║          FULL VIDEO LIBRARY GENERATION - AUTOMATED PIPELINE          ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Products: ${productsToGenerate.join(', ').padEnd(53)}║`);
  console.log(`║  Hooks per product: ${hooksPerProduct.toString().padEnd(45)}║`);
  console.log(`║  Total hooks: ${totalHooks.toString().padEnd(51)}║`);
  console.log(`║  Generate both formats: ${generateBothFormats ? 'YES' : 'NO'.padEnd(40)}║`);
  console.log(`║  Expected videos: ${expectedVideos.toString().padEnd(46)}║`);
  console.log(`║  Background music: ${includeMusic ? 'YES' : 'NO'.padEnd(43)}║`);
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const startTime = Date.now();

  for (const product of productsToGenerate) {
    console.log(`\n▶ Generating ${product.toUpperCase()} videos...`);

    results[product] = await generateVideoBatchAdvanced({
      product,
      count: hooksPerProduct,
      includeVoiceover: true,
      includeMusic,
      generateBothFormats
    });
  }

  const endTime = Date.now();
  const durationMins = ((endTime - startTime) / 1000 / 60).toFixed(1);

  // Final summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║                    GENERATION COMPLETE                                ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════╣');

  let total = 0;
  let totalVoiceover = 0;
  let totalSilent = 0;

  for (const [product, videos] of Object.entries(results)) {
    const voiceover = videos.filter(v => v.videoType === 'voiceover').length;
    const silent = videos.filter(v => v.videoType === 'silent').length;
    console.log(`║  ${product.padEnd(20)} ${videos.length} videos (${voiceover} voiceover, ${silent} silent)`.padEnd(71) + '║');
    total += videos.length;
    totalVoiceover += voiceover;
    totalSilent += silent;
  }

  console.log('╠═══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  TOTAL: ${total} videos`.padEnd(71) + '║');
  console.log(`║  - Voiceover videos: ${totalVoiceover}`.padEnd(71) + '║');
  console.log(`║  - Silent demos: ${totalSilent}`.padEnd(71) + '║');
  console.log(`║  Duration: ${durationMins} minutes`.padEnd(71) + '║');
  console.log(`║  Output: ${OUTPUT_DIR}`.padEnd(71) + '║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Generate manifest file for tracking
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalVideos: total,
    voiceoverCount: totalVoiceover,
    silentCount: totalSilent,
    durationMinutes: parseFloat(durationMins),
    products: Object.fromEntries(
      Object.entries(results).map(([product, videos]) => [
        product,
        videos.map(v => ({
          id: v.id,
          path: v.path,
          type: v.videoType,
          style: v.visualStyle,
          duration: v.duration,
          hook: v.hook.hook.substring(0, 50) + '...'
        }))
      ])
    )
  };

  const manifestPath = path.join(OUTPUT_DIR, 'video_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[MANIFEST] Saved to: ${manifestPath}\n`);

  return results;
}

// Re-export from dependencies for CLI usage
export { MARKETING_HOOKS } from './marketingHooks';
export { NARRATOR_VOICES } from './voiceConfig';
