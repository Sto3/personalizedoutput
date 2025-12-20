#!/usr/bin/env npx ts-node
/**
 * Full-Length Demo Lesson Generator
 *
 * Creates ~10 minute personalized lesson demos:
 * - Sarah: Audio-only adult lesson (bakery -> mortgage)
 * - Joe: Video+audio kid lesson with colorful visuals (dinosaurs -> fractions)
 *
 * Usage:
 *   npx ts-node scripts/generateFullLengthDemos.ts sarah  (audio only)
 *   npx ts-node scripts/generateFullLengthDemos.ts joe    (video + audio)
 *   npx ts-node scripts/generateFullLengthDemos.ts all
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { generateVoiceover, VISUAL_STYLES } from '../src/video/videoGenerator';
import { NARRATOR_VOICES, VIDEO_END_CTA } from '../src/video/voiceConfig';

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'demos');
const AUDIO_DIR = path.join(__dirname, '..', 'outputs', 'audio');

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

// ============================================================================
// SARAH'S FULL ADULT LESSON (~10 minutes)
// Topic: Understanding mortgages through her bakery business
// ============================================================================
const SARAH_ADULT_SCRIPT = `
Sarah, let's talk about your mortgage. And I know what you're thinking - mortgages are complicated, confusing, maybe even a little scary. But here's the thing: you already understand everything you need to know. Because honestly? A mortgage works exactly like running your bakery.

... Let me explain. ...

Think of your mortgage as one really big batch of dough that you're paying back over time. The bank gave you this massive ball of dough - let's say 300,000 dollars worth - and now you're paying it back, slice by slice, month by month.

... The principal. That's the actual amount you borrowed. Think of it like your initial flour order when you started the bakery - it's the core ingredient that everything else builds on. If you borrowed 300,000 dollars, that's your principal. That's the flour you need to work with.

The interest? That's the cost of borrowing that money. Think of it like your oven's energy bill. You need electricity to bake, right? And the bank needs interest to lend. It's the price of having that dough working in your kitchen instead of sitting in their vault.

... Now here's where it gets really interesting, Sarah. When you make your monthly payment - let's say it's 1,800 dollars - that money doesn't all go to the same place.

Part of your payment goes toward the principal - actually reducing how much dough you owe. And part goes toward the interest - paying that energy bill for using the bank's money.

... Here's the tricky part that confuses most people. ...

In the early years of your mortgage, most of your payment goes to interest. Way more than you might think. It's like when you first turn on your industrial oven in the morning - it takes a lot of energy just to heat up before you can even start baking.

In your very first payment, maybe 1,500 dollars goes to interest and only 300 dollars goes to principal. Seems unfair, right? But here's why it makes sense.

... The interest is calculated on what you still owe. ...

When you owe 300,000 dollars, the interest is calculated on all 300,000. That's a lot. But as you chip away at the principal - even just 300 dollars at a time - the amount you owe gets smaller. And when the amount you owe is smaller, the interest is calculated on a smaller number.

It's like your oven. Once it's hot, it takes less energy to maintain the temperature than it took to heat up. Same principle.

... So what happens over time? ...

As you pay down more of the principal, less interest accumulates each month. More of each payment chips away at the actual amount owed. By year 15 of a 30-year mortgage? About half of your payment goes to principal and half to interest. And by year 28? Most of your payment is finally reducing what you actually owe.

This is called amortization - fancy word, but simple concept. It just means the balance shifts over time from mostly paying interest to mostly paying principal.

... Let's make this really concrete with some numbers. ...

Say you bought your home for 300,000 dollars with a 6 percent interest rate and a 30-year mortgage. Your monthly payment is about 1,800 dollars.

Year one: You pay about 18,000 dollars in interest and only about 3,600 to principal. Ouch, right?

Year fifteen: You pay about 9,000 in interest and 9,000 to principal. Getting better.

Year twenty-five: You pay about 3,000 in interest and 18,000 to principal. Now we're cooking.

... Over the full 30 years, here's the wild part. ...

You'll pay back the 300,000 you borrowed. But you'll ALSO pay about 350,000 in interest. That's more than you borrowed! The total cost of your home ends up being around 650,000 dollars.

I know that sounds scary. But remember - you're spreading this over 30 years. And inflation means that 1,800 dollar payment feels a lot smaller in year 20 than it does in year 1.

... Now here's where your bakery brain can really help you, Sarah. ...

Think about what happens when you prep dough the night before. You do the work now, and it saves you time and stress tomorrow morning. Extra mortgage payments work exactly the same way.

An extra hundred dollars toward your mortgage principal each month can save you TENS of thousands in interest over the life of the loan. And it can knock years off your mortgage. Years.

... Here's the math. ...

If you add just 100 dollars extra to your monthly payment, specifically toward the principal - and this is important, you have to specify principal-only payment - you could pay off your mortgage 4 to 5 years early. And you'd save around 50,000 dollars in interest.

Think about that. A hundred dollars a month - that's probably what you spend on supplies for a slow Tuesday. But directed toward your mortgage principal, it saves you 50,000 dollars.

... Why does this work so well? ...

Because every extra dollar you pay toward principal is money you're NOT paying interest on anymore. Remember, interest is calculated on what you owe. Less owed means less interest. It's a compounding effect, just like the compound interest that works against you - but now it's working for you.

... Let me give you another bakery analogy. ...

Think about your ingredient costs. If your flour supplier raises prices, you feel that every single day for years. But if you negotiate a better rate, you save money every single day for years. Same amount of effort to negotiate - but the savings compound over time.

Extra mortgage payments are like negotiating better ingredient prices. One decision that pays off again and again.

... Now let's talk about refinancing. ...

Refinancing is like renegotiating your flour supplier's contract when market prices drop. If interest rates go down significantly - let's say from 6 percent to 4.5 percent - you might be able to get a new loan at that lower rate.

You're still paying back the same amount of dough - the principal. But the energy cost to use it is lower. That could save you hundreds of dollars every single month.

... But refinancing isn't free. ...

There are closing costs - usually 2 to 5 percent of your loan amount. So you need to do the math. Will you stay in this house long enough for the monthly savings to outweigh the upfront costs?

Good rule of thumb: if you can lower your rate by at least 1 percent and you plan to stay for 3 or more years, refinancing usually makes sense. But run the numbers for your specific situation.

... Here's something else your bakery experience prepared you for. ...

Fixed costs versus variable costs. In your bakery, rent is fixed - same amount every month. Ingredient costs vary with the market. Your mortgage can work the same way.

A fixed-rate mortgage locks in your interest rate for the life of the loan. You always know exactly what you're paying. Predictable, safe, easy to budget around.

An adjustable-rate mortgage - an ARM - starts with a lower rate but can change over time based on market conditions. Risky if rates go up, but potentially cheaper if rates stay low or drop.

... Which one is right for you? ...

Most people, especially first-time homeowners, do better with fixed-rate mortgages. The predictability is worth the slightly higher initial rate. But if you're only planning to be in a home for 5 to 7 years, an ARM with a 7-year fixed period might save you money.

It's like choosing between a fixed-price ingredient contract versus buying on the spot market. Fixed contracts give you peace of mind. Spot markets can save money but add uncertainty.

... Let's talk about one more important concept: equity. ...

Equity is the part of your home you actually own. It's the difference between what your home is worth and what you still owe on the mortgage.

When you buy a home with a 300,000 dollar mortgage and put 60,000 dollars down, you immediately have 60,000 in equity. As you pay down the mortgage, your equity grows. If your home also increases in value - which it usually does over time - your equity grows even faster.

... Why does equity matter? ...

Equity is wealth. It's money you can access if you need it through a home equity loan. It's money you keep when you sell. It's your growing ownership stake in a real asset.

Think of it like building up inventory in your bakery. Every month you're building up a little more. Over time, that inventory becomes significant. Same with equity.

... So what should you do with all this information, Sarah? ...

First, understand your current mortgage. What's your principal balance? What's your interest rate? How much of each payment goes to principal versus interest? Most mortgage statements show this.

Second, consider making extra principal payments when you can. Even small amounts help. Round up to the nearest hundred. Put your tax refund toward principal. Skip one unnecessary expense and redirect that money.

Third, watch interest rates. If they drop significantly below your current rate, look into refinancing. But do the math on closing costs.

Fourth, think about your timeline. Are you staying in this home for 10 years? 20 years? Your strategy might be different depending on your answer.

... The key insight, Sarah? Your mortgage isn't a mystery. ...

It's not some complicated financial instrument designed to confuse you. It's just another recipe to master. Principal is your ingredients. Interest is your operating cost. Time is your oven temperature. And extra payments? That's your competitive advantage.

You run a successful bakery. You understand inventory, cash flow, margins, and customer value. You already have every skill you need to master this mortgage.

... Now go bake something delicious, Sarah. You've got this. ...

And remember - every month you're building equity, building wealth, building toward owning your home outright. It's not just a payment. It's progress. It's your future.

Thank you for learning with us today. We hope this lesson helped make mortgages feel less intimidating and more manageable. You've got this!
`;

// ============================================================================
// JOE'S FULL KID LESSON (~10 minutes)
// Topic: Learning fractions through dinosaurs
// Age: 6 years old - SIMPLE LANGUAGE, NO COMPLEX WORDS
// ============================================================================
const JOE_KID_SCRIPT = `
Hey Joe! Ready for some dinosaur math? Today we're going to learn about fractions - and we're going to do it with your favorite dinosaurs!

... Are you ready? Let's go! ...

Okay Joe, I want you to imagine something. Imagine you're at a big dinosaur dig. You know, where people find dinosaur bones? You and three of your friends just found the BIGGEST dinosaur bone ever!

But wait - you need to share it so everyone can study it. Four friends. One big bone. How do we share it fairly?

... We cut it into four equal pieces! ...

When we cut something into four equal pieces, each piece is called one-fourth. Let me show you how we write that. We write the number one... on top... then a little line... then the number four on the bottom.

One-fourth. One over four. The bottom number tells you how many total pieces. The top number tells you how many pieces you have.

... So if you take one piece to study, you have one-fourth of the bone. ...

But Joe, here comes a T-Rex! And T-Rex is really big and really hungry - I mean, really wants to study dinosaur bones too. But T-Rex doesn't have a lot of friends. He only wants to share with ONE friend.

So T-Rex found HIS own bone and cut it into just TWO pieces.

... Each piece of T-Rex's bone is one-half. One over two. ...

Now here's a really cool question, Joe. Which piece do you think is BIGGER? Your one-fourth piece? Or T-Rex's one-half piece?

... Think about it... ...

T-Rex's piece is BIGGER! One-half is bigger than one-fourth!

Wait, that seems weird, right? Four is a bigger number than two. So shouldn't one-fourth be bigger than one-half?

... Here's the cool dinosaur secret. ...

When you cut something into FEWER pieces, each piece is BIGGER. Think about it like dinosaur eggs!

If a mama dinosaur has just two eggs, each egg can be really big. But if she has four eggs, each egg has to be smaller so they all fit.

Same thing with fractions! Fewer pieces means bigger pieces. Two pieces means big pieces. Four pieces means smaller pieces.

... Let's try another one! ...

A Brontosaurus - you know, the one with the really really long neck? - found a yummy prehistoric plant. And Brontosaurus wants to share with two friends. That's three dinosaurs total.

... They cut the plant into three equal pieces. ...

Each piece is one-third. One over three. Three equal pieces, and each dinosaur gets one.

Now Joe, which is bigger: one-third or one-half?

... Remember our rule? Fewer pieces means bigger pieces. ...

One-half is bigger! Because two is less than three, so each piece is bigger.

... You're doing amazing, Joe! Let's play a game. ...

I'm going to name two fractions, and you have to figure out which one is bigger. Ready?

One-half or one-fourth? ... One-half! Because two pieces is less than four pieces.

One-third or one-fifth? ... One-third! Because three pieces is less than five pieces.

One-tenth or one-second? ... One-second - that's the same as one-half! Because two is way less than ten.

... Awesome job! ...

Now let's learn about something really fun. What if you have MORE than one piece?

Go back to that dinosaur bone you cut into four pieces. You have one-fourth. But what if your friend gives you another piece? Now you have TWO pieces.

That's two-fourths! We write it with a two on top and a four on bottom. Two over four.

... And if you get another piece? Now you have three pieces. ...

Three-fourths! Three over four.

And if you collect ALL four pieces? Then you have four-fourths. And guess what? Four-fourths is the WHOLE THING! You have the whole bone!

... Any time the top number equals the bottom number, you have the whole thing. ...

Three-thirds equals one whole. Two-halves equals one whole. Ten-tenths equals one whole. See the pattern?

... Let me tell you a dinosaur story. ...

Once upon a time, there was a Stegosaurus named Spike. Spike found a big leafy tree and wanted to share the leaves with his dinosaur friends.

He counted the leaves. Eight leaves total. And he had four friends to share with.

So Spike gave two leaves to each friend. Two out of eight. That's two-eighths for each friend.

But wait! Two-eighths can be made simpler. Two-eighths is the same as one-fourth!

... How is that possible? ...

Well, think about it. If you cut something into eight pieces and take two, that's the same as cutting something into four pieces and taking one. Same amount of stuff!

... Let's check with pizza! ...

Imagine a pizza cut into eight slices. You eat two slices. That's two-eighths of the pizza.

Now imagine a pizza cut into four slices. You eat one slice. That's one-fourth of the pizza.

Both times, you ate the same amount of pizza! Two-eighths equals one-fourth.

... This is called making fractions simpler. ...

When the top and bottom numbers can both be divided by the same number, you can make the fraction simpler. Two and eight can both be divided by two. Two divided by two is one. Eight divided by two is four. So two-eighths becomes one-fourth!

... Don't worry if that seems tricky right now. ...

The important thing to remember is that the SAME AMOUNT can be written in different ways. Two-eighths, one-fourth - they're the same amount. Just different ways to say it.

Like how you can call your friend "Joe" or "Joseph" or "buddy" - same person, different names!

... Now for some dinosaur math problems! ...

Problem one: A Velociraptor has a pizza cut into six pieces. He eats two pieces. What fraction did he eat?

... Two-sixths! The top is two because he ate two pieces. The bottom is six because there were six pieces total.

Problem two: A Triceratops found five berries and ate one. What fraction did she eat?

... One-fifth! One berry out of five.

Problem three: An Ankylosaurus cut a log into three pieces and used two pieces to build a fort. What fraction of the log is in the fort?

... Two-thirds! Two pieces out of three.

... You're getting SO good at this, Joe! ...

Here's one more super cool thing. What happens when we add fractions together?

You have one-fourth of a dinosaur cookie. Your friend gives you another one-fourth of a dinosaur cookie. How much do you have now?

... Two-fourths! ...

One-fourth plus one-fourth equals two-fourths. We just add the top numbers! One plus one equals two. The bottom number stays the same - four.

... But here's the tricky part. ...

This only works when the bottom numbers are the same. One-fourth plus one-fourth? Easy! Add the tops.

But one-fourth plus one-half? That's harder because the bottom numbers are different. We'll learn how to do that when you're a little older. For now, just remember: same bottoms mean you can add the tops!

... Let's do one more. ...

T-Rex ate three-eighths of his dinner. Then he ate two more eighths. How much did he eat total?

Three-eighths plus two-eighths equals... five-eighths! Three plus two equals five. The bottom stays eight.

Did T-Rex eat the whole dinner? Let's see. The whole dinner would be eight-eighths. He only ate five-eighths. So he has three-eighths left!

... Amazing work, Joe! ...

You just learned SO much about fractions today. Let me remind you of the super important stuff:

The bottom number tells you how many total pieces.
The top number tells you how many pieces you have.
Fewer pieces means BIGGER pieces - so one-half is bigger than one-fourth.
When the top equals the bottom, you have the whole thing.
And you can add fractions when the bottom numbers are the same!

... Here's a secret, Joe. ...

Every time you share something with friends, you're doing fractions. Pizza night with your family? Fractions. Halloween candy with your sister? Fractions. Sharing dinosaur toys? Fractions!

You're already a fraction expert. You just didn't know it had a name!

... Great job today, Joe! ...

Keep thinking like a dinosaur scientist. Keep asking questions. Keep being curious. And remember - math is everywhere, even with the dinosaurs!

We'll see you next time for more dinosaur learning adventures. Bye Joe!
`;

/**
 * Generate audio-only lesson for Sarah
 */
