#!/usr/bin/env npx ts-node
/**
 * Demo Lesson Video Generator
 * Creates sample 10-minute personalized lesson demos for the website
 *
 * These demos show the Thought Organizer in action - personalized lessons
 * that use what a learner LOVES to teach what they NEED.
 *
 * Usage:
 *   npx ts-node scripts/generateDemoLessons.ts [demo-name]
 *   npx ts-node scripts/generateDemoLessons.ts all
 *   npx ts-node scripts/generateDemoLessons.ts joe
 *   npx ts-node scripts/generateDemoLessons.ts maya
 *   npx ts-node scripts/generateDemoLessons.ts sarah
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import {
  generateVoiceover,
  VISUAL_STYLES,
  BACKGROUND_MUSIC
} from '../src/video/videoGenerator';
import {
  NARRATOR_VOICES,
  NATURAL_VOICE_SETTINGS,
  VIDEO_END_CTA,
  ELEVENLABS_MODELS
} from '../src/video/voiceConfig';

const OUTPUT_DIR = path.join(__dirname, '..', 'outputs', 'demos');
const AUDIO_DIR = path.join(__dirname, '..', 'outputs', 'audio');

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Demo Lesson Scripts
// These are the EXACT scripts from user requirements
interface DemoLesson {
  id: string;
  name: string;
  age: string;
  interest: string;
  subject: string;
  targetAudience: 'kid' | 'adult';
  script: string;
  visualStyle: keyof typeof VISUAL_STYLES;
}

const DEMO_LESSONS: DemoLesson[] = [
  {
    id: 'joe_dinosaurs_fractions',
    name: 'Joe',
    age: '6',
    interest: 'dinosaurs',
    subject: 'fractions',
    targetAudience: 'kid',
    visualStyle: 'gradient_warm',
    script: `Hey Joe! Ready for some dinosaur math? Today we're going to learn about fractions - and we're going to do it with your favorite dinosaurs!

... Let me tell you a story. ...

Imagine you're a paleontologist at a dinosaur dig site. You and three friends found a HUGE fossil, and you need to split it into equal parts so everyone can study it.

... If you cut that fossil into four equal pieces, each piece is called one-fourth. We write it like this: one... over... four. The bottom number tells you how many total pieces. The top number tells you how many pieces you have.

So if you take one piece to study, you have one-fourth of the fossil. ...

But wait - what if a T-Rex shows up? T-Rex is really big and scary, so he only wants to share with ONE friend. So he cuts HIS fossil into just two pieces.

... Each piece of T-Rex's fossil is one-half - that's one over two. ...

Here's the cool part, Joe. Which piece do you think is BIGGER? The one-fourth piece from your dig, or the one-half piece from T-Rex?

... The one-half piece is bigger! Even though the number "four" seems bigger than "two", when you cut something into FEWER pieces, each piece is LARGER.

Think of it like dinosaur eggs. If a mama dinosaur has two eggs, each egg is bigger than if she had four eggs, right? Same thing with fractions! ...

Let's try another one. A Brontosaurus found a delicious prehistoric plant and wants to share it with two friends. That's three dinosaurs total. ...

They cut the plant into three equal pieces. Each piece is one-third - one over three.

Now, which is bigger: one-third or one-half? ...

... One-half is bigger! Because two is less than three, so the pieces are bigger. ...

You're learning fractions, Joe, one dinosaur at a time! And here's a super secret: every time you share something with friends, you're doing fractions. Pizza night? Fractions. Halloween candy? Fractions. You're already a fraction expert!

Great job today, Joe. Keep thinking like a dinosaur scientist!`
  },
  {
    id: 'maya_art_solar_system',
    name: 'Maya',
    age: '10',
    interest: 'art',
    subject: 'solar system',
    targetAudience: 'kid',
    visualStyle: 'gradient_purple',
    script: `Hey Maya! Today we're going to paint the solar system - and I know you're an amazing artist, so this is going to be beautiful!

... Grab your canvas in your mind. We're about to create something incredible. ...

First, right in the center, we need our star - the Sun. Paint a giant, glowing yellow circle. But here's an artist's secret: don't just use yellow. Add orange at the edges, and tiny white spots in the center to show how incredibly hot it is. The Sun is like a giant ball of fire in space! ...

Now, imagine drawing invisible circles around your sun - like ripples in a pond. These are called orbits, and each planet travels along its own circle.

... The first planet is Mercury - the smallest one! Paint a tiny gray circle, like a pebble. Mercury is so close to the Sun that it gets incredibly hot during the day - over 800 degrees!

Second is Venus. Paint this one a creamy yellowish-white. Venus is covered in thick clouds that trap heat, making it even HOTTER than Mercury, even though it's farther away. ...

Third is our home - Earth! ... Use beautiful blue for the oceans, green and brown for the land, and swirl some white clouds across it. Earth is the only planet we know that has life - that's where you and me are right now!

Fourth is Mars - the red planet! ... Mix your red and orange and brown together. Mars looks rusty because its soil contains iron that rusted, just like an old bicycle left in the rain.

Now, Maya, here's where your painting gets REALLY interesting. ...

Between Mars and the next planet, there's the asteroid belt. Paint tiny dots scattered in a ring - like you're flicking your paintbrush! These are millions of rocks floating in space.

Fifth planet - Jupiter! Make this one HUGE, Maya - bigger than all the other planets combined! ... Use orange and white and tan, and paint swirling bands across it. See that little red spot? That's a storm bigger than Earth that's been raging for hundreds of years!

Sixth is Saturn - every artist's favorite! ... Paint a beautiful golden yellow ball, but then add those famous rings! The rings are made of ice and rock, and they sparkle in the sunlight.

... Seventh is Uranus - paint this one a pale, icy blue. Uranus is tilted on its side, like someone knocked it over! It spins like a rolling ball instead of like a spinning top.

And finally, Neptune - the last planet! ... Use your deepest, richest blue. Neptune has the fastest winds in the solar system - over a thousand miles per hour!

Maya, you've just painted our entire solar system! Eight planets, one star, and an asteroid belt. ...

Here's a way to remember the order: My Very Excited Mother Just Served Us Nachos. Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune! ...

You're not just learning planets, Maya - you're creating a masterpiece of the cosmos! Keep painting, keep exploring, and keep asking questions!`
  },
  {
    id: 'sarah_bakery_mortgage',
    name: 'Sarah',
    age: 'adult',
    interest: 'running her bakery',
    subject: 'understanding her mortgage',
    targetAudience: 'adult',
    visualStyle: 'gradient_dark',
    script: `Sarah, let's talk about your mortgage - but let's talk about it the way YOU think about your business. Because honestly? A mortgage works a lot like running your bakery.

... Think of your mortgage as one really big batch of dough you're paying back over time. ...

The principal - that's the actual amount you borrowed to buy your house. Think of it like your initial flour order - it's the core ingredient that everything else builds on.

The interest? That's the cost of borrowing that money. Think of it like your oven's energy bill. You need energy to bake, and the bank needs interest to lend. It's the price of having that dough working in your kitchen.

... Now here's where it gets interesting. When you make your monthly payment, it doesn't all go to the same place.

Part of your payment goes toward the principal - actually reducing how much dough you owe. And part goes toward the interest - paying that energy bill.

Here's the tricky part, Sarah. ... In the early years of your mortgage, most of your payment goes to interest. It's like when you first turn on your oven - it takes a lot of energy just to heat up.

But over time, as you pay down more of the principal, less interest accumulates. More of each payment chips away at the actual amount owed. ... Like an oven that's already hot - it takes less energy to maintain.

This is called amortization - fancy word, simple concept. At first, you're mostly paying for the privilege of borrowing. By the end, you're mostly paying off the actual debt. ...

Let's look at a real example. Say your house cost 300,000 dollars. At a 6 percent interest rate over 30 years, your monthly payment is about 1,800 dollars.

In your first payment, maybe 1,500 dollars goes to interest and only 300 goes to principal. ... But by year 15? About half goes to each. And by year 28? Most of your payment is finally reducing what you actually owe.

... Here's where your bakery brain can really help you. ...

Extra payments. Just like in your bakery, if you can work ahead - do extra prep work now - you save time and money later. An extra hundred dollars toward your mortgage principal each month can save you tens of thousands in interest over the life of the loan. And it can knock YEARS off your mortgage.

Think of it this way: every extra dollar toward principal is like prepping dough the night before. You're not paying interest on money you've already paid back. ...

And refinancing? That's like renegotiating your flour supplier's contract when prices drop. If interest rates go down, you might be able to get a new loan at a lower rate. You're still paying back the same dough, but the energy cost is lower. ...

The key insight, Sarah? Your mortgage isn't a mystery. It's not some complicated financial instrument designed to confuse you. It's just another recipe to master.

Principal is your ingredients. Interest is your operating cost. Time is your oven temperature. And extra payments? That's your competitive advantage.

... You run a successful bakery. You understand inventory, cash flow, and customer value. You already have all the skills you need to master this mortgage.

Now go bake something delicious, Sarah. You've got this!`
  }
];

/**
 * Generate a demo lesson video with voiceover
 */
