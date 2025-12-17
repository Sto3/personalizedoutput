/**
 * Social Video Production Script V3
 *
 * IMPROVEMENTS:
 * 1. Human-sounding mom voice (Sarah with Santa's fine-tuned settings)
 * 2. Animated festive background (warm bokeh gradient)
 * 3. Premium text styling with proper formatting
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================
// CONFIGURATION
// ============================================================

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Sarah - "Mature, Reassuring, Confident" - warm mom voice
const MOM_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

// EXACT same settings that made Santa sound human
const MOM_VOICE_SETTINGS = {
  stability: 0.68,
  similarity_boost: 0.82,
  style: 0.32,
  use_speaker_boost: true
};

// Paths
const OUTPUT_DIR = 'outputs/social-videos';
const SANTA_AUDIO = 'outputs/santa/santa-emma-deep-1764934040825.mp3';

// Mom's script lines with natural pauses marked
const MOM_LINES = {
  hook: "Okay... so I have to share this...",
  setup: "I got my daughter Emma... a personalized message from Santa... and I was NOT prepared. Let me play some of it for you...",
  reaction: "Okay I... I have to pause it there... this is just... too good.",
  cta: "We made this... at Personalized Output dot com. Your baby deserves one too. All our babies do."
};

// ============================================================
// AUDIO GENERATION - HUMAN VOICE
// ============================================================

async function generateMomAudioV3(text, filename) {
  const filepath = path.join(OUTPUT_DIR, filename);

  console.log(`[Mom Voice V3] Generating with Sarah + Santa settings: "${text.substring(0, 40)}..."`);

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
      model_id: 'eleven_monolingual_v1', // Same model as Santa
      voice_settings: MOM_VOICE_SETTINGS
    },
    responseType: 'arraybuffer'
  });

  const audioBuffer = Buffer.from(response.data);
  fs.writeFileSync(filepath, audioBuffer);

  console.log(`[Mom Voice V3] Saved: ${filepath} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
  return filepath;
}

// ============================================================
// AUDIO PROCESSING
// ============================================================

function getAudioDuration(filepath) {
  const result = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filepath}"`);
  return parseFloat(result.toString().trim());
}

function processAudio(inputPath, outputPath, endTime) {
  console.log(`[Santa Audio] Processing: trim to ${endTime}s + deepen voice...`);
  // Pitch down 5% for deeper Santa voice
  execSync(`ffmpeg -y -i "${inputPath}" -t ${endTime} -af "asetrate=44100*0.95,aresample=44100,volume=1.1" "${outputPath}"`);
  console.log(`[Santa Audio] Saved: ${outputPath}`);
  return outputPath;
}

// ============================================================
// VIDEO CREATION - PREMIUM VISUALS
// ============================================================

async function createSocialVideoV3() {
  console.log('='.repeat(70));
  console.log('SOCIAL VIDEO V3 - HUMAN VOICE + PREMIUM VISUALS');
  console.log('='.repeat(70));
  console.log('');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Step 1: Generate NEW mom audio with human-sounding voice
  console.log('[Step 1/5] Generating human-sounding mom voice (Sarah + Santa settings)...');
  console.log('');

  const momHook = await generateMomAudioV3(MOM_LINES.hook, 'mom_hook_v3.mp3');
  const momSetup = await generateMomAudioV3(MOM_LINES.setup, 'mom_setup_v3.mp3');
  const momReaction = await generateMomAudioV3(MOM_LINES.reaction, 'mom_reaction_v3.mp3');
  const momCta = await generateMomAudioV3(MOM_LINES.cta, 'mom_cta_v3.mp3');

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
  console.log('[Step 2/5] Processing Santa audio (deeper voice)...');
  const santaProcessed = path.join(OUTPUT_DIR, 'santa_v3.mp3');
  processAudio(SANTA_AUDIO, santaProcessed, 20);
  const santaDuration = getAudioDuration(santaProcessed);
  console.log(`  Santa clip: ${santaDuration.toFixed(2)}s`);
  console.log('');

  // Step 3: Calculate timeline
  console.log('[Step 3/5] Building timeline...');

  const timeline = {
    hook: { start: 0, duration: hookDuration },
    setup: { start: hookDuration + 0.3, duration: setupDuration },
    santa: { start: hookDuration + 0.3 + setupDuration + 0.5, duration: santaDuration },
    reaction: { start: 0, duration: reactionDuration },
    cta: { start: 0, duration: ctaDuration }
  };
  timeline.reaction.start = timeline.santa.start + santaDuration + 0.3;
  timeline.cta.start = timeline.reaction.start + reactionDuration + 0.3;

  const totalDuration = timeline.cta.start + ctaDuration + 3;

  console.log(`  0:00 - Hook`);
  console.log(`  ${timeline.setup.start.toFixed(2)}s - Setup`);
  console.log(`  ${timeline.santa.start.toFixed(2)}s - Santa plays`);
  console.log(`  ${timeline.reaction.start.toFixed(2)}s - Reaction`);
  console.log(`  ${timeline.cta.start.toFixed(2)}s - CTA`);
  console.log(`  Total: ${totalDuration.toFixed(2)}s`);
  console.log('');

  // Step 4: Create video with premium visuals
  console.log('[Step 4/5] Creating video with premium festive visuals...');

  const outputVideo = path.join(OUTPUT_DIR, 'santa_emma_mom_reaction_v3.mp4');
  const santaEnd = timeline.santa.start + santaDuration;

  // Build filter inline to avoid escaping issues
  const hookDelay = Math.round(timeline.hook.start * 1000);
  const setupDelay = Math.round(timeline.setup.start * 1000);
  const santaDelay = Math.round(timeline.santa.start * 1000);
  const reactionDelay = Math.round(timeline.reaction.start * 1000);
  const ctaDelay = Math.round(timeline.cta.start * 1000);
  const endCardTime = totalDuration - 2.5;

  // Use simpler filter without complex escaping
  const filterScript = [
    // Animated warm gradient background
    `[0:v]format=yuv420p,geq=r='128+40*sin(2*PI*T/8)+20*random(1)':g='40+20*sin(2*PI*T/6)+10*random(1)':b='60+30*sin(2*PI*T/10)+15*random(1)',boxblur=20:20,eq=brightness=0.1:contrast=1.2:saturation=1.3[bg]`,
    // Hook text
    `[bg]drawtext=text='I cannot stop crying':fontsize=80:fontcolor=white:shadowcolor=black:shadowx=4:shadowy=4:x=(w-text_w)/2:y=280:enable='lt(t,3.5)'[v1]`,
    // Santa label line 1
    `[v1]drawtext=text='Emmas Personalized':fontsize=56:fontcolor=white:shadowcolor=black:shadowx=3:shadowy=3:x=(w-text_w)/2:y=850:enable='between(t,${timeline.santa.start},${santaEnd})'[v2]`,
    // Santa label line 2
    `[v2]drawtext=text='Santa Message':fontsize=56:fontcolor=white:shadowcolor=black:shadowx=3:shadowy=3:x=(w-text_w)/2:y=930:enable='between(t,${timeline.santa.start},${santaEnd})'[v3]`,
    // CTA URL
    `[v3]drawtext=text='personalizedoutput.com':fontsize=72:fontcolor=white:shadowcolor=black:shadowx=4:shadowy=4:x=(w-text_w)/2:y=850:enable='gt(t,${timeline.cta.start})'[v4]`,
    // Social handle
    `[v4]drawtext=text='@PersonalizedOutput':fontsize=44:fontcolor=0xdddddd:shadowcolor=black:shadowx=2:shadowy=2:x=(w-text_w)/2:y=960:enable='gt(t,${endCardTime})'[vout]`,
    // Audio delays
    `[1:a]adelay=${hookDelay}|${hookDelay}[a1]`,
    `[2:a]adelay=${setupDelay}|${setupDelay}[a2]`,
    `[3:a]adelay=${santaDelay}|${santaDelay}[a3]`,
    `[4:a]adelay=${reactionDelay}|${reactionDelay}[a4]`,
    `[5:a]adelay=${ctaDelay}|${ctaDelay}[a5]`,
    `[a1][a2][a3][a4][a5]amix=inputs=5:duration=longest:normalize=0[audio]`
  ].join(';');

  // Write filter to file to avoid shell escaping issues
  const filterFile = path.join(OUTPUT_DIR, 'filter_v3.txt');
  fs.writeFileSync(filterFile, filterScript);
  console.log(`Filter saved to: ${filterFile}`);

  // Use spawnSync for proper argument handling
  const { spawnSync } = require('child_process');
  const result = spawnSync('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', `color=c=#200808:s=1080x1920:d=${totalDuration}`,
    '-i', momHook,
    '-i', momSetup,
    '-i', santaProcessed,
    '-i', momReaction,
    '-i', momCta,
    '-/filter_complex', filterFile,
    '-map', '[vout]', '-map', '[audio]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-c:a', 'aac', '-b:a', '192k',
    '-t', String(totalDuration),
    outputVideo
  ], { stdio: 'inherit' });

  if (result.status !== 0) {
    throw new Error(`FFmpeg failed with status ${result.status}`);
  }

  // Step 5: Verify
  console.log('');
  console.log('[Step 5/5] Verifying output...');

  const stats = fs.statSync(outputVideo);
  const finalDuration = getAudioDuration(outputVideo);

  console.log('');
  console.log('='.repeat(70));
  console.log('V3 COMPLETE');
  console.log('='.repeat(70));
  console.log(`File: ${outputVideo}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Duration: ${finalDuration.toFixed(2)}s`);
  console.log('');
  console.log('SUCCESS CRITERIA CHECK:');
  console.log('  [ ] Does mom sound like a real person? (Sarah + Santa settings)');
  console.log('  [ ] Would you stop scrolling?');
  console.log('  [ ] Does it look premium?');
  console.log('');

  execSync(`open "${outputVideo}"`);
}

createSocialVideoV3().catch(console.error);
