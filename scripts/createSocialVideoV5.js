/**
 * Social Video V5 - Final Polish
 *
 * Fixes:
 * 1. Human-sounding mom voice (configurable - pick best from experiments)
 * 2. Santa audio cut at "you did what was right" (configurable duration)
 * 3. Canvas-rendered text overlays (proper apostrophe!)
 * 4. Beautiful bokeh background
 */

require('dotenv').config();
const { createCanvas, registerFont } = require('canvas');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================
// CONFIGURATION - ADJUST THESE BASED ON YOUR REVIEW
// ============================================================

// Pick the voice that sounds most human from experiments
// Options: sarah, jessica, lily
const SELECTED_VOICE = 'jessica';

// Pick the settings that worked best
// Options: santa_original, more_expressive, very_expressive,
//          natural_variation, very_natural, balanced_human
const SELECTED_SETTINGS = 'balanced_human';

// Santa audio duration - cut at "you did what was right"
// Adjust this if needed (try 15-18 seconds)
const SANTA_DURATION = 17;

// ============================================================
// VOICE CONFIGURATION
// ============================================================

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

const VOICE_IDS = {
  sarah: 'EXAVITQu4vr4xnSDxMaL',
  jessica: 'cgSgspJ2msm6clMCkdW9',
  lily: 'pFZP5JQG7iQjIQuC4Bku'
};

const SETTINGS_OPTIONS = {
  santa_original: { stability: 0.68, similarity_boost: 0.82, style: 0.32 },
  more_expressive: { stability: 0.68, similarity_boost: 0.82, style: 0.45 },
  very_expressive: { stability: 0.68, similarity_boost: 0.82, style: 0.55 },
  natural_variation: { stability: 0.55, similarity_boost: 0.82, style: 0.40 },
  very_natural: { stability: 0.50, similarity_boost: 0.82, style: 0.45 },
  balanced_human: { stability: 0.60, similarity_boost: 0.80, style: 0.42 }
};

// Paths
const OUTPUT_DIR = 'outputs/social-videos';
const BOKEH_BG = 'outputs/social-videos/bokeh_background.mp4';
const SANTA_AUDIO = 'outputs/santa/santa-emma-deep-1764934040825.mp3';

// Video dimensions
const WIDTH = 1080;
const HEIGHT = 1920;

// Mom's script
const MOM_LINES = {
  hook: "Okay... so I have to share this...",
  setup: "I got my daughter Emma... a personalized message from Santa... and I was NOT prepared. Let me play some of it for you...",
  reaction: "Oh my goodness... I have to pause it there... this is just... too good.",
  cta: "We made this at Personalized Output dot com. Your baby deserves one too. All our babies do."
};

// ============================================================
// TEXT OVERLAY RENDERING (Canvas-based for proper apostrophe)
// ============================================================

function createTextOverlay(text, fontSize, yPosition, filename) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Text styling
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;

  // White text
  ctx.fillStyle = 'white';
  ctx.fillText(text, WIDTH / 2, yPosition);

  // Save as PNG
  const filepath = path.join(OUTPUT_DIR, filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filepath, buffer);

  return filepath;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getAudioDuration(filepath) {
  const result = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filepath}"`);
  return parseFloat(result.toString().trim());
}

