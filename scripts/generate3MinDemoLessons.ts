#!/usr/bin/env npx ts-node
/**
 * 3-Minute Demo Lesson Generator
 * Creates REAL educational demo lessons for the website (not teasers)
 *
 * These are the first 3 minutes of actual purchased lessons.
 * They should feel like real lessons that simply stop at the 3-minute mark.
 * NO CTAs, NO "full lesson" mentions - just natural educational content.
 *
 * Usage:
 *   npx ts-node scripts/generate3MinDemoLessons.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OUTPUT_DIR = path.join(__dirname, '..', 'outputs', 'demos');
const AUDIO_DIR = path.join(__dirname, '..', 'outputs', 'audio');
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'demos');

// Ensure directories exist
[OUTPUT_DIR, AUDIO_DIR, PUBLIC_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// PERFECTED voice settings - matching the Santa voice quality standard
// Based on VOICE_FINE_TUNING_GUIDE.md - these settings are proven to sound human
//
// KEY INSIGHT: Lower stability (0.68) = natural speech variation
// Higher similarity (0.82) = consistent character
// Moderate style (0.32) = warm without theatrical
const PERFECTED_LESSON_VOICE_SETTINGS = {
  stability: 0.68,         // PERFECTED: Natural variation, avoids robotic sound
  similarity_boost: 0.82,  // PERFECTED: Character consistency
  style: 0.32              // PERFECTED: Warm but genuine, not performative
};

// ElevenLabs Sarah voice (warm female narrator)
const SARAH_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

// Demo lesson scripts - EXACT content from user requirements
// These are NOT teasers - they are the first 3 minutes of real lessons
interface DemoLesson {
  id: string;
  name: string;
  age: string;
  interest: string;
  subject: string;
  script: string;
  outputFilename: string;
}

const DEMO_LESSONS: DemoLesson[] = [
  {
    id: 'joe_fractions_dinosaurs',
    name: 'Joe',
    age: '7',
    interest: 'dinosaurs',
    subject: 'fractions',
    outputFilename: 'demo-lesson-joe-3min',
    script: `Alright Joe, let's talk about fractions — but we're going to use dinosaurs, because your mom told me you know more about dinosaurs than anyone she's ever met.

So imagine you have 8 velociraptors. Fast, smart, hunting in a pack. Now, if 2 of them go off to scout ahead, what fraction of your pack is still with you?

... That's right — 6 out of 8. We write that as six over eight. The top number tells us how many we have. The bottom number tells us how many we started with.

Now here's something cool. 6 out of 8 is actually the same as 3 out of 4. We just made both numbers smaller, but the fraction stayed the same. That's called simplifying — and it's like when scientists use shorter names for dinosaurs instead of the full Latin names. Same dinosaur, simpler name.

... Let's try another one. Picture a T-Rex who just caught 12 fish from a river. Impressive, right? But T-Rex has 3 baby T-Rexes back at the nest, and they're hungry. If T-Rex shares the fish equally among the 3 babies, how many fish does each baby get?

... 12 divided by 3 equals 4. Each baby gets 4 fish. Now, here's where it gets interesting — we can write this as a fraction too. Each baby gets 4 out of the 12 fish, which is 4 over 12. And guess what? 4 over 12 simplifies to... 1 over 3. One third.

So when we say each baby got one third of the fish, we mean they each got an equal share when we split it three ways.

... Now let's make it trickier. What if T-Rex caught 12 fish, but this time there are 4 babies? How many fish does each baby get now?

... 12 divided by 4 equals 3. Each baby gets 3 fish. And as a fraction, that's 3 over 12, which simplifies to 1 over 4. One fourth.

See the pattern? When we share equally among 3, each part is one third. When we share among 4, each part is one fourth. The more you divide something, the smaller each piece becomes.

... Let's do one more. Imagine a Stegosaurus is walking through the forest. She has 16 plates on her back — you know, those cool bony plates that stick up. A curious pterodactyl flies by and lands on one of them. What fraction of the plates does the pterodactyl cover?

... Just 1 out of 16. One sixteenth. That's a pretty small fraction, right? One pterodactyl on sixteen plates.

Now, what if 4 pterodactyls landed on 4 different plates? That would be 4 out of 16. And 4 over 16 simplifies to... 1 over 4. One fourth.

You're doing great, Joe. Fractions are really just a way of describing parts of a group — and when the group is dinosaurs, it makes a lot more sense.`
  },
  {
    id: 'maya_solar_system_art',
    name: 'Maya',
    age: '10',
    interest: 'art',
    subject: 'solar system',
    outputFilename: 'demo-lesson-maya-3min',
    script: `Maya, you're about to learn the solar system — but we're going to do it your way. Your dad mentioned you're an artist, so let's think about this like we're painting a picture.

Imagine a huge canvas. Right in the center, you're going to put the biggest, brightest splash of yellow you can — that's the Sun. It's not just big, Maya. It's so big that you could fit over a million Earths inside it. So on our canvas, make that yellow really dominate the center.

... Now, close to that yellow, add a tiny dot of gray. Almost touching the sun. That's Mercury — the smallest planet and the closest to the Sun. It's gray and covered in craters, kind of like our Moon. Mercury is so close to the Sun that a year there — one full trip around the Sun — takes only 88 Earth days.

... Next, move out just a little and add a dot that's almost the same size as Earth, but color it with swirls of white, yellow, and orange. That's Venus. Here's something wild — Venus spins backwards compared to all the other planets. So if you lived on Venus, the Sun would rise in the west and set in the east. Artists notice details like that.

... Now for Earth. You know this one. Add a beautiful blue marble with green and brown patches for the continents, and swirls of white for clouds. Earth is special because it's the only planet we know of with liquid water on its surface — that's why it looks so blue from space.

... After Earth comes Mars. Use rusty red and orange for this one — it's called the Red Planet because its soil is full of iron oxide, which is basically rust. Mars is smaller than Earth, about half the size. And it has the tallest volcano in the entire solar system — Olympus Mons. It's three times taller than Mount Everest.

... Now we're leaving the rocky planets behind and entering the gas giants. Jupiter is next, and Maya, this is where you get to have fun. Jupiter is HUGE — the biggest planet by far. You could fit 1,300 Earths inside it. Use oranges, browns, tans, and don't forget the Great Red Spot — that's a storm that's been raging for hundreds of years. It's bigger than Earth itself.

... Saturn comes next, and this is every artist's favorite. Use pale gold and yellow for the planet, but the real star is the rings. Saturn's rings are made of billions of chunks of ice and rock, and they spread out wider than the distance from Earth to our Moon. When you draw those rings, make them thin and elegant — they're actually only about 30 feet thick, even though they're thousands of miles wide.

... Further out, we have Uranus. Here's a fun fact for an artist — Uranus is tilted completely on its side, so it looks like it's rolling around the Sun instead of spinning upright. Use a pale blue-green for this one. It's an ice giant, colder than the others.

And finally, Neptune — the deep blue one. The farthest planet from the Sun. Neptune is so far away that it takes 165 Earth years to make one trip around the Sun. It has the strongest winds in the solar system, over 1,200 miles per hour.

... So now you have your canvas, Maya. Yellow Sun in the center. Gray Mercury, swirling Venus, blue Earth, red Mars, giant Jupiter with its red spot, golden Saturn with those beautiful rings, tilted blue-green Uranus, and deep blue Neptune way out at the edge.`
  },
  {
    id: 'sarah_mortgage_bakery',
    name: 'Sarah',
    age: 'adult',
    interest: 'running her bakery',
    subject: 'mortgage amortization',
    outputFilename: 'demo-lesson-sarah-3min',
    script: `Sarah, let's demystify mortgage amortization — and since you run a bakery, we're going to use something you already understand intuitively.

Think about your monthly mortgage payment like a daily batch of croissants. Let's say you bake 100 croissants every single day, no matter what. That's your fixed payment — it never changes.

... Now, here's how amortization works. Early in your mortgage, most of those croissants go to paying off your ingredient suppliers — that's the interest. Maybe 70 of your 100 croissants go to interest, and only 30 go into building your actual inventory — that's the principal, the amount you actually borrowed.

... But here's the thing. Every month, because you're paying down that principal, you owe your suppliers a little less. So next month, maybe only 69 croissants go to interest, and 31 go to principal. The month after that, 68 to interest, 32 to principal.

Same daily batch of 100 croissants. But the split keeps shifting.

... By year 15 of a 30-year mortgage, you've hit the tipping point. Now more of each payment goes to principal than interest. And by the final years? Almost all of your payment — maybe 95 of those 100 croissants — goes straight to principal.

This is why people say you pay so much interest in the early years. It's not a scam. It's just math. The interest is calculated on what you still owe. When you owe a lot, the interest is high. As you pay it down, the interest shrinks.

... Let me give you real numbers, Sarah. Say you borrowed $300,000 at 7% interest for 30 years. Your monthly payment would be about $1,996 — let's call it $2,000 to keep it simple.

In your very first month, about $1,750 of that goes to interest, and only $250 goes to principal. You're paying $2,000, but your loan balance only drops by $250. That can feel frustrating.

... But look at month 180 — that's 15 years in. Now about $1,000 goes to interest and $1,000 goes to principal. You've hit the halfway point.

And by month 360, your final payment? Only about $12 goes to interest. The rest — nearly $1,988 — goes to principal, finishing off your loan.

... Here's something that might help you as a business owner, Sarah. If you ever have extra cash — maybe you had a great month at the bakery — and you put that toward your mortgage principal, you're essentially skipping ahead in the amortization schedule.

An extra $500 toward principal in year 2 might save you $1,500 in interest over the life of the loan, because that's $500 you'll never pay interest on again. It's like paying off your ingredient suppliers early so you don't keep accruing charges.

... This is also why refinancing can make sense. If interest rates drop, you can restart your amortization at a lower rate. The trade-off is you're back to paying mostly interest again, since you're starting a new schedule. So it only makes sense if the rate difference is big enough to offset that.

You're not just a bakery owner, Sarah. You understand cash flow, supplier relationships, and how money moves. That's all a mortgage is — just with bigger numbers and longer timelines.`
  }
];

/**
 * Generate voiceover using ElevenLabs API
 */
