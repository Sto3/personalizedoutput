/**
 * Homework Rescue - Lesson Visual Generator
 *
 * Creates visual frames for the tutoring lesson video using Canvas.
 * Includes templates for:
 * - Title screens
 * - Explanation frames with text/equations
 * - Practice "pause" screens
 * - Step-by-step reveals
 * - Answer reveal screens
 * - Closing screens
 */

import { createCanvas, Canvas, CanvasRenderingContext2D, registerFont } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import {
  LessonScript,
  VideoScene,
  LessonVisuals,
  GradeLevel,
  Subject,
  PracticeItem
} from './types';

// Video dimensions (1080p portrait for mobile-first)
const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;

// Color schemes
const COLOR_SCHEMES = {
  math: {
    primary: '#4F46E5',      // Indigo
    secondary: '#818CF8',    // Light indigo
    accent: '#F59E0B',       // Amber
    background: '#1E1B4B',   // Dark indigo
    text: '#FFFFFF',
    subtextColor: '#C7D2FE',
    pauseColor: '#10B981',   // Emerald
    highlightBg: '#312E81'
  },
  reading: {
    primary: '#7C3AED',      // Violet
    secondary: '#A78BFA',    // Light violet
    accent: '#F472B6',       // Pink
    background: '#1E1B4B',   // Dark purple
    text: '#FFFFFF',
    subtextColor: '#DDD6FE',
    pauseColor: '#14B8A6',   // Teal
    highlightBg: '#3B0764'
  }
};

// Font sizes by grade level
const FONT_SIZES: Record<GradeLevel, { title: number; body: number; equation: number }> = {
  'K': { title: 72, body: 48, equation: 64 },
  '1': { title: 68, body: 44, equation: 60 },
  '2': { title: 64, body: 42, equation: 56 },
  '3': { title: 60, body: 40, equation: 52 },
  '4': { title: 56, body: 38, equation: 48 },
  '5': { title: 52, body: 36, equation: 44 },
  '6': { title: 48, body: 34, equation: 40 }
};

/**
 * Generate all visual scenes for a lesson
 */
export async function generateLessonVisuals(
  script: LessonScript,
  outputDir: string
): Promise<LessonVisuals> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const colors = COLOR_SCHEMES[script.subject.toLowerCase() as 'math' | 'reading'] || COLOR_SCHEMES.math;
  const fonts = FONT_SIZES[script.grade];

  const scenes: VideoScene[] = [];
  let currentTime = 0;

  // 1. Title Scene (~5 seconds)
  const titleScene = await createTitleScene(script, colors, fonts, outputDir);
  titleScene.startTime = currentTime;
  scenes.push(titleScene);
  currentTime += titleScene.duration;

  // 2. Introduction text scenes (~60 seconds)
  const introScenes = await createTextScenes(
    script.introduction,
    'explanation',
    colors,
    fonts,
    outputDir,
    currentTime,
    script.childName
  );
  scenes.push(...introScenes);
  currentTime = introScenes[introScenes.length - 1].startTime + introScenes[introScenes.length - 1].duration;

  // 3. Core explanation scenes (~180 seconds)
  const explanationScenes = await createTextScenes(
    script.conceptExplanation,
    'explanation',
    colors,
    fonts,
    outputDir,
    currentTime,
    script.childName
  );
  scenes.push(...explanationScenes);
  currentTime = explanationScenes[explanationScenes.length - 1].startTime + explanationScenes[explanationScenes.length - 1].duration;

  // 4. First Practice (~120 seconds)
  const firstPracticeScenes = await createPracticeScenes(
    script.firstPractice,
    colors,
    fonts,
    outputDir,
    currentTime,
    script.childName,
    1
  );
  scenes.push(...firstPracticeScenes);
  currentTime = firstPracticeScenes[firstPracticeScenes.length - 1].startTime + firstPracticeScenes[firstPracticeScenes.length - 1].duration;

  // 5. Deeper explanation scenes (~120 seconds)
  const deeperScenes = await createTextScenes(
    script.deeperExplanation,
    'explanation',
    colors,
    fonts,
    outputDir,
    currentTime,
    script.childName
  );
  scenes.push(...deeperScenes);
  currentTime = deeperScenes[deeperScenes.length - 1].startTime + deeperScenes[deeperScenes.length - 1].duration;

  // 6. Second Practice (~90 seconds)
  const secondPracticeScenes = await createPracticeScenes(
    script.secondPractice,
    colors,
    fonts,
    outputDir,
    currentTime,
    script.childName,
    2
  );
  scenes.push(...secondPracticeScenes);
  currentTime = secondPracticeScenes[secondPracticeScenes.length - 1].startTime + secondPracticeScenes[secondPracticeScenes.length - 1].duration;

  // 7. Mini Challenge (~30 seconds)
  const challengeScenes = await createChallengeScenes(
    script.miniChallenge,
    colors,
    fonts,
    outputDir,
    currentTime,
    script.childName
  );
  scenes.push(...challengeScenes);
  currentTime = challengeScenes[challengeScenes.length - 1].startTime + challengeScenes[challengeScenes.length - 1].duration;

  // 8. Closing Scene (~30 seconds)
  const closingScene = await createClosingScene(script, colors, fonts, outputDir);
  closingScene.startTime = currentTime;
  scenes.push(closingScene);
  currentTime += closingScene.duration;

  return {
    scenes,
    totalDuration: currentTime
  };
}

