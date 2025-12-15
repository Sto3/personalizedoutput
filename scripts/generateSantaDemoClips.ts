/**
 * Santa Demo Clips Generator
 *
 * Generates 30-40 second emotional peak clips for TikTok/Reels
 * Structure:
 *   [0-3 sec] Text hook
 *   [3-28 sec] Santa's emotional peak (the hyper-personal part)
 *   [28-35 sec] Warm closing
 *   [35-40 sec] End card
 *
 * Usage: npx ts-node scripts/generateSantaDemoClips.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ElevenLabs configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const WARM_SANTA_VOICE_ID = process.env.ELEVENLABS_WARM_SANTA_VOICE_ID || 'pqHfZKP75CvOlQylNhV4'; // Bill voice

const OUTPUT_DIR = '/Users/matthewriley/EtsyInnovations/outputs/santa_clips';
const PUBLIC_DIR = '/Users/matthewriley/EtsyInnovations/public/santa-demos';

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

interface SantaDemoClip {
  id: string;
  childName: string;
  emotionalPeakType: string;
  textHook: string;
  // The emotional peak script - 20-25 seconds of hyper-personal content
  emotionalPeakScript: string;
  // Warm closing - 5-7 seconds
  closingScript: string;
  // End card text
  endCardText: string;
}

// 8 Santa demo clips - each highlighting a DIFFERENT emotional peak type
const SANTA_DEMO_CLIPS: SantaDemoClip[] = [
  {
    id: 'emma_grandmother',
    childName: 'Emma',
    emotionalPeakType: 'Deceased grandmother watching over her',
    textHook: 'She asked how Santa knew about her grandmother...',
    emotionalPeakScript: `Emma... ... I know your grandmother isn't with you this Christmas. ... But I want you to know something. ... She's watching over you... every single day. ... And she is so proud... of the kind, brave girl you're becoming. ... She told me... she told me she loves the way you sing in the car... just like she used to. ... She's right there with you, sweetheart. ... Always.`,
    closingScript: `Merry Christmas, Emma. ... I'll see you very soon.`,
    endCardText: 'Personalized to your child. Ready in minutes.'
  },
  {
    id: 'liam_pet',
    childName: 'Liam',
    emotionalPeakType: 'Pet mentioned by name',
    textHook: 'He asked how Santa knew about his dog...',
    emotionalPeakScript: `Liam... ... I've been watching, and I have to say... ... you take such good care of Biscuit. ... I see you filling his water bowl every morning... without anyone asking. ... I see you sharing your snacks with him... even the good ones. ... Biscuit is so lucky to have a friend like you. ... Give him an extra treat from me, will you?`,
    closingScript: `Merry Christmas, Liam. ... Biscuit and I will be thinking of you.`,
    endCardText: 'A message as unique as they are.'
  },
  {
    id: 'sophia_achievement',
    childName: 'Sophia',
    emotionalPeakType: 'Specific achievement',
    textHook: 'The moment Santa mentioned her reading...',
    emotionalPeakScript: `Sophia... ... I heard something wonderful. ... You learned to read this year. ... All by yourself... you're sounding out the words now. ... Do you know how proud that makes me? ... I remember when you were scared to try... when the letters seemed too hard. ... But you kept going. ... You didn't give up. ... And now look at you... a reader.`,
    closingScript: `Merry Christmas, Sophia. ... Keep reading. ... I'll be listening.`,
    endCardText: 'Create yours — link in bio.'
  },
  {
    id: 'noah_sibling',
    childName: 'Noah',
    emotionalPeakType: 'Being a good sibling',
    textHook: 'Santa knew he was a good big brother...',
    emotionalPeakScript: `Noah... ... I want to tell you something important. ... Being a big brother... is one of the hardest jobs there is. ... And you're doing it so well. ... I see you sharing your toys with baby Lucas... even when you don't want to. ... I see you making him laugh when he's crying. ... That's not easy... but you do it anyway. ... That's what heroes do, Noah.`,
    closingScript: `Merry Christmas, big brother. ... Lucas is lucky to have you.`,
    endCardText: 'Personalized to your child. Ready in minutes.'
  },
  {
    id: 'olivia_hardship',
    childName: 'Olivia',
    emotionalPeakType: 'Getting through something hard',
    textHook: 'She whispered how did he know and started crying...',
    emotionalPeakScript: `Olivia... ... I know this year was hard. ... Starting at a new school... leaving your old friends behind. ... That takes so much courage. ... But here's what I saw... ... I saw you sit by yourself that first week... and then I saw you make a friend. ... And then another. ... You didn't let being scared stop you. ... That's bravery, Olivia. ... Real bravery.`,
    closingScript: `Merry Christmas, brave girl. ... You're going to be just fine.`,
    endCardText: 'A message as unique as they are.'
  },
  {
    id: 'jackson_wish',
    childName: 'Jackson',
    emotionalPeakType: 'Secret wish Santa "overheard"',
    textHook: 'POV: Santa heard his secret wish...',
    emotionalPeakScript: `Jackson... ... I heard you. ... Late at night... when you thought no one was listening... ... you whispered that you wanted a telescope. ... You said you wanted to see the stars up close... to find the planets. ... I hear all the wishes, Jackson. ... Even the quiet ones. ... Especially the quiet ones.`,
    closingScript: `Merry Christmas, little astronomer. ... Keep looking up.`,
    endCardText: 'Create yours — link in bio.'
  },
  {
    id: 'ava_hobby',
    childName: 'Ava',
    emotionalPeakType: 'Specific hobby/interest Santa knows',
    textHook: 'She still talks about this video...',
    emotionalPeakScript: `Ava... ... I've been watching you paint. ... Those sunsets you make... with all those oranges and pinks... ... they're beautiful. ... You know what I love most? ... You don't rush. ... You take your time... mixing the colors just right. ... That's what real artists do. ... You're already an artist, Ava. ... A real one.`,
    closingScript: `Merry Christmas, artist. ... Keep painting. ... The world needs more beauty.`,
    endCardText: 'Personalized to your child. Ready in minutes.'
  },
  {
    id: 'lucas_kindness',
    childName: 'Lucas',
    emotionalPeakType: 'Helping others / kindness moment',
    textHook: 'Santa mentioned grandma. He ran to show her.',
    emotionalPeakScript: `Lucas... ... I saw what you did. ... When Grandma dropped her groceries... you didn't wait to be asked. ... You just helped. ... You picked up every single thing... and you carried the heavy bag all the way inside. ... Do you know what that tells me? ... You have a good heart, Lucas. ... The best kind of heart.`,
    closingScript: `Merry Christmas, kind boy. ... Grandma is so proud of you. ... So am I.`,
    endCardText: 'A message as unique as they are.'
  }
];

/**
 * Generate Santa voice audio using ElevenLabs
 */