async function generateSarahAudioLesson(): Promise<string> {
  console.log(`\n════════════════════════════════════════════════════`);
  console.log(`GENERATING: Sarah's Full Adult Audio Lesson`);
  console.log(`(Bakery → Mortgage, ~10 minutes)`);
  console.log(`════════════════════════════════════════════════════\n`);

  const audioPath = path.join(OUTPUT_DIR, 'sarah-bakery-mortgage-full.mp3');

  // Use Lily voice for adult content (British, warm, professional)
  const voice = NARRATOR_VOICES.find(v => v.name === 'Lily') || NARRATOR_VOICES[4];

  console.log(`[VOICE] Using ${voice.name} (${voice.tone})`);
  console.log(`[SCRIPT] ${SARAH_ADULT_SCRIPT.substring(0, 100)}...`);
  console.log(`[SCRIPT LENGTH] ~${SARAH_ADULT_SCRIPT.split(' ').length} words`);

  // Generate voiceover
  await generateVoiceover(SARAH_ADULT_SCRIPT, voice, audioPath, 'personalized');

  // Get audio duration
  const durationStr = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  ).toString().trim();
  const duration = parseFloat(durationStr);

  console.log(`\n✓ Audio generated: ${audioPath}`);
  console.log(`✓ Duration: ${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s`);

  return audioPath;
}

