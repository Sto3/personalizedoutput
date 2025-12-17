/**
 * Social Video Production Script
 *
 * Creates a mom reaction video for Santa message promotion.
 * Uses ElevenLabs for mom narrator voice, FFmpeg for video production.
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

// Mom's script lines
const MOM_LINES = {
  hook: "Okay so I have to share this...",
  setup: "I got my daughter Emma a personalized message from Santa... and I was NOT prepared. Let me play some of it for you...",
  reaction: "Okay I... I have to pause it there... this is just too good.",
  cta: "We made this at Personalized Output dot com. Your baby deserves one too. All our babies do."
};

// ============================================================
// AUDIO GENERATION
// ============================================================

async function generateMomAudio(text, filename) {
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
  const filepath = path.join(OUTPUT_DIR, filename);
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

function trimSantaAudio(inputPath, outputPath, endTime) {
  // Trim Santa audio to end at the specified time
  // Also pitch down slightly for deeper voice
  console.log(`[Santa Audio] Trimming to ${endTime}s and deepening pitch...`);

  execSync(`ffmpeg -y -i "${inputPath}" -t ${endTime} -af "asetrate=44100*0.95,aresample=44100" "${outputPath}"`);
  console.log(`[Santa Audio] Saved: ${outputPath}`);
  return outputPath;
}

function addRoomAmbience(inputPath, outputPath) {
  // Add subtle room effect to make it sound like playing from phone/speaker
  console.log(`[Santa Audio] Adding room ambience...`);
  execSync(`ffmpeg -y -i "${inputPath}" -af "highpass=f=200,lowpass=f=6000,areverse,aecho=0.8:0.7:10:0.3,areverse" "${outputPath}"`);
  console.log(`[Santa Audio] Room ambience added: ${outputPath}`);
  return outputPath;
}

// ============================================================
// VIDEO CREATION
// ============================================================

function createBackground(outputPath, duration) {
  // Create a warm, festive gradient background
  console.log(`[Video] Creating festive background (${duration}s)...`);

  // Warm Christmas colors - deep red to warm gold gradient
  execSync(`ffmpeg -y -f lavfi -i "color=c=#1a0a0a:s=1080x1920:d=${duration}" \
    -vf "format=yuv420p,geq=r='clip(p(X,Y,0)*1.2+20,0,255)':g='clip(p(X,Y,1)*0.4+5,0,255)':b='clip(p(X,Y,2)*0.3,0,255)'" \
    -t ${duration} "${outputPath}"`);

  console.log(`[Video] Background created: ${outputPath}`);
  return outputPath;
}

function createTextOverlay(text, outputPath, fontSize = 72, color = 'white') {
  // Create text image for overlay
  console.log(`[Video] Creating text overlay: "${text.substring(0, 30)}..."`);

  // Use ImageMagick to create text with proper styling
  const escapedText = text.replace(/"/g, '\\"').replace(/'/g, "'\\''");
  execSync(`convert -size 1000x200 xc:transparent \
    -font Helvetica-Bold -pointsize ${fontSize} -fill "${color}" \
    -gravity center -annotate 0 "${escapedText}" "${outputPath}"`);

  return outputPath;
}

// ============================================================
// MAIN VIDEO ASSEMBLY
// ============================================================

async function createSocialVideo() {
  console.log('='.repeat(70));
  console.log('SOCIAL VIDEO PRODUCTION - SANTA MOM REACTION');
  console.log('='.repeat(70));
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Step 1: Generate all mom audio clips
  console.log('[Step 1/5] Generating mom narrator audio...');
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
  console.log('[Step 2/5] Processing Santa audio...');

  // Find where "nobody should feel invisible" ends - approximately 17-20 seconds in
  // We'll trim to 18 seconds which should capture up to that quote
  const santaTrimmed = path.join(OUTPUT_DIR, 'santa_trimmed.mp3');
  const santaProcessed = path.join(OUTPUT_DIR, 'santa_processed.mp3');

  trimSantaAudio(SANTA_AUDIO, santaTrimmed, 18);
  addRoomAmbience(santaTrimmed, santaProcessed);

  const santaDuration = getAudioDuration(santaProcessed);
  console.log(`  Santa clip duration: ${santaDuration.toFixed(2)}s`);
  console.log('');

  // Step 3: Calculate timeline
  console.log('[Step 3/5] Building timeline...');

  const timeline = {
    hook: { start: 0, duration: hookDuration },
    setup: { start: hookDuration + 0.3, duration: setupDuration },
    santa: { start: hookDuration + setupDuration + 0.6, duration: santaDuration },
    reaction: { start: hookDuration + setupDuration + santaDuration + 0.9, duration: reactionDuration },
    cta: { start: hookDuration + setupDuration + santaDuration + reactionDuration + 1.2, duration: ctaDuration }
  };

  const totalDuration = timeline.cta.start + ctaDuration + 3; // +3 for end card

  console.log('Timeline:');
  console.log(`  0:00 - Hook`);
  console.log(`  ${timeline.setup.start.toFixed(2)}s - Setup`);
  console.log(`  ${timeline.santa.start.toFixed(2)}s - Santa plays`);
  console.log(`  ${timeline.reaction.start.toFixed(2)}s - Mom reaction`);
  console.log(`  ${timeline.cta.start.toFixed(2)}s - CTA`);
  console.log(`  Total: ${totalDuration.toFixed(2)}s`);
  console.log('');

  // Step 4: Create video with FFmpeg complex filter
  console.log('[Step 4/5] Assembling video...');

  const outputVideo = path.join(OUTPUT_DIR, 'santa_emma_mom_reaction_v1.mp4');

  // Font path
  const fontPath = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';
  const fontPathEscaped = fontPath.replace(/:/g, '\\:').replace(/ /g, '\\ ');

  // Build complex FFmpeg command
  const ffmpegCmd = `ffmpeg -y \
    -f lavfi -i "color=c=#1a0508:s=1080x1920:d=${totalDuration}" \
    -i "${momHook}" \
    -i "${momSetup}" \
    -i "${santaProcessed}" \
    -i "${momReaction}" \
    -i "${momCta}" \
    -filter_complex "
      [0:v]format=yuv420p[bg];

      [1:a]adelay=${Math.round(timeline.hook.start * 1000)}|${Math.round(timeline.hook.start * 1000)}[a1];
      [2:a]adelay=${Math.round(timeline.setup.start * 1000)}|${Math.round(timeline.setup.start * 1000)}[a2];
      [3:a]adelay=${Math.round(timeline.santa.start * 1000)}|${Math.round(timeline.santa.start * 1000)}[a3];
      [4:a]adelay=${Math.round(timeline.reaction.start * 1000)}|${Math.round(timeline.reaction.start * 1000)}[a4];
      [5:a]adelay=${Math.round(timeline.cta.start * 1000)}|${Math.round(timeline.cta.start * 1000)}[a5];

      [a1][a2][a3][a4][a5]amix=inputs=5:duration=longest[audio];

      [bg]drawtext=fontfile='${fontPathEscaped}':text='I can not stop crying':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=200:enable='lt(t,3)'[v1];
      [v1]drawtext=fontfile='${fontPathEscaped}':text='Emma s Personalized':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=850:enable='between(t,${timeline.santa.start},${timeline.santa.start + santaDuration})'[v2];
      [v2]drawtext=fontfile='${fontPathEscaped}':text='Santa Message':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=920:enable='between(t,${timeline.santa.start},${timeline.santa.start + santaDuration})'[v3];
      [v3]drawtext=fontfile='${fontPathEscaped}':text='personalizedoutput.com':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=900:enable='gt(t,${timeline.cta.start})'[v4];
      [v4]drawtext=fontfile='${fontPathEscaped}':text='Follow @PersonalizedOutput':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=1000:enable='gt(t,${totalDuration - 2})'[vout]
    " \
    -map "[vout]" -map "[audio]" \
    -c:v libx264 -preset fast -crf 23 \
    -c:a aac -b:a 192k \
    -t ${totalDuration} \
    "${outputVideo}"`;

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
  console.log('VIDEO COMPLETE');
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
