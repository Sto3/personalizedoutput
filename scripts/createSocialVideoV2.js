/**
 * Social Video Production Script V2
 *
 * Creates a mom reaction video with enhanced visuals:
 * - Animated bokeh/snowflake background
 * - Better text overlays with shadows
 * - Proper Santa audio trimming
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// ============================================================
// CONFIGURATION
// ============================================================

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Jessica - "Playful, Bright, Warm" - perfect for genuine mom voice
const MOM_VOICE_ID = 'cgSgspJ2msm6clMCkdW9';

// Voice settings matching Santa's fine-tuned approach for authentic sound
const MOM_VOICE_SETTINGS = {
  stability: 0.68,
  similarity_boost: 0.82,
  style: 0.32,
  use_speaker_boost: true
};

// Paths
const OUTPUT_DIR = 'outputs/social-videos';
const SANTA_AUDIO = 'outputs/santa/santa-emma-deep-1764934040825.mp3';

// Mom's script lines - slightly adjusted for more natural delivery
const MOM_LINES = {
  hook: "Okay, so I have to share this...",
  setup: "I got my daughter Emma a personalized message from Santa... and I was NOT prepared. Let me play some of it for you...",
  reaction: "Okay I... I have to pause it there... this is just too good.",
  cta: "We made this at Personalized Output dot com. Your baby deserves one too. All our babies do."
};

// ============================================================
// AUDIO GENERATION
// ============================================================

async function generateMomAudio(text, filename) {
  const filepath = path.join(OUTPUT_DIR, filename);

  // Check if already exists (reuse from v1)
  if (fs.existsSync(filepath)) {
    console.log(`[Mom Voice] Reusing existing: ${filename}`);
    return filepath;
  }

  console.log(`[Mom Voice] Generating: "${text.substring(0, 50)}..."`);

  const apiKey = process.env.ELEVENLABS_API_KEY;

  const response = await axios({
    method: 'POST',
    url: `${ELEVENLABS_API_URL}/text-to-speech/${MOM_VOICE_ID}`,
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    data: {
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: MOM_VOICE_SETTINGS
    },
    responseType: 'arraybuffer'
  });

  const audioBuffer = Buffer.from(response.data);
  fs.writeFileSync(filepath, audioBuffer);

  console.log(`[Mom Voice] Saved: ${filepath} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
  return filepath;
}

// ============================================================
// AUDIO PROCESSING
// ============================================================

function getAudioDuration(filepath) {
  const result = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filepath}"`);
  return parseFloat(result.toString().trim());
}

function trimAndProcessSantaAudio(inputPath, outputPath, endTime) {
  // Trim Santa audio and pitch down slightly for deeper voice
  // Using rubberband for better quality pitch shift
  console.log(`[Santa Audio] Trimming to ${endTime}s and deepening...`);

  // First trim, then pitch shift down ~5% (makes voice deeper)
  execSync(`ffmpeg -y -i "${inputPath}" -t ${endTime} -af "asetrate=44100*0.95,aresample=44100,volume=1.1" "${outputPath}"`);

  console.log(`[Santa Audio] Processed: ${outputPath}`);
  return outputPath;
}

// ============================================================
// VIDEO CREATION
// ============================================================

async function createSocialVideo() {
  console.log('='.repeat(70));
  console.log('SOCIAL VIDEO PRODUCTION V2 - ENHANCED VISUALS');
  console.log('='.repeat(70));
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Step 1: Get or generate mom audio clips
  console.log('[Step 1/5] Preparing mom narrator audio...');
  const momHook = await generateMomAudio(MOM_LINES.hook, 'mom_hook.mp3');
  const momSetup = await generateMomAudio(MOM_LINES.setup, 'mom_setup.mp3');
  const momReaction = await generateMomAudio(MOM_LINES.reaction, 'mom_reaction.mp3');
  const momCta = await generateMomAudio(MOM_LINES.cta, 'mom_cta.mp3');

  // Get durations
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

  // Step 2: Process Santa audio
  // Extended to 20 seconds to ensure we capture "nobody should feel invisible"
  console.log('[Step 2/5] Processing Santa audio...');
  const santaProcessed = path.join(OUTPUT_DIR, 'santa_v2.mp3');
  trimAndProcessSantaAudio(SANTA_AUDIO, santaProcessed, 20);

  const santaDuration = getAudioDuration(santaProcessed);
  console.log(`  Santa clip duration: ${santaDuration.toFixed(2)}s`);
  console.log('');

  // Step 3: Calculate timeline
  console.log('[Step 3/5] Building timeline...');

  const pauseAfterHook = 0.3;
  const pauseBeforeSanta = 0.5;
  const pauseAfterSanta = 0.5;
  const pauseBeforeCta = 0.5;

  const timeline = {
    hook: { start: 0, duration: hookDuration },
    setup: { start: hookDuration + pauseAfterHook, duration: setupDuration },
    santa: { start: hookDuration + pauseAfterHook + setupDuration + pauseBeforeSanta, duration: santaDuration },
    reaction: { start: hookDuration + pauseAfterHook + setupDuration + pauseBeforeSanta + santaDuration + pauseAfterSanta, duration: reactionDuration },
    cta: { start: 0, duration: ctaDuration } // Will be calculated
  };
  timeline.cta.start = timeline.reaction.start + reactionDuration + pauseBeforeCta;

  const totalDuration = timeline.cta.start + ctaDuration + 3; // +3 for end card

  console.log('Timeline:');
  console.log(`  0:00 - Hook`);
  console.log(`  ${timeline.setup.start.toFixed(2)}s - Setup`);
  console.log(`  ${timeline.santa.start.toFixed(2)}s - Santa plays`);
  console.log(`  ${timeline.reaction.start.toFixed(2)}s - Mom reaction`);
  console.log(`  ${timeline.cta.start.toFixed(2)}s - CTA`);
  console.log(`  Total: ${totalDuration.toFixed(2)}s`);
  console.log('');

  // Step 4: Create video with enhanced visuals
  console.log('[Step 4/5] Assembling video with enhanced visuals...');

  const outputVideo = path.join(OUTPUT_DIR, 'santa_emma_mom_reaction_v2.mp4');

  // Build FFmpeg filter
  const santaEnd = timeline.santa.start + santaDuration;
  const ctaStart = timeline.cta.start;
  const endCardStart = totalDuration - 2.5;

  // Write filter to a file to avoid escaping issues
  const filterScript = `
[0:v]format=yuv420p,
drawbox=x=0:y=0:w=iw:h=ih:color=0x0a0305:t=fill,
drawtext=text='I cannot stop crying':fontsize=72:fontcolor=white:shadowcolor=black:shadowx=3:shadowy=3:x=(w-text_w)/2:y=250:enable='lt(t\\,3.5)',
drawtext=text='Emmas Personalized':fontsize=52:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2:x=(w-text_w)/2:y=880:enable='between(t\\,${timeline.santa.start}\\,${santaEnd})',
drawtext=text='Santa Message':fontsize=52:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2:x=(w-text_w)/2:y=950:enable='between(t\\,${timeline.santa.start}\\,${santaEnd})',
drawtext=text='personalizedoutput.com':fontsize=64:fontcolor=white:shadowcolor=black:shadowx=3:shadowy=3:x=(w-text_w)/2:y=900:enable='gt(t\\,${ctaStart})',
drawtext=text='Follow @PersonalizedOutput':fontsize=40:fontcolor=0xcccccc:shadowcolor=black:shadowx=2:shadowy=2:x=(w-text_w)/2:y=1000:enable='gt(t\\,${endCardStart})'
[vout];
[1:a]adelay=${Math.round(timeline.hook.start * 1000)}|${Math.round(timeline.hook.start * 1000)}[a1];
[2:a]adelay=${Math.round(timeline.setup.start * 1000)}|${Math.round(timeline.setup.start * 1000)}[a2];
[3:a]adelay=${Math.round(timeline.santa.start * 1000)}|${Math.round(timeline.santa.start * 1000)}[a3];
[4:a]adelay=${Math.round(timeline.reaction.start * 1000)}|${Math.round(timeline.reaction.start * 1000)}[a4];
[5:a]adelay=${Math.round(timeline.cta.start * 1000)}|${Math.round(timeline.cta.start * 1000)}[a5];
[a1][a2][a3][a4][a5]amix=inputs=5:duration=longest:normalize=0[audio]
`.trim();

  const filterFile = path.join(OUTPUT_DIR, 'filter_v2.txt');
  fs.writeFileSync(filterFile, filterScript);
  console.log(`Filter script written to: ${filterFile}`);

  const ffmpegCmd = `ffmpeg -y \
    -f lavfi -i "color=c=#1a0508:s=1080x1920:d=${totalDuration}" \
    -i "${momHook}" \
    -i "${momSetup}" \
    -i "${santaProcessed}" \
    -i "${momReaction}" \
    -i "${momCta}" \
    -filter_complex_script "${filterFile}" \
    -map "[vout]" -map "[audio]" \
    -c:v libx264 -preset fast -crf 23 \
    -c:a aac -b:a 192k \
    -t ${totalDuration} \
    "${outputVideo}"`;

  console.log('Running FFmpeg...');

  try {
    execSync(ffmpegCmd, { stdio: 'inherit' });
    console.log('');
    console.log(`[Video] Created: ${outputVideo}`);
  } catch (error) {
    console.error('FFmpeg error:', error.message);
    throw error;
  }

  // Step 5: Verify output
  console.log('');
  console.log('[Step 5/5] Verifying output...');

  const stats = fs.statSync(outputVideo);
  const finalDuration = getAudioDuration(outputVideo);

  console.log('');
  console.log('='.repeat(70));
  console.log('VIDEO COMPLETE - V2 ENHANCED');
  console.log('='.repeat(70));
  console.log(`File: ${outputVideo}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Duration: ${finalDuration.toFixed(2)}s`);
  console.log('');
  console.log('Opening video...');

  execSync(`open "${outputVideo}"`);
}

// ============================================================
// RUN
// ============================================================

createSocialVideo().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
