/**
 * Social Video V4 - Premium Quality
 *
 * Features:
 * 1. Human-sounding mom voice (tested voice with Santa's settings)
 * 2. Beautiful animated bokeh background
 * 3. Premium typography with proper punctuation
 * 4. Extended Santa audio to complete the thought
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// ============================================================
// CONFIGURATION
// ============================================================

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Voice selection - CHANGE THIS based on voice test results
// Options: 'sarah', 'jessica', 'matilda', 'lily'
const SELECTED_VOICE = 'lily'; // Lily - Velvety Actress (most emotional)

const VOICE_IDS = {
  sarah: 'EXAVITQu4vr4xnSDxMaL',
  jessica: 'cgSgspJ2msm6clMCkdW9',
  matilda: 'XrExE9yKIg1WjnnlVkGX',
  lily: 'pFZP5JQG7iQjIQuC4Bku'
};

// Santa's proven settings
const HUMAN_VOICE_SETTINGS = {
  stability: 0.68,
  similarity_boost: 0.82,
  style: 0.32,
  use_speaker_boost: true
};

// Paths
const OUTPUT_DIR = 'outputs/social-videos';
const BOKEH_BG = 'outputs/social-videos/bokeh_background.mp4';
const SANTA_AUDIO = 'outputs/santa/santa-emma-deep-1764934040825.mp3';

// Mom's script with natural pauses for emotional delivery
const MOM_LINES = {
  hook: "Okay... so I have to share this...",
  setup: "I got my daughter Emma... a personalized message from Santa... and I was NOT prepared. Let me play some of it for you...",
  reaction: "Oh my goodness... I have to pause it there... this is just... too good.",
  cta: "We made this at Personalized Output dot com. Your baby deserves one too. All our babies do."
};

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

  console.log(`[Mom Voice] Generating (${SELECTED_VOICE}): "${text.substring(0, 40)}..."`);

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
      voice_settings: HUMAN_VOICE_SETTINGS
    },
    responseType: 'arraybuffer'
  });

  const audioBuffer = Buffer.from(response.data);
  fs.writeFileSync(filepath, audioBuffer);
  console.log(`  ✓ Saved: ${filename} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

  return filepath;
}

function processAudio(inputPath, outputPath, endTime) {
  console.log(`[Santa Audio] Trimming to ${endTime}s + deepening voice...`);
  execSync(`ffmpeg -y -i "${inputPath}" -t ${endTime} -af "asetrate=44100*0.95,aresample=44100,volume=1.1" "${outputPath}"`);
  return outputPath;
}

// ============================================================
// MAIN VIDEO CREATION
// ============================================================

async function createSocialVideoV4() {
  console.log('='.repeat(70));
  console.log('SOCIAL VIDEO V4 - PREMIUM QUALITY');
  console.log('='.repeat(70));
  console.log(`Voice: ${SELECTED_VOICE} (${VOICE_IDS[SELECTED_VOICE]})`);
  console.log('');

  // Verify bokeh background exists
  if (!fs.existsSync(BOKEH_BG)) {
    throw new Error('Bokeh background not found! Run createBokehBackground.js first.');
  }

  // Step 1: Generate mom audio
  console.log('[Step 1/5] Generating mom voice audio...');
  const momHook = await generateMomAudio(MOM_LINES.hook, 'mom_v4_hook.mp3');
  const momSetup = await generateMomAudio(MOM_LINES.setup, 'mom_v4_setup.mp3');
  const momReaction = await generateMomAudio(MOM_LINES.reaction, 'mom_v4_reaction.mp3');
  const momCta = await generateMomAudio(MOM_LINES.cta, 'mom_v4_cta.mp3');

  const hookDuration = getAudioDuration(momHook);
  const setupDuration = getAudioDuration(momSetup);
  const reactionDuration = getAudioDuration(momReaction);
  const ctaDuration = getAudioDuration(momCta);

  console.log('');
  console.log('Mom audio durations:');
  console.log(`  Hook: ${hookDuration.toFixed(2)}s`);
  console.log(`  Setup: ${setupDuration.toFixed(2)}s`);
  console.log(`  Reaction: ${reactionDuration.toFixed(2)}s`);
  console.log(`  CTA: ${ctaDuration.toFixed(2)}s`);
  console.log('');

  // Step 2: Process Santa audio - EXTENDED to 25 seconds to capture full quote
  console.log('[Step 2/5] Processing Santa audio (extended to 25s)...');
  const santaProcessed = path.join(OUTPUT_DIR, 'santa_v4.mp3');
  processAudio(SANTA_AUDIO, santaProcessed, 25);
  const santaDuration = getAudioDuration(santaProcessed);
  console.log(`  Santa duration: ${santaDuration.toFixed(2)}s`);
  console.log('');

  // Step 3: Calculate timeline
  console.log('[Step 3/5] Building timeline...');

  const timeline = {
    hook: { start: 0, duration: hookDuration },
    setup: { start: hookDuration + 0.3, duration: setupDuration },
    santa: { start: hookDuration + 0.3 + setupDuration + 0.4, duration: santaDuration },
    reaction: { start: 0, duration: reactionDuration },
    cta: { start: 0, duration: ctaDuration }
  };
  timeline.reaction.start = timeline.santa.start + santaDuration + 0.3;
  timeline.cta.start = timeline.reaction.start + reactionDuration + 0.3;

  const totalDuration = timeline.cta.start + ctaDuration + 2.5; // End card time

  console.log('  Timeline:');
  console.log(`    0:00 - Hook`);
  console.log(`    ${timeline.setup.start.toFixed(2)}s - Setup`);
  console.log(`    ${timeline.santa.start.toFixed(2)}s - Santa plays`);
  console.log(`    ${timeline.reaction.start.toFixed(2)}s - Mom reaction`);
  console.log(`    ${timeline.cta.start.toFixed(2)}s - CTA`);
  console.log(`    Total: ${totalDuration.toFixed(2)}s`);
  console.log('');

  // Step 4: Download a premium font or use system font
  console.log('[Step 4/5] Assembling video with premium visuals...');

  const outputVideo = path.join(OUTPUT_DIR, 'santa_emma_mom_reaction_v4.mp4');
  const santaEnd = timeline.santa.start + santaDuration;
  const ctaTime = timeline.cta.start;

  // Create intermediate files
  const audioMixed = path.join(OUTPUT_DIR, 'audio_mixed_v4.mp3');

  // Step 4a: Mix all audio with delays using amix
  console.log('  Mixing audio tracks...');

  const audioMixCmd = `ffmpeg -y \
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
    -map "[aout]" -c:a libmp3lame -q:a 2 \
    "${audioMixed}"`;

  execSync(audioMixCmd, { stdio: 'pipe' });
  console.log('  ✓ Audio mixed');

  // Step 4b: Composite video with text overlays
  console.log('  Adding text overlays to bokeh background...');

  // Using drawtext with proper escaping for apostrophe
  const drawTextFilters = [
    // Hook text - "I cannot stop crying" (emoji not supported)
    `drawtext=text='I cannot stop crying':fontsize=80:fontcolor=white:shadowcolor=black@0.7:shadowx=4:shadowy=4:x=(w-text_w)/2:y=280:enable='lt(t,3.5)'`,
    // Santa label - using escape for apostrophe
    `drawtext=text='Emma'"'"'s Personalized Santa Message':fontsize=48:fontcolor=white:shadowcolor=black@0.7:shadowx=3:shadowy=3:x=(w-text_w)/2:y=880:enable='between(t,${timeline.santa.start},${santaEnd})'`,
    // CTA URL
    `drawtext=text='personalizedoutput.com':fontsize=68:fontcolor=white:shadowcolor=black@0.8:shadowx=4:shadowy=4:x=(w-text_w)/2:y=850:enable='gt(t,${ctaTime})'`,
    // Social handle
    `drawtext=text='@PersonalizedOutput':fontsize=42:fontcolor=0xdddddd:shadowcolor=black@0.6:shadowx=2:shadowy=2:x=(w-text_w)/2:y=950:enable='gt(t,${totalDuration - 2})'`
  ].join(',');

  const videoCmd = `ffmpeg -y \
    -i "${BOKEH_BG}" \
    -i "${audioMixed}" \
    -t ${totalDuration} \
    -vf "${drawTextFilters}" \
    -map 0:v -map 1:a \
    -c:v libx264 -preset medium -crf 20 \
    -c:a aac -b:a 192k \
    -shortest \
    "${outputVideo}"`;

  try {
    execSync(videoCmd, { stdio: 'inherit' });
  } catch (error) {
    // If the apostrophe causes issues, try without it
    console.log('  Retrying without apostrophe in text...');
    const drawTextFiltersSimple = [
      `drawtext=text='I cannot stop crying':fontsize=80:fontcolor=white:shadowcolor=black@0.7:shadowx=4:shadowy=4:x=(w-text_w)/2:y=280:enable='lt(t,3.5)'`,
      `drawtext=text='Emmas Personalized Santa Message':fontsize=48:fontcolor=white:shadowcolor=black@0.7:shadowx=3:shadowy=3:x=(w-text_w)/2:y=880:enable='between(t,${timeline.santa.start},${santaEnd})'`,
      `drawtext=text='personalizedoutput.com':fontsize=68:fontcolor=white:shadowcolor=black@0.8:shadowx=4:shadowy=4:x=(w-text_w)/2:y=850:enable='gt(t,${ctaTime})'`,
      `drawtext=text='@PersonalizedOutput':fontsize=42:fontcolor=0xdddddd:shadowcolor=black@0.6:shadowx=2:shadowy=2:x=(w-text_w)/2:y=950:enable='gt(t,${totalDuration - 2})'`
    ].join(',');

    const videoCmdSimple = `ffmpeg -y \
      -i "${BOKEH_BG}" \
      -i "${audioMixed}" \
      -t ${totalDuration} \
      -vf "${drawTextFiltersSimple}" \
      -map 0:v -map 1:a \
      -c:v libx264 -preset medium -crf 20 \
      -c:a aac -b:a 192k \
      -shortest \
      "${outputVideo}"`;

    execSync(videoCmdSimple, { stdio: 'inherit' });
  }

  // Step 5: Verify output
  console.log('');
  console.log('[Step 5/5] Verifying output...');

  const stats = fs.statSync(outputVideo);
  const finalDuration = getAudioDuration(outputVideo);

  console.log('');
  console.log('='.repeat(70));
  console.log('V4 COMPLETE - PREMIUM QUALITY');
  console.log('='.repeat(70));
  console.log(`File: ${outputVideo}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Duration: ${finalDuration.toFixed(2)}s`);
  console.log('');
  console.log('SUCCESS CRITERIA:');
  console.log('  [ ] Does mom sound like a real person?');
  console.log('  [ ] Would you stop scrolling?');
  console.log('  [ ] Does it look premium?');
  console.log('  [ ] Does Santa complete his thought?');
  console.log('');

  // Clean up intermediate file
  if (fs.existsSync(audioMixed)) {
    fs.unlinkSync(audioMixed);
  }

  // Open the video
  execSync(`open "${outputVideo}"`);
}

createSocialVideoV4().catch(console.error);
