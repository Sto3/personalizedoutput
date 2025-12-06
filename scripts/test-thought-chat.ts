/**
 * Test Thought Chat API
 *
 * Simple test script to verify the chat flow works end-to-end.
 */

import {
  createThoughtSession,
  startThoughtSession,
  continueThoughtSession,
  getThoughtSession
} from '../src/lib/thoughtEngine/chat';

import * as dotenv from 'dotenv';
dotenv.config();

async function testSantaChat() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Testing Santa Message Chat Flow');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Create session
  console.log('1. Creating session...');
  const session = createThoughtSession('santa_message');
  console.log(`   Session ID: ${session.sessionId}\n`);

  // 2. Start session (get opening message)
  console.log('2. Starting session...');
  const startResult = await startThoughtSession(session);
  console.log(`   Guide: ${startResult.assistantMessage}\n`);

  // 3. Simulate conversation
  const userResponses = [
    "My daughter's name is Emma. She's 7 years old.",
    "This year she showed amazing kindness. There was a new girl at school who was eating lunch alone, and Emma walked over and invited her to sit with us. She said 'Nobody should eat alone, that's sad.'",
    "She's also been really brave. She's always been shy but this year she did a solo in the school play. She was so nervous but she did it anyway.",
    "She's kind, brave, and so thoughtful. I want her to know that her kindness makes a real difference in the world, and that being brave even when she's scared is one of the most important things she can do.",
    "Yes, please create Santa's message!"
  ];

  let currentSession = startResult.session;

  for (let i = 0; i < userResponses.length; i++) {
    console.log(`3.${i + 1}. User: "${userResponses[i].substring(0, 50)}..."`);

    const result = await continueThoughtSession(currentSession, userResponses[i]);
    currentSession = result.session;

    console.log(`     Guide: ${result.assistantMessage.substring(0, 100)}...`);
    console.log(`     Status: ${result.session.status}, Can Generate: ${result.canGenerate}\n`);

    if (result.session.status === 'ready_for_generation') {
      console.log('   Session ready for generation!');
      break;
    }
  }

  console.log(`\nFinal session status: ${currentSession.status}`);
  console.log(`Total turns: ${currentSession.turns.length}`);

  return currentSession;
}

async function testHolidayResetChat() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Testing Holiday Reset Chat Flow');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Create session
  console.log('1. Creating session...');
  const session = createThoughtSession('holiday_reset');
  console.log(`   Session ID: ${session.sessionId}\n`);

  // 2. Start session
  console.log('2. Starting session...');
  const startResult = await startThoughtSession(session);
  console.log(`   Guide: ${startResult.assistantMessage}\n`);

  // 3. Quick conversation
  const userResponses = [
    "It's my mother-in-law. Every holiday she makes passive-aggressive comments about how I'm raising my kids.",
    "Last Thanksgiving she said 'I guess some mothers just don't have time to cook real food' when I brought store-bought pie.",
    "I usually just go quiet and then vent to my husband later. It makes me feel small and like I'm never good enough."
  ];

  let currentSession = startResult.session;

  for (const response of userResponses) {
    console.log(`User: "${response.substring(0, 50)}..."`);
    const result = await continueThoughtSession(currentSession, response);
    currentSession = result.session;
    console.log(`Guide: ${result.assistantMessage.substring(0, 80)}...\n`);
  }

  console.log(`Session status: ${currentSession.status}`);
  console.log(`Total turns: ${currentSession.turns.length}`);

  return currentSession;
}

async function main() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ERROR: ANTHROPIC_API_KEY not set');
      process.exit(1);
    }

    // Test Santa chat
    await testSantaChat();

    // Test Holiday Reset chat
    await testHolidayResetChat();

    console.log('\n✅ All tests completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', (error as Error).message);
    console.error(error);
    process.exit(1);
  }
}

main();