async function generateVoiceover(text: string, outputPath: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not found');

  console.log(`[TTS] Generating voiceover (${text.length} chars)...`);
  console.log(`[TTS] Settings: stability=${PERFECTED_LESSON_VOICE_SETTINGS.stability}, similarity=${PERFECTED_LESSON_VOICE_SETTINGS.similarity_boost}, style=${PERFECTED_LESSON_VOICE_SETTINGS.style}`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${SARAH_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: PERFECTED_LESSON_VOICE_SETTINGS
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  const stats = fs.statSync(outputPath);
  console.log(`[TTS] Saved: ${outputPath} (${Math.round(stats.size / 1024)}KB)`);
}

/**
 * Generate a 3-minute demo lesson video with voiceover
 */
async function generateDemoLesson(demo: DemoLesson): Promise<string> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`GENERATING: ${demo.name} — ${demo.interest} → ${demo.subject}`);
  console.log(`${'═'.repeat(60)}\n`);

  const timestamp = Date.now();
  const audioPath = path.join(AUDIO_DIR, `${demo.outputFilename}_${timestamp}.mp3`);
  const tempVideoPath = path.join(OUTPUT_DIR, `${demo.outputFilename}_${timestamp}_temp.mp4`);
  const withTextPath = path.join(OUTPUT_DIR, `${demo.outputFilename}_${timestamp}_text.mp4`);
  const finalVideoPath = path.join(OUTPUT_DIR, `${demo.outputFilename}.mp4`);
  const publicPath = path.join(PUBLIC_DIR, `${demo.outputFilename}.mp4`);

  // Step 1: Generate voiceover
  await generateVoiceover(demo.script, audioPath);

  // Get audio duration
  const durationStr = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  ).toString().trim();
  const duration = parseFloat(durationStr) + 2; // Add padding

  console.log(`[AUDIO] Duration: ${duration.toFixed(1)}s (target: ~180s)`);

  // Step 2: Generate gradient background (warm educational colors)
  const bgColor = demo.name === 'Sarah' ? '0x1a1a2e' : '0x2d3436'; // Dark for adult, slightly lighter for kids

  const bgCommand = `ffmpeg -y -f lavfi -i "color=c=${bgColor}:s=1080x1920:d=${duration}" -c:v libx264 -pix_fmt yuv420p "${tempVideoPath}"`;
  execSync(bgCommand, { stdio: 'pipe' });
  console.log(`[VIDEO] Background generated`);

  // Step 3: Add text overlays - name banner at top, subject at bottom
  const escapeText = (t: string) => t.replace(/'/g, "'\\''").replace(/:/g, '\\:');
  const titleText = escapeText(`${demo.name}'s Lesson`);
  const subjectText = escapeText(`${demo.interest} → ${demo.subject}`);

  const textCommand = `ffmpeg -y -i "${tempVideoPath}" -vf "\\
drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${titleText}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=h/6,\\
drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${subjectText}':fontcolor=0xffd93d:fontsize=48:x=(w-text_w)/2:y=h*5/6\\
" -c:a copy "${withTextPath}"`;

  execSync(textCommand, { stdio: 'pipe' });
  console.log(`[VIDEO] Text overlays added`);

  // Step 4: Combine with audio
  execSync(`ffmpeg -y -i "${withTextPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${finalVideoPath}"`, {
    stdio: 'pipe'
  });
  console.log(`[VIDEO] Audio combined`);

  // Step 5: Copy to public directory
  fs.copyFileSync(finalVideoPath, publicPath);
  console.log(`[PUBLIC] Copied to: ${publicPath}`);

  // Cleanup temp files
  [tempVideoPath, withTextPath].forEach(f => {
    if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch {}
  });

  // Verify final duration
  const finalDuration = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalVideoPath}"`
  ).toString().trim();

  console.log(`\n✓ Demo saved: ${finalVideoPath}`);
  console.log(`✓ Duration: ${parseFloat(finalDuration).toFixed(1)} seconds\n`);

  return finalVideoPath;
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║        3-MINUTE DEMO LESSON GENERATOR - REAL EDUCATIONAL CONTENT      ║
║        NOT teasers - First 3 minutes of actual purchased lessons      ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

  // Check for ElevenLabs API key
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env');
    process.exit(1);
  }

  const generatedVideos: string[] = [];
  const results: { name: string; duration: string; path: string }[] = [];

  for (const demo of DEMO_LESSONS) {
    try {
      const videoPath = await generateDemoLesson(demo);
      generatedVideos.push(videoPath);

      // Get duration for summary
      const duration = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      ).toString().trim();

      results.push({
        name: demo.name,
        duration: `${parseFloat(duration).toFixed(1)}s`,
        path: videoPath
      });

      // Rate limiting for ElevenLabs API
      console.log(`[RATE LIMIT] Waiting 3s before next...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`Error generating ${demo.name}:`, error);
    }
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                        GENERATION COMPLETE                             ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Generated ${generatedVideos.length} demo lesson video(s)                                      ║
╚═══════════════════════════════════════════════════════════════════════╝

Results:
${results.map(r => `  • ${r.name}: ${r.duration} → ${path.basename(r.path)}`).join('\n')}

Output directory: ${OUTPUT_DIR}
Public directory: ${PUBLIC_DIR}

Files for website deployment:
  • public/demos/demo-lesson-joe-3min.mp4
  • public/demos/demo-lesson-maya-3min.mp4
  • public/demos/demo-lesson-sarah-3min.mp4
`);
}

main().catch(console.error);
