/**
 * Video Production Pipeline
 *
 * Creates promotional videos with Redi voiceover:
 * 1. Input: raw video file
 * 2. Claude Vision analyzes frames, identifies moments
 * 3. Claude API generates timestamped script
 * 4. ElevenLabs generates voice clips
 * 5. FFmpeg overlays audio at timestamps
 * 6. Output: final video with Redi voiceover
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { generateVoiceAudio } from './voiceService';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Claude model for video analysis
const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

interface VideoMoment {
  timestamp: number;      // Seconds into video
  description: string;    // What's happening
  narration?: string;     // What Redi should say
  importance: 'high' | 'medium' | 'low';
}

interface VideoScript {
  moments: VideoMoment[];
  totalDuration: number;
  summary: string;
}

interface VoiceClip {
  timestamp: number;
  duration: number;
  audioPath: string;
  text: string;
}

interface ProductionJob {
  id: string;
  status: 'pending' | 'analyzing' | 'scripting' | 'voicing' | 'compositing' | 'complete' | 'failed';
  inputPath: string;
  outputPath?: string;
  script?: VideoScript;
  voiceClips?: VoiceClip[];
  error?: string;
  progress: number;
  createdAt: Date;
  completedAt?: Date;
}

// In-memory job storage (use Redis/DB in production)
const jobs = new Map<string, ProductionJob>();

/**
 * Start a video production job
 */
export async function startVideoProduction(
  inputVideoPath: string,
  outputDir: string,
  options: {
    voiceGender?: 'male' | 'female';
    style?: 'energetic' | 'calm' | 'professional';
    maxNarrationPoints?: number;
  } = {}
): Promise<string> {
  const jobId = uuidv4();

  const job: ProductionJob = {
    id: jobId,
    status: 'pending',
    inputPath: inputVideoPath,
    progress: 0,
    createdAt: new Date()
  };

  jobs.set(jobId, job);

  // Start production pipeline in background
  processVideo(jobId, inputVideoPath, outputDir, options).catch(error => {
    const j = jobs.get(jobId);
    if (j) {
      j.status = 'failed';
      j.error = error.message;
    }
    console.error(`[VideoProduction] Job ${jobId} failed:`, error);
  });

  return jobId;
}

/**
 * Get job status
 */
export function getJobStatus(jobId: string): ProductionJob | undefined {
  return jobs.get(jobId);
}

/**
 * Main processing pipeline
 */
async function processVideo(
  jobId: string,
  inputPath: string,
  outputDir: string,
  options: {
    voiceGender?: 'male' | 'female';
    style?: 'energetic' | 'calm' | 'professional';
    maxNarrationPoints?: number;
  }
): Promise<void> {
  const job = jobs.get(jobId)!;

  try {
    // Step 1: Extract frames for analysis
    job.status = 'analyzing';
    job.progress = 10;
    console.log(`[VideoProduction] Job ${jobId}: Analyzing video...`);

    const frames = await extractKeyFrames(inputPath, outputDir);
    const duration = await getVideoDuration(inputPath);

    job.progress = 25;

    // Step 2: Analyze frames with Claude Vision
    const analysis = await analyzeFrames(frames, duration);
    job.progress = 40;

    // Step 3: Generate narration script
    job.status = 'scripting';
    console.log(`[VideoProduction] Job ${jobId}: Generating script...`);

    const script = await generateScript(analysis, duration, options);
    job.script = script;
    job.progress = 55;

    // Step 4: Generate voice clips
    job.status = 'voicing';
    console.log(`[VideoProduction] Job ${jobId}: Generating voice clips...`);

    const voiceClips = await generateVoiceClips(
      script,
      outputDir,
      options.voiceGender || 'female'
    );
    job.voiceClips = voiceClips;
    job.progress = 75;

    // Step 5: Composite final video
    job.status = 'compositing';
    console.log(`[VideoProduction] Job ${jobId}: Creating final video...`);

    const outputPath = await compositeVideo(inputPath, voiceClips, outputDir, jobId);
    job.outputPath = outputPath;
    job.progress = 100;

    // Complete
    job.status = 'complete';
    job.completedAt = new Date();
    console.log(`[VideoProduction] Job ${jobId}: Complete! Output: ${outputPath}`);

    // Cleanup temp files
    await cleanupTempFiles(frames, voiceClips);

  } catch (error) {
    job.status = 'failed';
    job.error = (error as Error).message;
    throw error;
  }
}

/**
 * Extract key frames from video using FFmpeg
 */
