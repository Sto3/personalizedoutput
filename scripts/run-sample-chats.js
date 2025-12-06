/**
 * Run Sample Chat Sessions (JS version)
 *
 * Generates full transcripts for review
 */

require('dotenv').config();

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not set');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// LOAD SYSTEM PROMPTS
// ============================================================

function loadPrompt(filename) {
  const promptPath = path.join(__dirname, '..', 'src', 'lib', 'thoughtEngine', 'prompts', filename);
  return fs.readFileSync(promptPath, 'utf-8');
}

const SANTA_PROMPT = loadPrompt('chat_santa_guide.txt');
const HOLIDAY_PROMPT = loadPrompt('chat_holiday_reset_guide.txt');
const NEWYEAR_PROMPT = loadPrompt('chat_new_year_reset_guide.txt');

// ============================================================
// CALL CLAUDE API
// ============================================================

async function callClaude(systemPrompt, messages) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ============================================================
// RUN CHAT SESSION
// ============================================================

async function runChat(title, scenario, systemPrompt, userResponses) {
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('Scenario: ' + scenario);
  console.log('='.repeat(70) + '\n');

  // Get opening message
  const openingMessages = [{ role: 'user', content: 'Generate your opening message to start the conversation.' }];
  const opening = await callClaude(systemPrompt, openingMessages);
  console.log('GUIDE: ' + opening + '\n');

  // Build conversation
  const messages = [
    { role: 'assistant', content: opening }
  ];

  for (const userMessage of userResponses) {
    messages.push({ role: 'user', content: userMessage });
    console.log('USER: ' + userMessage + '\n');

    const response = await callClaude(systemPrompt, messages);
    messages.push({ role: 'assistant', content: response });
    console.log('GUIDE: ' + response + '\n');

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n[Session ended - ${messages.length} messages]\n`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  // Santa Chat
  await runChat(
    'SANTA MESSAGE CHAT TRANSCRIPT',
    'Emma, 7, adjusting to new school, showing kindness',
    SANTA_PROMPT,
    [
      "Her name is Emma.",
      "She's 7, she'll be 8 in February. She's a girl.",
      "This year was big for her - we moved to a new city in August and she had to start at a completely new school. She didn't know anyone. It was really hard at first, she cried every morning for the first two weeks.",
      "One moment that really got me was about a month in. There was this boy in her class named Marcus who has autism and some of the kids were avoiding him at lunch. Emma went and sat with him every day for a week until other kids started joining. She told me 'He's really funny once you talk to him, Mom. People just don't know yet.'",
      "Another thing - she tried out for the school play even though she was terrified. She's always been shy about performing. She didn't get the lead but she got a speaking part and she practiced her three lines probably 500 times. When she said them on stage she looked right at me and smiled.",
      "She's kind, really genuinely kind - not performative about it. She's also braver than she thinks she is. And she notices people who are left out.",
      "I want her to know that what she did for Marcus matters. That being the kid who includes others is one of the most important things you can be. And that being scared and doing something anyway is real courage.",
      "I think warm and gentle would be best for her - she's sensitive. And no, we're not religious, so just keep it about Santa and the spirit of Christmas, not Jesus.",
      "Yes, I think that's everything. Please create the message."
    ]
  );

  // Holiday Reset Chat
  await runChat(
    'HOLIDAY RESET CHAT TRANSCRIPT',
    'Navigating critical mother-in-law',
    HOLIDAY_PROMPT,
    [
      "It's my mother-in-law, Linda. She's not outright mean but she has this way of making little comments that just... get under my skin. And my husband doesn't always see it.",
      "It's mostly about how I parent and how I keep my house. Little things like 'Oh, you let them have screen time before homework?' or 'I guess some families don't do sit-down dinners anymore.' Always with this smile like she's just making conversation.",
      "Last month she came over and I had just gotten home from work. The dishes weren't done yet and she said 'You must be so busy, I don't know how you manage' but the way she said it... it didn't feel like sympathy. My husband said I was being sensitive.",
      "I usually just smile and change the subject. Or I go to another room and pretend I need to check on something. Then I stew about it for days. Sometimes I snap at my husband later which isn't fair.",
      "We've tried limiting visits but then my husband feels guilty. He's close to his mom. I've tried talking to him about it but he gets defensive, says that's just how she is and she means well.",
      "I'm afraid this Christmas is going to be three days of walking on eggshells. We're hosting this year which means she'll have opinions about everything - the food, the decorations, the gifts. And I'm afraid I'll either explode or completely shut down.",
      "Peace would be... being able to enjoy Christmas morning with my kids without dreading the afternoon. Not rehearsing conversations in my head. Maybe even having one moment where Linda says something nice and I can believe she means it."
    ]
  );

  // New Year Reset Chat
  await runChat(
    'NEW YEAR RESET CHAT TRANSCRIPT',
    'Left draining job, rebuilding',
    NEWYEAR_PROMPT,
    [
      "I'm Sarah. Three words... I'd say: Terrifying. Liberating. Unfinished.",
      "I left my job in June. I'd been there nine years and it was slowly killing me - not the work itself but the environment, my boss, the constant pressure to do more with less. I finally just... couldn't anymore.",
      "The hardest part was the uncertainty after. I had some savings but watching it drain while I figured out what's next was terrifying. There were days I couldn't get off the couch. My partner was supportive but I could tell he was worried.",
      "A moment that changed me... it was actually in September. I was volunteering at a community garden - just something to get out of the house - and this older woman asked me for help with something. We ended up talking for two hours. She'd had three completely different careers. She told me 'You're not behind, you're just beginning.' I cried in my car after.",
      "I surprised myself by how much I didn't miss it. I thought I'd feel lost without the identity of my job title, but mostly I felt relief. I also surprised myself by how angry I still am. I thought I'd processed it but there's still a lot there.",
      "I notice I put everyone else first until I have nothing left. Then I crash. It's happened at every job, in relationships, even friendships. I give and give and then I disappear because I'm empty.",
      "I need to let go of the guilt about leaving. The idea that I should have tried harder or that I gave up. And honestly, the anger at myself for staying so long.",
      "For 2025... I want to feel grounded. Present. I want to stop living in 'what if' and 'should have.' I want to trust that I can figure things out without having a five-year plan."
    ]
  );

  console.log('\n' + '='.repeat(70));
  console.log('ALL TRANSCRIPTS COMPLETE');
  console.log('='.repeat(70) + '\n');
}

main().catch(console.error);
