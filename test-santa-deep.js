/**
 * Test Santa Deep Personalization
 *
 * Demonstrates the richly personalized Santa message flow.
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const SANTA_VOICE_SETTINGS = {
  stability: 0.68,
  similarity_boost: 0.82,
  style: 0.32
};

// Deep personalization input - this is what the questionnaire collects
const deepInput = {
  childFirstName: 'Emma',
  childGender: 'girl',
  childAge: 7,

  primaryScenario: 'kindness_to_others',

  proudMoment1: {
    whatHappened: "There was a new girl who started at Emma's school in October. She didn't know anyone and was sitting alone at lunch every day for the first week.",
    howChildResponded: "Emma noticed her on the third day and walked right over. She invited her to sit with her group, even though some of her friends gave her looks. She introduced her to everyone and made sure she felt included.",
    whyItMattered: "It showed me that Emma has real courage to do what's right even when it's not the popular thing. She saw someone hurting and acted.",
    specificDetail: "Emma told me later, 'Mom, she looked like how I felt on my first day. Nobody should feel invisible.'"
  },

  proudMoment2: {
    whatHappened: "Her little brother was having a really hard time with nightmares for a few weeks. He was scared to go to sleep.",
    howChildResponded: "Without us asking, Emma started reading him bedtime stories every night. She even made up her own 'brave dreams' story about a superhero who fights bad dreams.",
    whyItMattered: "She showed such tenderness and creativity. She wanted to help her brother feel safe, and she found her own way to do it.",
    specificDetail: "She drew pictures to go with her story and left them by his bed 'for protection'"
  },

  characterTraits: ['kind', 'brave', 'creative', 'thoughtful'],
  growthArea: "She's become so much more confident in speaking up for what's right, even in uncomfortable situations. At the beginning of the year she would have stayed quiet.",
  challengeOvercome: "She struggled with feeling shy about sharing her ideas in class, but now she raises her hand almost every day.",

  whatParentWantsReinforced: "I want her to know that her kindness matters. That choosing to be kind, especially when it's hard, is one of the most important things a person can do. And that we see her and we're so proud of who she's becoming.",

  anythingToAvoid: null,
  tonePreference: 'warm_gentle'
};

// Infer pronouns
function inferPronouns(gender) {
  if (gender === 'boy') {
    return { subject: 'he', object: 'him', possessive: 'his' };
  } else {
    return { subject: 'she', object: 'her', possessive: 'her' };
  }
}

// Scenario contexts
const SCENARIO_CONTEXTS = {
  kindness_to_others: "This child has demonstrated genuine kindness. Highlight how their compassion makes the world better."
};

// Build the prompt
function buildDeepPrompt(input) {
  const pronouns = inferPronouns(input.childGender);
  const scenarioContext = SCENARIO_CONTEXTS[input.primaryScenario];

  return `You are Santa Claus creating a personalized 45-60 second voice message for a child.

IMPORTANT GUIDELINES:
- NO references to "magic" or "magical" (respects all beliefs)
- NO religious references (Christmas meaning differs by family)
- Focus on: kindness, effort, growth, courage, character
- Warm, genuine, grounded tone
- Make both the PARENT and CHILD feel this is truly personal

CHILD INFORMATION:
Name: ${input.childFirstName}
Age: ${input.childAge} years old
Gender: ${input.childGender}

THIS YEAR'S FOCUS: ${scenarioContext}

PROUD MOMENT #1:
What happened: ${input.proudMoment1.whatHappened}
How ${input.childFirstName} responded: ${input.proudMoment1.howChildResponded}
Why it mattered: ${input.proudMoment1.whyItMattered}
${input.proudMoment1.specificDetail ? `Vivid detail - ${input.childFirstName} said: "${input.proudMoment1.specificDetail}"` : ''}

PROUD MOMENT #2:
What happened: ${input.proudMoment2.whatHappened}
How ${input.childFirstName} responded: ${input.proudMoment2.howChildResponded}
Why it mattered: ${input.proudMoment2.whyItMattered}
${input.proudMoment2.specificDetail ? `Vivid detail: ${input.proudMoment2.specificDetail}` : ''}

CHARACTER TRAITS: ${input.characterTraits.join(', ')}
WHERE THEY'VE GROWN: ${input.growthArea}
${input.challengeOvercome ? `CHALLENGE OVERCOME: ${input.challengeOvercome}` : ''}

WHAT THE PARENT MOST WANTS REINFORCED:
${input.whatParentWantsReinforced}

TONE: Soft, comforting, like a warm hug. Slower pacing, tender delivery.

PRONOUNS: Use ${pronouns.subject}/${pronouns.object}/${pronouns.possessive}

---

CRITICAL REQUIREMENTS:

1. USE SPECIFIC DETAILS from the proud moments - reference the new girl at school, the bedtime stories for her brother
2. Include Emma's quote: "Nobody should feel invisible" - this is powerful
3. Reference the "brave dreams" story she made up
4. Weave the parent's message about kindness mattering into Santa's words
5. Say Emma 2-3 times naturally

ABSOLUTELY DO NOT:
- Use the word "magic" or "magical"
- Reference Jesus, God, or religious meaning of Christmas
- Make promises about gifts
- Say anything that could pressure, guilt, or shame

STRUCTURE (140-170 words, ~50-60 seconds):

1. GREETING (15-20 words)
   - "Ho ho ho! Hello Emma!"
   - Brief warm opener

2. RECOGNITION - THE HEART (90-100 words)
   - Reference the new girl at school and what Emma did
   - Use her quote about nobody feeling invisible
   - Mention the bedtime stories for her brother
   - Show you really KNOW this child - be specific!

3. CHARACTER AFFIRMATION (30-40 words)
   - Affirm that her kindness matters
   - Connect to who she's becoming

4. WARM CLOSE (20 words)
   - Encouragement
   - "Merry Christmas, Emma"

---

Generate the script as plain text. Include natural pauses with "..." where appropriate.`;
}

async function generateScript(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  return data.content[0].text.trim();
}

async function generateAudio(script) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_SANTA_VOICE_ID;

  const response = await axios({
    method: 'POST',
    url: `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    data: {
      text: script,
      model_id: 'eleven_monolingual_v1',
      voice_settings: SANTA_VOICE_SETTINGS
    },
    responseType: 'arraybuffer'
  });

  return Buffer.from(response.data);
}

async function main() {
  console.log('='.repeat(70));
  console.log('SANTA DEEP PERSONALIZATION TEST');
  console.log('='.repeat(70));
  console.log('');
  console.log('Child: Emma, 7 years old');
  console.log('Focus: Kindness to others');
  console.log('');
  console.log('Proud Moment 1: Befriended new girl at school');
  console.log('Proud Moment 2: Made up bedtime stories for scared brother');
  console.log('');
  console.log('Parent wants reinforced: Her kindness matters');
  console.log('');
  console.log('-'.repeat(70));

  // Step 1: Generate script
  console.log('[1/2] Generating personalized script...');
  const prompt = buildDeepPrompt(deepInput);
  const script = await generateScript(prompt);

  console.log('');
  console.log('GENERATED SCRIPT:');
  console.log('-'.repeat(70));
  console.log(script);
  console.log('-'.repeat(70));
  console.log(`Words: ${script.split(/\s+/).length}`);
  console.log(`Characters: ${script.length}`);
  console.log('');

  // Step 2: Generate audio
  console.log('[2/2] Generating audio...');
  const audioBuffer = await generateAudio(script);

  // Save
  const outputDir = 'outputs/santa';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filepath = path.join(outputDir, `santa-emma-deep-${Date.now()}.mp3`);
  fs.writeFileSync(filepath, audioBuffer);

  console.log(`✓ Audio saved: ${filepath}`);
  console.log(`  Size: ${(audioBuffer.length / 1024).toFixed(1)} KB`);
  console.log('');
  console.log('='.repeat(70));
  console.log('SUCCESS! Opening audio...');
  console.log('='.repeat(70));

  // Open the file
  require('child_process').exec(`open "${filepath}"`);
}

main().catch(console.error);
