/**
 * Test Thought Engine
 *
 * Quick test of the Thought Engine with sample data.
 */

require('dotenv').config();

// Note: This is a JS test file. For production, use TypeScript.
// The actual engine files are in TypeScript.

async function testHolidayReset() {
  console.log('='.repeat(70));
  console.log('THOUGHT ENGINE TEST - Holiday Relationship Reset');
  console.log('='.repeat(70));
  console.log('');

  // Sample answers for Holiday Reset planner
  const sampleAnswers = {
    // Context
    primary_life_area: 'family',
    timeframe_id: 'holiday_season',

    // Goals
    goals: [
      { label: 'Have a peaceful holiday dinner', life_area: 'family', importance: 5 },
      { label: 'Set better boundaries with in-laws', life_area: 'relationship', importance: 4 },
      { label: 'Not lose myself in people-pleasing', life_area: 'self_discovery', importance: 4 }
    ],

    // Tensions
    tensions: [
      {
        description: 'My mom makes passive-aggressive comments about my parenting',
        life_area: 'family',
        frequency: 'often',
        emotional_intensity: 4
      },
      {
        description: 'My partner wants to split time evenly but I feel guilty not giving my family more',
        life_area: 'relationship',
        frequency: 'constant',
        emotional_intensity: 5
      },
      {
        description: 'I always end up doing all the cooking and cleaning while others relax',
        life_area: 'family',
        frequency: 'often',
        emotional_intensity: 3
      }
    ],

    // Themes
    selected_themes: ['Boundaries', 'Guilt', 'People-pleasing'],

    // Constraints
    time_constraint: 'I only have 3 days off work',
    budget_constraint: 'We are on a tight budget this year',

    // Freeform
    biggest_fear: 'That I will snap at my mom and ruin Christmas for my kids',
    what_peace_looks_like: 'Being able to enjoy the moment without dreading the next comment or obligation',
    past_attempts: 'I tried talking to my mom last year but she got defensive and we didn\'t speak for a month',

    // Preferences
    tone_preference: 'direct',
    spiritual_language_ok: false
  };

  console.log('Sample Input:');
  console.log('- Primary focus: Family relationships');
  console.log('- Timeframe: Holiday season');
  console.log(`- Goals: ${sampleAnswers.goals.length}`);
  console.log(`- Tensions: ${sampleAnswers.tensions.length}`);
  console.log(`- Themes: ${sampleAnswers.selected_themes.join(', ')}`);
  console.log('');

  console.log('Note: Full test requires TypeScript compilation.');
  console.log('Run: npx ts-node test-thought-engine.ts');
  console.log('');

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️  ANTHROPIC_API_KEY not set - LLM calls will fail');
  } else {
    console.log('✓ ANTHROPIC_API_KEY is set');
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('ENGINE STRUCTURE:');
  console.log('='.repeat(70));
  console.log('');
  console.log('src/lib/thoughtEngine/');
  console.log('├── models/');
  console.log('│   ├── userInput.ts        - User input types');
  console.log('│   ├── meaningModel.ts     - Internal representation');
  console.log('│   └── productConfig.ts    - Product configurations');
  console.log('├── engines/');
  console.log('│   ├── normalizeAnswersToUserInput.ts');
  console.log('│   ├── buildMeaningModel.ts');
  console.log('│   ├── generateSections.ts');
  console.log('│   └── renderPdf.ts');
  console.log('├── santa/');
  console.log('│   ├── buildSantaScript.ts');
  console.log('│   └── elevenLabsClient.ts');
  console.log('├── prompts/');
  console.log('│   ├── holiday_relationship_reset.txt');
  console.log('│   ├── new_year_reflection_reset.txt');
  console.log('│   └── santa_message.txt');
  console.log('├── pdfTemplates/');
  console.log('│   └── (default template in renderPdf.ts)');
  console.log('└── index.ts               - Main exports');
  console.log('');
  console.log('src/api/');
  console.log('├── thoughtEngineApi.ts    - POST /api/thought-engine/generate');
  console.log('└── santaApi.ts            - POST /api/santa/generate');
}

async function testSantaMessage() {
  console.log('');
  console.log('='.repeat(70));
  console.log('THOUGHT ENGINE TEST - Santa Message');
  console.log('='.repeat(70));
  console.log('');

  const sampleSantaInput = {
    childName: 'Emma',
    pronunciation: 'Em-uh',
    age: 7,
    pronouns: 'she',
    scenario: 'overcoming_bullying',
    proudMoment: 'She stood up for a new kid at school who was being teased. She invited him to sit with her at lunch even though her other friends made fun of her for it.',
    encouragementNote: 'Remind her that being kind is always the right choice, even when it\'s hard.',
    energyLevel: 'cheerful'
  };

  console.log('Sample Santa Input:');
  console.log(`- Child: ${sampleSantaInput.childName}, age ${sampleSantaInput.age}`);
  console.log(`- Scenario: ${sampleSantaInput.scenario}`);
  console.log(`- Energy: ${sampleSantaInput.energyLevel}`);
  console.log('');
  console.log('Proud moment:', sampleSantaInput.proudMoment);
  console.log('');

  // Check API keys
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️  ANTHROPIC_API_KEY not set - Script generation will fail');
  } else {
    console.log('✓ ANTHROPIC_API_KEY is set');
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    console.log('⚠️  ELEVENLABS_API_KEY not set - Audio generation will fail');
  } else {
    console.log('✓ ELEVENLABS_API_KEY is set');
  }

  if (!process.env.ELEVENLABS_SANTA_VOICE_ID) {
    console.log('⚠️  ELEVENLABS_SANTA_VOICE_ID not set - Using default voice');
  }
}

async function main() {
  await testHolidayReset();
  await testSantaMessage();

  console.log('');
  console.log('='.repeat(70));
  console.log('NEXT STEPS:');
  console.log('='.repeat(70));
  console.log('');
  console.log('1. Set environment variables:');
  console.log('   ANTHROPIC_API_KEY=your-key');
  console.log('   ELEVENLABS_API_KEY=your-key');
  console.log('   ELEVENLABS_SANTA_VOICE_ID=voice-id');
  console.log('');
  console.log('2. Install dependencies:');
  console.log('   npm install uuid puppeteer');
  console.log('');
  console.log('3. Compile TypeScript:');
  console.log('   npx tsc');
  console.log('');
  console.log('4. Test with real data via API endpoints');
  console.log('');
}

main().catch(console.error);