async function generateDemoLesson(demo: DemoLesson): Promise<string> {
  console.log(`\n════════════════════════════════════════════════════`);
  console.log(`GENERATING DEMO: ${demo.name} (${demo.interest} → ${demo.subject})`);
  console.log(`════════════════════════════════════════════════════\n`);

  const videoId = `demo_${demo.id}_${Date.now()}`;
  const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`);
  const tempVideoPath = path.join(OUTPUT_DIR, `${videoId}_temp.mp4`);
  const withTextPath = path.join(OUTPUT_DIR, `${videoId}_text.mp4`);
  const finalVideoPath = path.join(OUTPUT_DIR, `${videoId}.mp4`);

  // Select appropriate voice - Sarah (warm) for kids, Lily (british warm) for adults
  const voice = demo.targetAudience === 'kid'
    ? NARRATOR_VOICES.find(v => v.name === 'Sarah') || NARRATOR_VOICES[0]
    : NARRATOR_VOICES.find(v => v.name === 'Lily') || NARRATOR_VOICES[4];

  // Add follow CTA to end of script
  const fullScript = `${demo.script} ... ${VIDEO_END_CTA.voiceover}`;

  console.log(`[VOICE] Using ${voice.name} (${voice.tone})`);
  console.log(`[SCRIPT] ${demo.script.substring(0, 100)}...`);

  // Step 1: Generate voiceover with educational settings for natural sound
  const voiceType = demo.targetAudience === 'kid' ? 'educational' : 'personalized';
  await generateVoiceover(fullScript, voice, audioPath, voiceType);

  // Get audio duration
  const durationStr = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  ).toString().trim();
  const duration = parseFloat(durationStr) + 2; // Add padding

  console.log(`[DURATION] ${duration.toFixed(1)}s`);

  // Step 2: Generate gradient background using first color from style
  const style = VISUAL_STYLES[demo.visualStyle];
  const primaryColor = style.colors[0].replace('#', '0x');
  const secondaryColor = style.colors[1].replace('#', '0x');

  // Use solid color background (gradient generation requires more complex ffmpeg)
  const bgCommand = `ffmpeg -y -f lavfi -i "color=c=${primaryColor}:s=1080x1920:d=${duration}" \
    -c:v libx264 -pix_fmt yuv420p "${tempVideoPath}"`;

  execSync(bgCommand, { stdio: 'inherit' });
  console.log(`[VIDEO] Background generated (${style.name})`);

  // Step 3: Add text overlays - name banner at top, subject at bottom
  const escapeText = (t: string) => t.replace(/'/g, "'\\''").replace(/:/g, '\\:');

  const titleText = escapeText(`${demo.name}'s Lesson`);
  const subjectText = escapeText(`${demo.interest} → ${demo.subject}`);
  const followText = escapeText(VIDEO_END_CTA.text);

  const ctaStart = duration - 3;

  const textCommand = `ffmpeg -y -i "${tempVideoPath}" -vf "\
drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${titleText}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=h/6,\
drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${subjectText}':fontcolor=0x${style.accentColor.replace('#', '')}:fontsize=48:x=(w-text_w)/2:y=h*5/6,\
drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${followText}':fontcolor=0x${style.accentColor.replace('#', '')}:fontsize=36:x=(w-text_w)/2:y=h*11/12:enable='between(t,${ctaStart},${duration})'\
" -c:a copy "${withTextPath}"`;

  execSync(textCommand, { stdio: 'inherit' });
  console.log(`[VIDEO] Text overlays added`);

  // Step 4: Combine with audio
  execSync(`ffmpeg -y -i "${withTextPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${finalVideoPath}"`, {
    stdio: 'inherit'
  });
  console.log(`[VIDEO] Audio combined`);

  // Cleanup
  [tempVideoPath, withTextPath].forEach(f => {
    if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch {}
  });

  console.log(`\n✓ Demo saved: ${finalVideoPath}\n`);
  return finalVideoPath;
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0]?.toLowerCase() || 'all';

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║           DEMO LESSON GENERATOR - 10-MINUTE PERSONALIZED LESSONS      ║
║                     Powered by Thought Organizer™                      ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

  // Check for ElevenLabs API key
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env');
    console.log('Demo lessons require ElevenLabs for natural voiceover.');
    process.exit(1);
  }

  const generatedVideos: string[] = [];

  if (target === 'all') {
    // Generate all demos
    for (const demo of DEMO_LESSONS) {
      const videoPath = await generateDemoLesson(demo);
      generatedVideos.push(videoPath);
    }
  } else {
    // Find specific demo
    const demo = DEMO_LESSONS.find(d =>
      d.id.toLowerCase().includes(target) ||
      d.name.toLowerCase() === target
    );

    if (!demo) {
      console.error(`Demo not found: ${target}`);
      console.log('Available demos:');
      DEMO_LESSONS.forEach(d => console.log(`  - ${d.name.toLowerCase()} (${d.id})`));
      process.exit(1);
    }

    const videoPath = await generateDemoLesson(demo);
    generatedVideos.push(videoPath);
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                        GENERATION COMPLETE                             ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Generated ${generatedVideos.length} demo video(s)                                          ║
║  Output: ${OUTPUT_DIR}
╚═══════════════════════════════════════════════════════════════════════╝

Demo Videos:
${generatedVideos.map(v => `  • ${path.basename(v)}`).join('\n')}

These demos show Thought Organizer™ in action:
  • Joe: Dinosaurs → Fractions (kid-friendly)
  • Maya: Art → Solar System (kid-friendly)
  • Sarah: Bakery → Mortgage (adult professional)

Ready to deploy to website!
`);
}

main().catch(console.error);