async function generateSantaVoice(script: string, outputPath: string): Promise<void> {
  console.log(`[VOICE] Generating Santa audio (${script.length} chars)...`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${WARM_SANTA_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY!
    },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.85,           // High stability for warm, consistent Santa
        similarity_boost: 0.72,    // Natural variation
        style: 0.20,               // Subtle style, not over-the-top
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
  console.log(`[VOICE] Saved: ${outputPath} (${(audioBuffer.byteLength / 1024).toFixed(0)}KB)`);
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
 * Generate a single Santa demo clip video
 */
async function generateSantaDemoClip(clip: SantaDemoClip): Promise<string> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`GENERATING: ${clip.childName} - ${clip.emotionalPeakType}`);
  console.log(`${'═'.repeat(60)}`);

  const timestamp = Date.now();
  const audioPath = path.join(OUTPUT_DIR, `${clip.id}_audio_${timestamp}.mp3`);
  const outputPath = path.join(OUTPUT_DIR, `santa_clip_${clip.id}_${timestamp}.mp4`);

  // Step 1: Generate audio for emotional peak + closing
  const fullScript = `${clip.emotionalPeakScript} ... ... ${clip.closingScript}`;
  await generateSantaVoice(fullScript, audioPath);

  // Step 2: Get audio duration
  const audioDuration = await getAudioDuration(audioPath);
  console.log(`[AUDIO] Duration: ${audioDuration.toFixed(1)}s`);

  // Step 3: Calculate video timing
  const textHookDuration = 3;           // 0-3 sec: text hook
  const audioStartTime = textHookDuration;
  const endCardDuration = 5;            // End card
  const totalDuration = textHookDuration + audioDuration + endCardDuration;

  console.log(`[TIMING] Hook: ${textHookDuration}s, Audio: ${audioDuration.toFixed(1)}s, End: ${endCardDuration}s`);
  console.log(`[TIMING] Total: ${totalDuration.toFixed(1)}s`);

  // Step 4: Create video with ffmpeg
  // Christmas colors: deep red background with subtle gradient
  const tempVideoPath = path.join(OUTPUT_DIR, `temp_${clip.id}_${timestamp}.mp4`);
  const tempWithAudioPath = path.join(OUTPUT_DIR, `temp_audio_${clip.id}_${timestamp}.mp4`);

  // Escape text for ffmpeg drawtext filter
  const escapeText = (text: string) => text.replace(/'/g, "'\\''").replace(/:/g, '\\:');

  // Create background video with text overlays
  const hookText = escapeText(clip.textHook);
  const endText = escapeText(clip.endCardText);
  const childNameText = escapeText(clip.childName);

  // FFmpeg filter for text overlays with timing
  // - Hook text: 0-3s (fade in/out)
  // - Child name subtitle: during audio (3s to audio end)
  // - End card: last 5 seconds
  const audioEndTime = textHookDuration + audioDuration;

  const drawTextFilter = [
    // Text hook (0-3s, centered, large white text)
    `drawtext=text='${hookText}':fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:fontsize=42:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,0,${textHookDuration})'`,
    // Child name subtitle during audio
    `drawtext=text='For ${childNameText}':fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:fontsize=28:fontcolor=white@0.8:x=(w-text_w)/2:y=h-120:enable='between(t,${textHookDuration},${audioEndTime})'`,
    // End card text
    `drawtext=text='${endText}':fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='gte(t,${audioEndTime})'`,
    // "Link in bio" subtitle on end card
    `drawtext=text='Link in bio':fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:fontsize=24:fontcolor=white@0.7:x=(w-text_w)/2:y=(h/2)+60:enable='gte(t,${audioEndTime})'`
  ].join(',');

  // Create video with Christmas gradient background (deep red to darker red)
  console.log(`[VIDEO] Creating background with text overlays...`);
  await execAsync(`ffmpeg -y -f lavfi -i "color=c=0x8B0000:s=1080x1920:d=${totalDuration}" \
    -vf "${drawTextFilter}" \
    -c:v libx264 -pix_fmt yuv420p -t ${totalDuration} "${tempVideoPath}"`);

  // Step 5: Add audio (delayed by textHookDuration)
  console.log(`[VIDEO] Adding Santa audio...`);
  await execAsync(`ffmpeg -y -i "${tempVideoPath}" -i "${audioPath}" \
    -filter_complex "[1:a]adelay=${textHookDuration * 1000}|${textHookDuration * 1000}[delayed];[delayed]apad=whole_dur=${totalDuration}[aout]" \
    -map 0:v -map "[aout]" \
    -c:v copy -c:a aac -shortest "${tempWithAudioPath}"`);

  // Step 6: Add subtle Christmas music bed (very low volume)
  // For now, just copy the file - music bed can be added later
  fs.copyFileSync(tempWithAudioPath, outputPath);

  // Cleanup temp files
  try {
    fs.unlinkSync(tempVideoPath);
    fs.unlinkSync(tempWithAudioPath);
  } catch (e) {
    // Ignore cleanup errors
  }

  // Copy to public directory
  const publicPath = path.join(PUBLIC_DIR, `${clip.id}.mp4`);
  fs.copyFileSync(outputPath, publicPath);
  console.log(`[PUBLIC] Copied to: ${publicPath}`);

  console.log(`\n✓ Santa clip saved: ${outputPath}`);
  return outputPath;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║         SANTA DEMO CLIPS - 30-40 Second Emotional Peaks               ║');
  console.log('║         Optimized for TikTok/Reels completion rate                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  console.log(`Generating ${SANTA_DEMO_CLIPS.length} Santa demo clips...\n`);

  const results: string[] = [];

  for (let i = 0; i < SANTA_DEMO_CLIPS.length; i++) {
    const clip = SANTA_DEMO_CLIPS[i];
    console.log(`\n[${i + 1}/${SANTA_DEMO_CLIPS.length}] ${clip.childName}: ${clip.emotionalPeakType}`);

    try {
      const outputPath = await generateSantaDemoClip(clip);
      results.push(outputPath);

      // Rate limiting for ElevenLabs API
      if (i < SANTA_DEMO_CLIPS.length - 1) {
        console.log(`[RATE LIMIT] Waiting 2s before next...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`[ERROR] Failed to generate ${clip.id}:`, error);
    }
  }

  console.log('\n');
  console.log('═'.repeat(60));
  console.log(`  COMPLETE: ${results.length}/${SANTA_DEMO_CLIPS.length} Santa demo clips generated`);
  console.log('═'.repeat(60));
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);
  console.log(`Public directory: ${PUBLIC_DIR}`);
  console.log('\n');
}

main().catch(console.error);