async function generateMomAudio(text, filename) {
  const filepath = path.join(OUTPUT_DIR, filename);
  const voiceId = VOICE_IDS[SELECTED_VOICE];
  const settings = SETTINGS_OPTIONS[SELECTED_SETTINGS];

  console.log(`[Mom Voice] ${SELECTED_VOICE} + ${SELECTED_SETTINGS}`);
  console.log(`  Text: "${text.substring(0, 40)}..."`);

  const response = await axios({
    method: 'POST',
    url: `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    data: {
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        ...settings,
        use_speaker_boost: true
      }
    },
    responseType: 'arraybuffer'
  });

  const audioBuffer = Buffer.from(response.data);
  fs.writeFileSync(filepath, audioBuffer);
  console.log(`  ✓ Saved: ${filename}`);

  return filepath;
}

function processSantaAudio(inputPath, outputPath, duration) {
  console.log(`[Santa] Trimming to ${duration}s + deepening...`);
  execSync(`ffmpeg -y -i "${inputPath}" -t ${duration} -af "asetrate=44100*0.95,aresample=44100,volume=1.1" "${outputPath}" 2>/dev/null`);
  return outputPath;
}

// ============================================================
// MAIN VIDEO CREATION
// ============================================================

async function createV5() {
  console.log('='.repeat(70));
  console.log('SOCIAL VIDEO V5 - FINAL POLISH');
  console.log('='.repeat(70));
  console.log(`Voice: ${SELECTED_VOICE} + ${SELECTED_SETTINGS}`);
  console.log(`Santa duration: ${SANTA_DURATION}s`);
  console.log('');

  // Verify bokeh background
  if (!fs.existsSync(BOKEH_BG)) {
    throw new Error('Bokeh background not found!');
  }

  // Step 1: Generate mom audio
  console.log('[Step 1/6] Generating mom audio...');
  const momHook = await generateMomAudio(MOM_LINES.hook, 'mom_v5_hook.mp3');
  const momSetup = await generateMomAudio(MOM_LINES.setup, 'mom_v5_setup.mp3');
  const momReaction = await generateMomAudio(MOM_LINES.reaction, 'mom_v5_reaction.mp3');
  const momCta = await generateMomAudio(MOM_LINES.cta, 'mom_v5_cta.mp3');

  const hookDuration = getAudioDuration(momHook);
  const setupDuration = getAudioDuration(momSetup);
  const reactionDuration = getAudioDuration(momReaction);
  const ctaDuration = getAudioDuration(momCta);

  console.log(`  Hook: ${hookDuration.toFixed(2)}s, Setup: ${setupDuration.toFixed(2)}s`);
  console.log(`  Reaction: ${reactionDuration.toFixed(2)}s, CTA: ${ctaDuration.toFixed(2)}s`);
  console.log('');

  // Step 2: Process Santa audio
  console.log('[Step 2/6] Processing Santa audio...');
  const santaProcessed = path.join(OUTPUT_DIR, 'santa_v5.mp3');
  processSantaAudio(SANTA_AUDIO, santaProcessed, SANTA_DURATION);
  const santaDuration = getAudioDuration(santaProcessed);
  console.log(`  Duration: ${santaDuration.toFixed(2)}s`);
  console.log('');

  // Step 3: Create text overlay images
  console.log('[Step 3/6] Creating text overlays with canvas...');
  const hookText = createTextOverlay("I can't stop crying 😭", 72, 280, 'text_hook.png');
  const santaText = createTextOverlay("Emma's Personalized Santa Message", 48, 900, 'text_santa.png');
  const ctaText = createTextOverlay("personalizedoutput.com", 68, 850, 'text_cta.png');
  const handleText = createTextOverlay("@PersonalizedOutput", 42, 950, 'text_handle.png');
  console.log('  ✓ Text overlays created (with proper apostrophe!)');
  console.log('');

  // Step 4: Calculate timeline
  console.log('[Step 4/6] Building timeline...');
  const timeline = {
    hook: { start: 0, duration: hookDuration },
    setup: { start: hookDuration + 0.3, duration: setupDuration },
    santa: { start: hookDuration + 0.3 + setupDuration + 0.4, duration: santaDuration },
    reaction: { start: 0, duration: reactionDuration },
    cta: { start: 0, duration: ctaDuration }
  };
  timeline.reaction.start = timeline.santa.start + santaDuration + 0.3;
  timeline.cta.start = timeline.reaction.start + reactionDuration + 0.3;

  const totalDuration = timeline.cta.start + ctaDuration + 2.5;
  const santaEnd = timeline.santa.start + santaDuration;

  console.log(`  Total duration: ${totalDuration.toFixed(2)}s`);
  console.log('');

  // Step 5: Mix audio
  console.log('[Step 5/6] Mixing audio...');
  const audioMixed = path.join(OUTPUT_DIR, 'audio_v5.mp3');

  execSync(`ffmpeg -y \
    -i "${momHook}" \
    -i "${momSetup}" \
    -i "${santaProcessed}" \
    -i "${momReaction}" \
    -i "${momCta}" \
    -filter_complex "\
      [0:a]adelay=${Math.round(timeline.hook.start * 1000)}|${Math.round(timeline.hook.start * 1000)}[a0]; \
      [1:a]adelay=${Math.round(timeline.setup.start * 1000)}|${Math.round(timeline.setup.start * 1000)}[a1]; \
      [2:a]adelay=${Math.round(timeline.santa.start * 1000)}|${Math.round(timeline.santa.start * 1000)}[a2]; \
      [3:a]adelay=${Math.round(timeline.reaction.start * 1000)}|${Math.round(timeline.reaction.start * 1000)}[a3]; \
      [4:a]adelay=${Math.round(timeline.cta.start * 1000)}|${Math.round(timeline.cta.start * 1000)}[a4]; \
      [a0][a1][a2][a3][a4]amix=inputs=5:duration=longest:normalize=0[aout]" \
    -map "[aout]" -c:a libmp3lame -q:a 2 "${audioMixed}" 2>/dev/null`);

  console.log('  ✓ Audio mixed');
  console.log('');

  // Step 6: Composite video
  console.log('[Step 6/6] Compositing video...');

  const outputVideo = path.join(OUTPUT_DIR, 'santa_emma_mom_reaction_v5.mp4');

  // Complex filter to overlay PNG text images at specific times
  const filterComplex = [
    // Scale background to fit
    `[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2[bg]`,

    // Overlay hook text (0 to 3.5s)
    `[1:v]format=rgba[hook]`,
    `[bg][hook]overlay=0:0:enable='lt(t,3.5)'[v1]`,

    // Overlay Santa text (during Santa audio)
    `[2:v]format=rgba[santa]`,
    `[v1][santa]overlay=0:0:enable='between(t,${timeline.santa.start},${santaEnd})'[v2]`,

    // Overlay CTA text (after CTA audio starts)
    `[3:v]format=rgba[cta]`,
    `[v2][cta]overlay=0:0:enable='gt(t,${timeline.cta.start})'[v3]`,

    // Overlay handle text (last 2.5 seconds)
    `[4:v]format=rgba[handle]`,
    `[v3][handle]overlay=0:0:enable='gt(t,${totalDuration - 2.5})'[vout]`
  ].join(';');

  execSync(`ffmpeg -y \
    -i "${BOKEH_BG}" \
    -i "${hookText}" \
    -i "${santaText}" \
    -i "${ctaText}" \
    -i "${handleText}" \
    -i "${audioMixed}" \
    -t ${totalDuration} \
    -filter_complex "${filterComplex}" \
    -map "[vout]" -map 5:a \
    -c:v libx264 -preset medium -crf 20 \
    -c:a aac -b:a 192k \
    -shortest \
    "${outputVideo}"`, { stdio: 'inherit' });

  // Verify and report
  const stats = fs.statSync(outputVideo);
  const finalDuration = getAudioDuration(outputVideo);

  console.log('');
  console.log('='.repeat(70));
  console.log('V5 COMPLETE');
  console.log('='.repeat(70));
  console.log(`File: ${outputVideo}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Duration: ${finalDuration.toFixed(2)}s`);
  console.log('');
  console.log('Configuration used:');
  console.log(`  Voice: ${SELECTED_VOICE}`);
  console.log(`  Settings: ${SELECTED_SETTINGS}`);
  console.log(`  Santa duration: ${SANTA_DURATION}s`);
  console.log('');

  // Cleanup temp files
  [audioMixed, hookText, santaText, ctaText, handleText].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  execSync(`open "${outputVideo}"`);
}

createV5().catch(console.error);