/**
 * Create the title/intro scene
 */
async function createTitleScene(
  script: LessonScript,
  colors: typeof COLOR_SCHEMES.math,
  fonts: typeof FONT_SIZES['K'],
  outputDir: string
): Promise<VideoScene> {
  const canvas = createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, VIDEO_HEIGHT);
  gradient.addColorStop(0, colors.background);
  gradient.addColorStop(1, darkenColor(colors.background, 0.3));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  // Decorative circles
  ctx.fillStyle = colors.primary + '20';
  ctx.beginPath();
  ctx.arc(VIDEO_WIDTH * 0.2, VIDEO_HEIGHT * 0.15, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(VIDEO_WIDTH * 0.8, VIDEO_HEIGHT * 0.85, 200, 0, Math.PI * 2);
  ctx.fill();

  // "Hey [Name]!"
  ctx.fillStyle = colors.accent;
  ctx.font = `bold ${fonts.title}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(`Hey ${script.childName}!`, VIDEO_WIDTH / 2, VIDEO_HEIGHT * 0.35);

  // Topic
  ctx.fillStyle = colors.text;
  ctx.font = `bold ${fonts.title + 10}px Arial`;
  const topicLines = wrapText(ctx, `Let's Learn ${script.topic}!`, VIDEO_WIDTH - 100);
  let y = VIDEO_HEIGHT * 0.48;
  for (const line of topicLines) {
    ctx.fillText(line, VIDEO_WIDTH / 2, y);
    y += fonts.title + 20;
  }

  // Subject badge
  ctx.fillStyle = colors.secondary;
  roundRect(ctx, VIDEO_WIDTH / 2 - 80, VIDEO_HEIGHT * 0.62, 160, 50, 25);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.font = `bold 28px Arial`;
  ctx.fillText(script.subject, VIDEO_WIDTH / 2, VIDEO_HEIGHT * 0.62 + 35);

  // Grade indicator
  ctx.fillStyle = colors.subtextColor;
  ctx.font = `24px Arial`;
  ctx.fillText(`Grade ${script.grade}`, VIDEO_WIDTH / 2, VIDEO_HEIGHT * 0.72);

  // Save frame
  const filename = `scene_title.png`;
  const filepath = path.join(outputDir, filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filepath, buffer);

  return {
    id: 'title',
    type: 'title',
    duration: 5,
    startTime: 0,
    mainText: `Hey ${script.childName}!`,
    subText: `Let's Learn ${script.topic}!`,
    animation: 'fade_in'
  };
}

/**
 * Create text/explanation scenes from script content
 */