async function extractKeyFrames(inputPath: string, outputDir: string): Promise<string[]> {
  const framesDir = path.join(outputDir, 'frames_' + uuidv4());
  fs.mkdirSync(framesDir, { recursive: true });

  // Extract frame every 5 seconds
  await runFFmpeg([
    '-i', inputPath,
    '-vf', 'fps=1/5',  // 1 frame every 5 seconds
    '-vsync', 'vfr',
    path.join(framesDir, 'frame_%04d.jpg')
  ]);

  // Get list of extracted frames
  const frames = fs.readdirSync(framesDir)
    .filter(f => f.endsWith('.jpg'))
    .map(f => path.join(framesDir, f))
    .sort();

  return frames;
}

/**
 * Get video duration using FFprobe
 */
async function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputPath
    ]);

    let output = '';
    ffprobe.stdout.on('data', data => output += data.toString());
    ffprobe.on('close', code => {
      if (code === 0) {
        resolve(parseFloat(output.trim()));
      } else {
        reject(new Error('Failed to get video duration'));
      }
    });
  });
}

/**
 * Analyze frames using Claude Vision
 */
async function analyzeFrames(framePaths: string[], totalDuration: number): Promise<VideoMoment[]> {
  const moments: VideoMoment[] = [];
  const frameInterval = totalDuration / framePaths.length;

  // Analyze frames in batches
  const batchSize = 4;
  for (let i = 0; i < framePaths.length; i += batchSize) {
    const batch = framePaths.slice(i, i + batchSize);
    const batchTimestamps = batch.map((_, idx) => (i + idx) * frameInterval);

    // Read frames as base64
    const images = batch.map(framePath => {
      const data = fs.readFileSync(framePath);
      return {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/jpeg' as const,
          data: data.toString('base64')
        }
      };
    });

    try {
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            ...images,
            {
              type: 'text',
              text: `Analyze these ${batch.length} video frames (at timestamps ${batchTimestamps.map(t => t.toFixed(1) + 's').join(', ')}).

For each frame, identify:
1. What's happening in the scene
2. Any interesting moments worth narrating
3. The importance level (high/medium/low)

Return JSON array with format:
[
  {
    "frameIndex": 0,
    "timestamp": ${batchTimestamps[0]},
    "description": "description of what's happening",
    "importance": "high|medium|low",
    "shouldNarrate": true/false
  }
]`
            }
          ]
        }]
      });

      // Parse response
      const textContent = response.content.find(c => c.type === 'text');
      if (textContent && textContent.type === 'text') {
        try {
          const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const frameAnalysis = JSON.parse(jsonMatch[0]);
            for (const frame of frameAnalysis) {
              if (frame.shouldNarrate) {
                moments.push({
                  timestamp: frame.timestamp,
                  description: frame.description,
                  importance: frame.importance
                });
              }
            }
          }
        } catch (parseError) {
          console.warn('[VideoProduction] Failed to parse frame analysis:', parseError);
        }
      }
    } catch (error) {
      console.warn('[VideoProduction] Failed to analyze batch:', error);
    }
  }

  return moments;
}

/**
 * Generate narration script using Claude
 */
async function generateScript(
  moments: VideoMoment[],
  totalDuration: number,
  options: {
    style?: 'energetic' | 'calm' | 'professional';
    maxNarrationPoints?: number;
  }
): Promise<VideoScript> {
  const style = options.style || 'professional';
  const maxPoints = options.maxNarrationPoints || 10;

  // Filter to most important moments
  const sortedMoments = moments
    .sort((a, b) => {
      const importanceOrder = { high: 0, medium: 1, low: 2 };
      return importanceOrder[a.importance] - importanceOrder[b.importance];
    })
    .slice(0, maxPoints);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `You are Redi, an AI assistant creating narration for a promotional video.

Video duration: ${totalDuration.toFixed(1)} seconds

Key moments identified:
${sortedMoments.map(m => `- ${m.timestamp.toFixed(1)}s: ${m.description} (${m.importance})`).join('\n')}

Generate narration for each moment in a ${style} tone. Each narration should be:
- 2-8 seconds when spoken
- Engaging and informative
- Natural speaking style

Return JSON:
{
  "summary": "Brief summary of the video",
  "moments": [
    {
      "timestamp": 0.0,
      "description": "what's happening",
      "narration": "What Redi says",
      "importance": "high"
    }
  ]
}`
    }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Failed to generate script');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse script JSON');
  }

  const script = JSON.parse(jsonMatch[0]);
  return {
    moments: script.moments,
    totalDuration,
    summary: script.summary
  };
}

/**
 * Generate voice clips using ElevenLabs
 */
