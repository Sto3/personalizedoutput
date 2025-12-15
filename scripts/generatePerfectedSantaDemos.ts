/**
 * Generate Perfected Santa Demo Clips
 *
 * Uses the EXACT settings from the perfected santa-emma-deep-1764934040825.mp3 file:
 * - stability: 0.68 (lower = natural variation)
 * - similarity_boost: 0.82 (higher = character consistency)
 * - style: 0.32 (moderate = warm without cheese)
 * - model: eleven_monolingual_v1
 *
 * CRITICAL: Scripts include Santa's identity (Ho ho ho, North Pole, etc.)
 *
 * Usage: npx ts-node scripts/generatePerfectedSantaDemos.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================
// PERFECTED VOICE SETTINGS (from santa-emma-deep-1764934040825.mp3)
// ============================================================

const PERFECTED_SANTA_SETTINGS = {
  stability: 0.68,           // KEY: Lower = natural speech variation
  similarity_boost: 0.82,    // Higher for character consistency
  style: 0.32                // Moderate for warmth without theatrics
};

const SANTA_MODEL = 'eleven_monolingual_v1';  // Better than multilingual for English
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const SANTA_VOICE_ID = process.env.ELEVENLABS_SANTA_VOICE_ID || '1wg2wOjdEWKA7yQD8Kca';

const OUTPUT_DIR = '/Users/matthewriley/EtsyInnovations/outputs/santa_perfected';
const PUBLIC_DIR = '/Users/matthewriley/EtsyInnovations/public/santa-demos';

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// ============================================================
// SANTA DEMO CLIPS - WITH PROPER SANTA IDENTITY
// ============================================================

interface SantaDemoClip {
  id: string;
  childName: string;
  emotionalPeakType: string;
  textHook: string;
  // Full Santa script with identity, pauses, and emotional content
  santaScript: string;
  // End card text for video
  endCardText: string;
}

// 8 Santa demo clips - FIXED with Santa identity
const SANTA_DEMO_CLIPS: SantaDemoClip[] = [
  {
    id: 'emma_grandmother',
    childName: 'Emma',
    emotionalPeakType: 'Deceased grandmother watching over her',
    textHook: 'She asked how Santa knew about her grandmother...',
    santaScript: `Ho ho ho! Hello Emma!

...

It's Santa... calling all the way from the North Pole.

...

Emma, I need to tell you something very special.

...

I know your grandmother isn't with you this Christmas. ... But sweetheart... she's watching over you... every single day.

...

And she is so proud... so proud of the kind, brave girl you're becoming.

...

She told me... she told me she loves the way you sing in the car... just like she used to.

...

She's right there with you, Emma. ... Always.

...

That's why you're on the Nice List, sweetheart. Because your heart... it's so full of love.

...

Merry Christmas, Emma. ... I'll see you very soon.`,
    endCardText: 'Personalized to your child. Ready in minutes.'
  },
  {
    id: 'liam_pet',
    childName: 'Liam',
    emotionalPeakType: 'Pet mentioned by name',
    textHook: 'He asked how Santa knew about his dog...',
    santaScript: `Ho ho ho! Hello there, Liam!

...

It's Santa! ... All the way from the North Pole.

...

Now Liam... I've been watching, and I have to tell you something.

...

You take such good care of Biscuit.

...

I see you filling his water bowl every morning... without anyone asking. ... I see you sharing your snacks with him... even the good ones.

...

Do you know what that tells me about you, Liam?

...

It tells me you have a kind heart. ... The kindest.

...

Biscuit is so lucky to have a friend like you.

...

Give him an extra treat from Santa, will you?

...

Merry Christmas, Liam. ... Biscuit and I will be thinking of you.`,
    endCardText: 'A message as unique as they are.'
  },
  {
    id: 'sophia_achievement',
    childName: 'Sophia',
    emotionalPeakType: 'Specific achievement - learning to read',
    textHook: 'The moment Santa mentioned her reading...',
    santaScript: `Ho ho ho! Well hello, Sophia!

...

It's Santa Claus... calling from my workshop at the North Pole.

...

Sophia... I heard something wonderful about you.

...

You learned to read this year.

...

All by yourself... you're sounding out the words now.

...

Do you know how proud that makes me?

...

I remember when you were scared to try... when the letters seemed too hard.

...

But you kept going. ... You didn't give up. ... And now look at you... a reader.

...

That took real courage, Sophia. ... Real courage.

...

You're definitely on the Nice List this year.

...

Merry Christmas, little one. ... Keep reading. ... Santa will be listening.`,
    endCardText: 'Create yours — link in bio.'
  },
  {
    id: 'noah_sibling',
    childName: 'Noah',
    emotionalPeakType: 'Being a good big brother',
    textHook: 'Santa knew he was a good big brother...',
    santaScript: `Ho ho ho! Noah!

...

It's Santa... all the way from the North Pole.

...

Now Noah... I want to tell you something important.

...

Being a big brother... that's one of the hardest jobs there is.

...

And you're doing it so well.

...

I see you sharing your toys with baby Lucas... even when you don't want to.

...

I see you making him laugh when he's crying.

...

That's not easy, Noah... but you do it anyway.

...

Do you know what that makes you?

...

That makes you a hero. ... A real hero.

...

Lucas is so lucky to have you as his big brother.

...

Merry Christmas, big brother. ... I'm so proud of you.`,
    endCardText: 'Personalized to your child. Ready in minutes.'
  },
  {
    id: 'olivia_hardship',
    childName: 'Olivia',
    emotionalPeakType: 'Getting through something hard',
    textHook: 'She whispered how did he know and started crying...',
    santaScript: `Ho ho ho... Hello Olivia.

...

It's Santa Claus.

...

Olivia... I know this year was hard.

...

Starting at a new school... leaving your old friends behind.

...

That takes so much courage.

...

But here's what I saw...

...

I saw you sit by yourself that first week... and then I saw you make a friend.

...

And then another.

...

You didn't let being scared stop you.

...

That's bravery, Olivia. ... Real bravery.

...

The elves and I... we've been watching. And we're so proud of you.

...

You're definitely on the Nice List.

...

Merry Christmas, brave girl. ... You're going to be just fine.`,
    endCardText: 'A message as unique as they are.'
  },
  {
    id: 'jackson_wish',
    childName: 'Jackson',
    emotionalPeakType: 'Secret wish Santa overheard',
    textHook: 'POV: Santa heard his secret wish...',
    santaScript: `Ho ho ho! Jackson!

...

It's Santa... calling from the North Pole.

...

Jackson... I heard you.

...

Late at night... when you thought no one was listening...

...

You whispered that you wanted a telescope.

...

You said you wanted to see the stars up close... to find the planets.

...

Well guess what, Jackson?

...

I hear all the wishes. ... Even the quiet ones.

...

Especially the quiet ones.

...

A boy who wants to explore the stars... that's a special boy.

...

Keep looking up at the sky, Jackson.

...

You're definitely on the Nice List.

...

Merry Christmas, little astronomer.`,
    endCardText: 'Create yours — link in bio.'
  },
  {
    id: 'ava_hobby',
    childName: 'Ava',
    emotionalPeakType: 'Specific hobby - painting',
    textHook: 'She still talks about this video...',
    santaScript: `Ho ho ho! Hello Ava!

...

It's Santa Claus... all the way from the North Pole.

...

Ava... I've been watching you paint.

...

Those sunsets you make... with all those oranges and pinks...

...

They're beautiful.

...

You know what I love most?

...

You don't rush. ... You take your time... mixing the colors just right.

...

That's what real artists do.

...

You're already an artist, Ava. ... A real one.

...

The elves showed me your paintings. They loved them.

...

You're on the Nice List, of course.

...

Merry Christmas, artist. ... Keep painting. ... The world needs more beauty.`,
    endCardText: 'Personalized to your child. Ready in minutes.'
  },
  {
    id: 'lucas_kindness',
    childName: 'Lucas',
    emotionalPeakType: 'Helping grandma - kindness moment',
    textHook: 'Santa mentioned grandma. He ran to show her.',
    santaScript: `Ho ho ho! Lucas!

...

It's Santa... calling from the North Pole.

...

Lucas... I saw what you did.

...

When Grandma dropped her groceries... you didn't wait to be asked.

...

You just helped.

...

You picked up every single thing... and you carried the heavy bag all the way inside.

...

Do you know what that tells me, Lucas?

...

You have a good heart. ... The best kind of heart.

...

Grandma told Mrs. Claus all about it. She was so proud.

...

And so am I.

...

You're at the very top of the Nice List this year.

...

Merry Christmas, kind boy. ... Grandma is so proud of you. ... So am I.`,
    endCardText: 'A message as unique as they are.'
  }
];

// ============================================================
// ELEVENLABS TTS WITH PERFECTED SETTINGS
// ============================================================

async function generateSantaVoice(script: string, outputPath: string): Promise<void> {
  console.log(`[VOICE] Generating Santa audio with PERFECTED settings...`);
  console.log(`[VOICE] Settings: stability=${PERFECTED_SANTA_SETTINGS.stability}, similarity=${PERFECTED_SANTA_SETTINGS.similarity_boost}, style=${PERFECTED_SANTA_SETTINGS.style}`);
  console.log(`[VOICE] Model: ${SANTA_MODEL}`);
  console.log(`[VOICE] Script length: ${script.length} chars`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${SANTA_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY!
    },
    body: JSON.stringify({
      text: script,
      model_id: SANTA_MODEL,
      voice_settings: PERFECTED_SANTA_SETTINGS
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const audioBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
  console.log(`[VOICE] Saved: ${outputPath} (${(audioBuffer.byteLength / 1024).toFixed(0)}KB)`);
}

// ============================================================
// VIDEO GENERATION
// ============================================================

async function getAudioDuration(audioPath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  );
  return parseFloat(stdout.trim());
}

async function generateSantaDemoVideo(clip: SantaDemoClip): Promise<string> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`GENERATING: ${clip.childName} - ${clip.emotionalPeakType}`);
  console.log(`${'═'.repeat(60)}`);

  const timestamp = Date.now();
  const audioPath = path.join(OUTPUT_DIR, `${clip.id}_audio_${timestamp}.mp3`);
  const outputPath = path.join(OUTPUT_DIR, `santa_perfected_${clip.id}_${timestamp}.mp4`);

  // Step 1: Generate audio with perfected settings
  await generateSantaVoice(clip.santaScript, audioPath);

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
  const tempVideoPath = path.join(OUTPUT_DIR, `temp_${clip.id}_${timestamp}.mp4`);
  const tempWithAudioPath = path.join(OUTPUT_DIR, `temp_audio_${clip.id}_${timestamp}.mp4`);

  // Escape text for ffmpeg drawtext filter
  const escapeText = (text: string) => text.replace(/'/g, "'\\'").replace(/:/g, '\\:');

  const hookText = escapeText(clip.textHook);
  const endText = escapeText(clip.endCardText);
  const childNameText = escapeText(clip.childName);
  const audioEndTime = textHookDuration + audioDuration;

  // Christmas gradient: deep red (#8B0000) background
  const drawTextFilter = [
    // Text hook (0-3s, centered, large white text)
    `drawtext=text='${hookText}':fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:fontsize=42:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,0,${textHookDuration})'`,
    // Child name subtitle during audio
    `drawtext=text='For ${childNameText}':fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:fontsize=28:fontcolor=white@0.8:x=(w-text_w)/2:y=h-120:enable='between(t,${textHookDuration},${audioEndTime})'`,
    // End card text
    `drawtext=text='${endText}':fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='gte(t,${audioEndTime})'`,
    // "Link in bio" subtitle
    `drawtext=text='Link in bio':fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:fontsize=24:fontcolor=white@0.7:x=(w-text_w)/2:y=(h/2)+60:enable='gte(t,${audioEndTime})'`
  ].join(',');

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

  // Copy to final output
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

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║         PERFECTED SANTA DEMO CLIPS                                    ║');
  console.log('║         Using exact settings from santa-emma-deep reference           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  console.log('PERFECTED VOICE SETTINGS:');
  console.log(`  stability: ${PERFECTED_SANTA_SETTINGS.stability}`);
  console.log(`  similarity_boost: ${PERFECTED_SANTA_SETTINGS.similarity_boost}`);
  console.log(`  style: ${PERFECTED_SANTA_SETTINGS.style}`);
  console.log(`  model: ${SANTA_MODEL}`);
  console.log(`  voice_id: ${SANTA_VOICE_ID}`);
  console.log('\n');

  console.log(`Generating ${SANTA_DEMO_CLIPS.length} Santa demo clips...\n`);

  const results: string[] = [];

  for (let i = 0; i < SANTA_DEMO_CLIPS.length; i++) {
    const clip = SANTA_DEMO_CLIPS[i];
    console.log(`\n[${i + 1}/${SANTA_DEMO_CLIPS.length}] ${clip.childName}: ${clip.emotionalPeakType}`);

    try {
      const outputPath = await generateSantaDemoVideo(clip);
      results.push(outputPath);

      // Rate limiting for ElevenLabs API
      if (i < SANTA_DEMO_CLIPS.length - 1) {
        console.log(`[RATE LIMIT] Waiting 3s before next...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
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