async function createTextScenes(
  content: string,
  sceneType: VideoScene['type'],
  colors: typeof COLOR_SCHEMES.math,
  fonts: typeof FONT_SIZES['K'],
  outputDir: string,
  startTime: number,
  childName: string
): Promise<VideoScene[]> {
  const scenes: VideoScene[] = [];

  // Split content into chunks (by ... pause markers or sentences)
  const chunks = splitContentIntoChunks(content);
  let currentTime = startTime;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    if (!chunk) continue;

    const canvas = createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, VIDEO_HEIGHT);
    gradient.addColorStop(0, colors.background);
    gradient.addColorStop(0.5, darkenColor(colors.background, 0.15));
    gradient.addColorStop(1, colors.background);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    // Top accent bar
    ctx.fillStyle = colors.primary;
    ctx.fillRect(0, 0, VIDEO_WIDTH, 8);

    // Main text content
    ctx.fillStyle = colors.text;
    ctx.font = `${fonts.body}px Arial`;
    ctx.textAlign = 'center';

    const lines = wrapText(ctx, chunk, VIDEO_WIDTH - 120);
    const lineHeight = fonts.body + 16;
    const totalHeight = lines.length * lineHeight;
    let y = (VIDEO_HEIGHT - totalHeight) / 2;

    // Highlight child's name if present
    for (const line of lines) {
      if (line.includes(childName)) {
        // Draw with highlighted name
        const parts = line.split(childName);
        ctx.fillStyle = colors.text;
        const beforeWidth = ctx.measureText(parts[0]).width;
        const nameWidth = ctx.measureText(childName).width;

        const lineWidth = ctx.measureText(line).width;
        let x = (VIDEO_WIDTH - lineWidth) / 2;

        ctx.fillText(parts[0], VIDEO_WIDTH / 2 - (lineWidth / 2 - beforeWidth / 2), y);

        ctx.fillStyle = colors.accent;
        ctx.fillText(childName, VIDEO_WIDTH / 2 - (lineWidth / 2 - beforeWidth - nameWidth / 2), y);

        if (parts[1]) {
          ctx.fillStyle = colors.text;
          ctx.fillText(parts[1], VIDEO_WIDTH / 2 + (beforeWidth + nameWidth - lineWidth / 2 + ctx.measureText(parts[1]).width / 2), y);
        }
      } else {
        ctx.fillStyle = colors.text;
        ctx.fillText(line, VIDEO_WIDTH / 2, y);
      }
      y += lineHeight;
    }

    // Save frame
    const filename = `scene_text_${startTime}_${i}.png`;
    const filepath = path.join(outputDir, filename);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);

    // Calculate duration based on word count (~150 wpm)
    const wordCount = chunk.split(/\s+/).length;
    const duration = Math.max(3, Math.ceil(wordCount / 2.5));

    scenes.push({
      id: `text_${startTime}_${i}`,
      type: sceneType,
      duration,
      startTime: currentTime,
      mainText: chunk,
      animation: 'fade_in'
    });

    currentTime += duration;
  }

  return scenes;
}

/**
 * Create practice/pause scenes
 */