/**
 * Generate video+audio lesson for Joe with colorful kid-friendly visuals
 */
async function generateJoeVideoLesson(): Promise<string> {
  console.log(`\n════════════════════════════════════════════════════`);
  console.log(`GENERATING: Joe's Full Kid Video+Audio Lesson`);
  console.log(`(Dinosaurs → Fractions, ~10 minutes)`);
  console.log(`════════════════════════════════════════════════════\n`);

  const audioPath = path.join(AUDIO_DIR, 'joe-dinosaurs-fractions-full-audio.mp3');
  const videoPath = path.join(OUTPUT_DIR, 'joe-dinosaurs-fractions-full.mp4');
  const tempVideoPath = path.join(OUTPUT_DIR, 'joe-temp.mp4');

  // Use Sarah voice for kids (warm, friendly, engaging)
  const voice = NARRATOR_VOICES.find(v => v.name === 'Sarah') || NARRATOR_VOICES[0];

  console.log(`[VOICE] Using ${voice.name} (${voice.tone})`);
  console.log(`[SCRIPT] ${JOE_KID_SCRIPT.substring(0, 100)}...`);
  console.log(`[SCRIPT LENGTH] ~${JOE_KID_SCRIPT.split(' ').length} words`);

  // Step 1: Generate voiceover
  console.log(`\n[1/4] Generating voiceover...`);
  await generateVoiceover(JOE_KID_SCRIPT, voice, audioPath, 'educational');

  // Get audio duration
  const durationStr = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  ).toString().trim();
  const duration = parseFloat(durationStr) + 2;

  console.log(`[DURATION] ${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s`);

  // Step 2: Create kid-friendly animated gradient background
  // Using bright, fun colors kids love
  console.log(`\n[2/4] Creating colorful animated background...`);

  // Create an animated gradient that shifts between fun kid colors
  const bgCommand = `ffmpeg -y -f lavfi -i "color=size=1080x1920:duration=${duration}:rate=30:color=0x4CAF50[base];` +
    `color=size=1080x1920:duration=${duration}:rate=30:color=0x2196F3[c1];` +
    `color=size=1080x1920:duration=${duration}:rate=30:color=0xFFEB3B[c2];` +
    `[base][c1]blend=all_expr='A*(1-N/(${duration}*30))+B*(N/(${duration}*30))'[blend1];` +
    `[blend1][c2]blend=all_expr='A*(1-(N/(${duration}*30)))+B*(N/(${duration}*30))'" ` +
    `-c:v libx264 -pix_fmt yuv420p "${tempVideoPath}"`;

  // Simpler approach - use solid bright green background (dinosaur theme!)
  const simpleBgCommand = `ffmpeg -y -f lavfi -i "color=c=0x4CAF50:s=1080x1920:d=${duration}" ` +
    `-c:v libx264 -pix_fmt yuv420p "${tempVideoPath}"`;

  try {
    execSync(simpleBgCommand, { stdio: 'inherit' });
  } catch {
    console.log('Using fallback background...');
    execSync(`ffmpeg -y -f lavfi -i "color=c=green:s=1080x1920:d=${duration}" -c:v libx264 -pix_fmt yuv420p "${tempVideoPath}"`, { stdio: 'inherit' });
  }

  // Step 3: Add fun text overlays
  console.log(`\n[3/4] Adding dinosaur-themed text overlays...`);

  const escapeText = (t: string) => t.replace(/'/g, "'\\''").replace(/:/g, '\\:');
  const titleText = escapeText("JOE'S DINO MATH!");
  const subjectText = escapeText("Dinosaurs + Fractions = FUN!");

  const withTextPath = path.join(OUTPUT_DIR, 'joe-with-text.mp4');

  const textCommand = `ffmpeg -y -i "${tempVideoPath}" -vf "` +
    `drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${titleText}':fontcolor=white:fontsize=80:x=(w-text_w)/2:y=h/8:borderw=4:bordercolor=0x2E7D32,` +
    `drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf':text='${subjectText}':fontcolor=0xFFEB3B:fontsize=48:x=(w-text_w)/2:y=h*7/8:borderw=3:bordercolor=0x1B5E20,` +
    // Add dinosaur emoji placeholders (will show as boxes but adds visual interest)
    `drawtext=text='🦖':fontsize=120:x=100:y=h/3,` +
    `drawtext=text='🦕':fontsize=120:x=w-220:y=h/2` +
    `" -c:a copy "${withTextPath}"`;

  try {
    execSync(textCommand, { stdio: 'inherit' });
  } catch {
    console.log('Text overlay failed, continuing without...');
    fs.copyFileSync(tempVideoPath, withTextPath);
  }

  // Step 4: Combine with audio
  console.log(`\n[4/4] Combining video with audio...`);
  execSync(`ffmpeg -y -i "${withTextPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${videoPath}"`, {
    stdio: 'inherit'
  });

  // Cleanup temp files
  [tempVideoPath, withTextPath].forEach(f => {
    if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch {}
  });

  console.log(`\n✓ Video generated: ${videoPath}`);
  console.log(`✓ Duration: ${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s`);

  return videoPath;
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0]?.toLowerCase() || 'all';

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║           FULL-LENGTH DEMO LESSON GENERATOR                           ║
║                     ~10 Minute Personalized Lessons                    ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

  // Check for ElevenLabs API key
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env');
    console.log('Demo lessons require ElevenLabs for natural voiceover.');
    process.exit(1);
  }

  const results: string[] = [];

  if (target === 'sarah' || target === 'all') {
    const audioPath = await generateSarahAudioLesson();
    results.push(audioPath);
  }

  if (target === 'joe' || target === 'all') {
    const videoPath = await generateJoeVideoLesson();
    results.push(videoPath);
  }

  if (results.length === 0) {
    console.error(`Unknown target: ${target}`);
    console.log('Available: sarah, joe, all');
    process.exit(1);
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                        GENERATION COMPLETE                             ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Generated ${results.length} demo(s)                                            ║
╚═══════════════════════════════════════════════════════════════════════╝

Output files:
${results.map(r => `  • ${path.basename(r)}`).join('\n')}

These demos show the Personalization Experience in action:
  • Sarah: Audio-only adult lesson (bakery → mortgage)
  • Joe: Video+audio kid lesson (dinosaurs → fractions)

Ready to deploy to website!
`);
}

main().catch(console.error);