async function generateVoiceClips(
  script: VideoScript,
  outputDir: string,
  voiceGender: 'male' | 'female'
): Promise<VoiceClip[]> {
  const clips: VoiceClip[] = [];
  const voiceDir = path.join(outputDir, 'voice_' + uuidv4());
  fs.mkdirSync(voiceDir, { recursive: true });

  for (let i = 0; i < script.moments.length; i++) {
    const moment = script.moments[i];
    if (!moment.narration) continue;

    try {
      // Generate audio using ElevenLabs
      const audioBuffer = await generateVoiceAudio(moment.narration, voiceGender);

      if (audioBuffer) {
        const audioPath = path.join(voiceDir, `narration_${i.toString().padStart(3, '0')}.mp3`);
        fs.writeFileSync(audioPath, audioBuffer);

        // Get audio duration
        const duration = await getAudioDuration(audioPath);

        clips.push({
          timestamp: moment.timestamp,
          duration,
          audioPath,
          text: moment.narration
        });
      }
    } catch (error) {
      console.warn(`[VideoProduction] Failed to generate voice for moment ${i}:`, error);
    }
  }

  return clips;
}

/**
 * Get audio duration using FFprobe
 */
async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      audioPath
    ]);

    let output = '';
    ffprobe.stdout.on('data', data => output += data.toString());
    ffprobe.on('close', code => {
      if (code === 0) {
        resolve(parseFloat(output.trim()));
      } else {
        resolve(3);  // Default 3 seconds if probe fails
      }
    });
  });
}

/**
 * Composite final video with voice overlays
 */
async function compositeVideo(
  inputPath: string,
  voiceClips: VoiceClip[],
  outputDir: string,
  jobId: string
): Promise<string> {
  const outputPath = path.join(outputDir, `redi_video_${jobId}.mp4`);

  if (voiceClips.length === 0) {
    // No narration - just copy the video
    fs.copyFileSync(inputPath, outputPath);
    return outputPath;
  }

  // Build FFmpeg filter complex for audio mixing
  // This overlays each voice clip at its timestamp while keeping original audio

  let inputs = [`-i "${inputPath}"`];
  let filterInputs = ['[0:a]'];

  for (let i = 0; i < voiceClips.length; i++) {
    inputs.push(`-i "${voiceClips[i].audioPath}"`);
    filterInputs.push(`[${i + 1}:a]`);
  }

  // Create adelay filters for each voice clip
  let filters: string[] = [];
  for (let i = 0; i < voiceClips.length; i++) {
    const delayMs = Math.round(voiceClips[i].timestamp * 1000);
    filters.push(`[${i + 1}:a]adelay=${delayMs}|${delayMs}[a${i}]`);
  }

  // Mix all audio streams
  const mixInputs = ['[0:a]', ...voiceClips.map((_, i) => `[a${i}]`)];
  filters.push(`${mixInputs.join('')}amix=inputs=${voiceClips.length + 1}:duration=longest[aout]`);

  const filterComplex = filters.join(';');

  await runFFmpeg([
    ...inputs.flatMap(i => i.split(' ')),
    '-filter_complex', filterComplex,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-y',
    outputPath
  ]);

  return outputPath;
}

/**
 * Run FFmpeg command
 */
function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);

    let stderr = '';
    ffmpeg.stderr.on('data', data => stderr += data.toString());

    ffmpeg.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed: ${stderr}`));
      }
    });
  });
}

/**
 * Cleanup temporary files
 */
async function cleanupTempFiles(frames: string[], voiceClips: VoiceClip[]): Promise<void> {
  // Delete frames
  for (const frame of frames) {
    try {
      fs.unlinkSync(frame);
    } catch {}
  }

  // Delete parent directory of frames
  if (frames.length > 0) {
    try {
      fs.rmdirSync(path.dirname(frames[0]));
    } catch {}
  }

  // Delete voice clips
  for (const clip of voiceClips) {
    try {
      fs.unlinkSync(clip.audioPath);
    } catch {}
  }

  // Delete parent directory of voice clips
  if (voiceClips.length > 0) {
    try {
      fs.rmdirSync(path.dirname(voiceClips[0].audioPath));
    } catch {}
  }
}

/**
 * List all jobs
 */
export function listJobs(): ProductionJob[] {
  return Array.from(jobs.values());
}

/**
 * Cancel a job
 */
export function cancelJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (job && job.status !== 'complete' && job.status !== 'failed') {
    job.status = 'failed';
    job.error = 'Cancelled by user';
    return true;
  }
  return false;
}