async function createPracticeScenes(
  practice: LessonScript['firstPractice'],
  colors: typeof COLOR_SCHEMES.math,
  fonts: typeof FONT_SIZES['K'],
  outputDir: string,
  startTime: number,
  childName: string,
  practiceNumber: number
): Promise<VideoScene[]> {
  const scenes: VideoScene[] = [];
  let currentTime = startTime;

  // Setup scene
  const setupScenes = await createTextScenes(
    practice.setup,
    'explanation',
    colors,
    fonts,
    outputDir,
    currentTime,
    childName
  );
  scenes.push(...setupScenes);
  if (setupScenes.length > 0) {
    currentTime = setupScenes[setupScenes.length - 1].startTime + setupScenes[setupScenes.length - 1].duration;
  }

  // PAUSE screen with practice items
  const pauseCanvas = createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
  const pauseCtx = pauseCanvas.getContext('2d');

  // Bright pause background
  pauseCtx.fillStyle = colors.pauseColor;
  pauseCtx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  // PAUSE header
  pauseCtx.fillStyle = '#FFFFFF';
  pauseCtx.font = `bold 72px Arial`;
  pauseCtx.textAlign = 'center';
  pauseCtx.fillText('PAUSE HERE', VIDEO_WIDTH / 2, 150);

  pauseCtx.font = `36px Arial`;
  pauseCtx.fillText(`Practice Time, ${childName}!`, VIDEO_WIDTH / 2, 220);

  // Practice items
  pauseCtx.fillStyle = '#FFFFFF';
  pauseCtx.font = `${fonts.equation}px Arial`;
  let y = 400;

  for (let i = 0; i < practice.practiceItems.length; i++) {
    const item = practice.practiceItems[i];

    // Item number badge
    pauseCtx.fillStyle = darkenColor(colors.pauseColor, 0.2);
    roundRect(pauseCtx, 80, y - 40, 60, 60, 30);
    pauseCtx.fill();
    pauseCtx.fillStyle = '#FFFFFF';
    pauseCtx.font = `bold 32px Arial`;
    pauseCtx.textAlign = 'center';
    pauseCtx.fillText(`${i + 1}`, 110, y);

    // Problem text
    pauseCtx.fillStyle = '#FFFFFF';
    pauseCtx.font = `${fonts.equation}px Arial`;
    pauseCtx.textAlign = 'left';

    const problemLines = wrapText(pauseCtx, item.problem, VIDEO_WIDTH - 200);
    for (const line of problemLines) {
      pauseCtx.fillText(line, 160, y);
      y += fonts.equation + 10;
    }
    y += 60;
  }

  // Footer instruction
  pauseCtx.fillStyle = '#FFFFFF';
  pauseCtx.font = `28px Arial`;
  pauseCtx.textAlign = 'center';
  pauseCtx.fillText('Press play when you\'re ready!', VIDEO_WIDTH / 2, VIDEO_HEIGHT - 100);

  // Save pause frame
  const pauseFilename = `scene_pause_${practiceNumber}.png`;
  const pauseFilepath = path.join(outputDir, pauseFilename);
  const pauseBuffer = pauseCanvas.toBuffer('image/png');
  fs.writeFileSync(pauseFilepath, pauseBuffer);

  scenes.push({
    id: `pause_${practiceNumber}`,
    type: 'pause',
    duration: 30, // Extended pause for practice
    startTime: currentTime,
    mainText: 'PAUSE HERE',
    practiceItems: practice.practiceItems.map(p => p.problem),
    animation: 'fade_in'
  });
  currentTime += 30;

  // Resume and answer reveal scenes
  const resumeScenes = await createTextScenes(
    practice.resumeScript + '\n\n' + practice.answerReveal,
    'reveal',
    colors,
    fonts,
    outputDir,
    currentTime,
    childName
  );
  scenes.push(...resumeScenes);
  if (resumeScenes.length > 0) {
    currentTime = resumeScenes[resumeScenes.length - 1].startTime + resumeScenes[resumeScenes.length - 1].duration;
  }

  // Answer reveal screen
  const revealCanvas = createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
  const revealCtx = revealCanvas.getContext('2d');

  revealCtx.fillStyle = colors.background;
  revealCtx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  revealCtx.fillStyle = colors.accent;
  revealCtx.font = `bold 56px Arial`;
  revealCtx.textAlign = 'center';
  revealCtx.fillText('Answers', VIDEO_WIDTH / 2, 150);

  y = 300;
  for (let i = 0; i < practice.practiceItems.length; i++) {
    const item = practice.practiceItems[i];

    revealCtx.fillStyle = colors.text;
    revealCtx.font = `${fonts.body}px Arial`;
    revealCtx.textAlign = 'left';
    revealCtx.fillText(`${i + 1}. ${item.problem}`, 80, y);

    revealCtx.fillStyle = colors.pauseColor;
    revealCtx.font = `bold ${fonts.body}px Arial`;
    revealCtx.fillText(`= ${item.answer}`, 120, y + fonts.body + 10);

    y += 150;
  }

  const revealFilename = `scene_reveal_${practiceNumber}.png`;
  const revealFilepath = path.join(outputDir, revealFilename);
  const revealBuffer = revealCanvas.toBuffer('image/png');
  fs.writeFileSync(revealFilepath, revealBuffer);

  scenes.push({
    id: `reveal_${practiceNumber}`,
    type: 'reveal',
    duration: 10,
    startTime: currentTime,
    mainText: 'Answers',
    practiceItems: practice.practiceItems.map(p => `${p.problem} = ${p.answer}`),
    animation: 'reveal_step'
  });
  currentTime += 10;

  return scenes;
}

/**
 * Create mini challenge scenes
 */
async function createChallengeScenes(
  challenge: LessonScript['miniChallenge'],
  colors: typeof COLOR_SCHEMES.math,
  fonts: typeof FONT_SIZES['K'],
  outputDir: string,
  startTime: number,
  childName: string
): Promise<VideoScene[]> {
  const scenes: VideoScene[] = [];
  let currentTime = startTime;

  // Challenge intro
  const challengeCanvas = createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
  const ctx = challengeCanvas.getContext('2d');

  // Exciting gradient background
  const gradient = ctx.createLinearGradient(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  gradient.addColorStop(0, colors.primary);
  gradient.addColorStop(1, colors.accent);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 64px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('CHALLENGE TIME!', VIDEO_WIDTH / 2, 200);

  ctx.font = `36px Arial`;
  ctx.fillText(`Ready, ${childName}?`, VIDEO_WIDTH / 2, 280);

  if (challenge.practiceItems.length > 0) {
    const item = challenge.practiceItems[0];

    // Challenge box
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRect(ctx, 60, 400, VIDEO_WIDTH - 120, 400, 30);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${fonts.equation + 10}px Arial`;
    const problemLines = wrapText(ctx, item.problem, VIDEO_WIDTH - 160);
    let y = 550;
    for (const line of problemLines) {
      ctx.fillText(line, VIDEO_WIDTH / 2, y);
      y += fonts.equation + 20;
    }
  }

  ctx.font = `28px Arial`;
  ctx.fillText('Pause and try it!', VIDEO_WIDTH / 2, VIDEO_HEIGHT - 150);

  const challengeFilename = `scene_challenge.png`;
  const challengeFilepath = path.join(outputDir, challengeFilename);
  const challengeBuffer = challengeCanvas.toBuffer('image/png');
  fs.writeFileSync(challengeFilepath, challengeBuffer);

  scenes.push({
    id: 'challenge',
    type: 'challenge',
    duration: 20,
    startTime: currentTime,
    mainText: 'CHALLENGE TIME!',
    practiceItems: challenge.practiceItems.map(p => p.problem),
    animation: 'slide_up'
  });
  currentTime += 20;

  // Answer reveal
  if (challenge.practiceItems.length > 0) {
    const answerScenes = await createTextScenes(
      challenge.answerReveal,
      'reveal',
      colors,
      fonts,
      outputDir,
      currentTime,
      childName
    );
    scenes.push(...answerScenes);
  }

  return scenes;
}

/**
 * Create closing scene
 */
async function createClosingScene(
  script: LessonScript,
  colors: typeof COLOR_SCHEMES.math,
  fonts: typeof FONT_SIZES['K'],
  outputDir: string
): Promise<VideoScene> {
  const canvas = createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Celebratory gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, VIDEO_HEIGHT);
  gradient.addColorStop(0, colors.accent);
  gradient.addColorStop(0.5, colors.primary);
  gradient.addColorStop(1, colors.background);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  // Stars/sparkles
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * VIDEO_WIDTH;
    const y = Math.random() * (VIDEO_HEIGHT * 0.6);
    const size = Math.random() * 6 + 2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Great job message
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 72px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(`Great Job, ${script.childName}!`, VIDEO_WIDTH / 2, VIDEO_HEIGHT * 0.35);

  ctx.font = `${fonts.body}px Arial`;
  const closingLines = wrapText(ctx, script.closing, VIDEO_WIDTH - 100);
  let y = VIDEO_HEIGHT * 0.5;
  for (const line of closingLines) {
    ctx.fillText(line, VIDEO_WIDTH / 2, y);
    y += fonts.body + 12;
  }

  // Footer
  ctx.fillStyle = colors.subtextColor;
  ctx.font = `24px Arial`;
  ctx.fillText('Personalized Output', VIDEO_WIDTH / 2, VIDEO_HEIGHT - 80);

  const filename = `scene_closing.png`;
  const filepath = path.join(outputDir, filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filepath, buffer);

  return {
    id: 'closing',
    type: 'closing',
    duration: 15,
    startTime: 0,
    mainText: `Great Job, ${script.childName}!`,
    subText: script.closing,
    animation: 'fade_in'
  };
}

// Helper functions

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function splitContentIntoChunks(content: string): string[] {
  // Split by pause markers (...) or by sentences for longer content
  const pauseChunks = content.split(/\.\.\./);

  const finalChunks: string[] = [];

  for (const chunk of pauseChunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    // If chunk is too long, split by sentences
    if (trimmed.length > 300) {
      const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
      let current = '';

      for (const sentence of sentences) {
        if ((current + sentence).length > 250) {
          if (current) finalChunks.push(current.trim());
          current = sentence;
        } else {
          current += sentence;
        }
      }
      if (current) finalChunks.push(current.trim());
    } else {
      finalChunks.push(trimmed);
    }
  }

  return finalChunks;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent * 100);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

/**
 * Get the output directory for a specific order
 */
export function getVisualsOutputDir(orderId: string): string {
  return path.join(process.cwd(), 'outputs', 'homework', orderId, 'visuals');
}
