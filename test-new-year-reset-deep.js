/**
 * Test New Year Reflection Reset - Deep Personalization
 *
 * Demonstrates the deeply personalized planner flow.
 */

require('dotenv').config();

// Deep personalization input - simulates what the questionnaire collects
const deepInput = {
  firstName: 'Sarah',

  yearOverview: {
    threeWordsToDescribe: ['transformative', 'challenging', 'awakening'],
    biggestAccomplishment: "I left a job that was slowly crushing my soul. After 8 years of telling myself 'next year will be better,' I finally walked away. I did it without another job lined up, which terrified me, but I knew I couldn't give that place one more year of my life. I'm now 4 months into a new role that actually energizes me.",
    biggestChallenge: "The fear. The absolute terror of leaving something stable, even if it was killing me. Also the identity crisis - I'd been 'the marketing director at TechCorp' for so long that I didn't know who I was without that title. The first month after leaving, I felt lost.",
    unexpectedJoy: "My daughter, who's 14 and usually thinks I'm embarrassing, told me she was proud of me for leaving. She said 'Mom, you always tell me to be brave, and now you actually are.' I cried for an hour. That moment changed everything.",
    unexpectedLoss: "My dad was diagnosed with early-stage Parkinson's in March. He's doing okay, but it changed something in me. Time feels different now. More precious and more terrifying."
  },

  significantMoment1: {
    whatHappened: "The day I handed in my resignation. I'd written the letter a dozen times over the years but never submitted it. That morning, I just knew. I walked into my boss's office at 9am before I could talk myself out of it. My hands were shaking so hard I could barely hold the paper.",
    whyItMattered: "It was the first time in my adult life I chose myself over stability, over what looked good, over what was 'sensible.' I'd spent 40 years being the responsible one, and this was the most irresponsible, wonderful thing I'd ever done.",
    howItChangedYou: "I learned I'm braver than I thought. I learned that the fear doesn't go away - you just walk through it anyway. I learned that my daughter is watching, and that matters more than I realized.",
    whatYouWantToRemember: "The feeling of walking out of that building for the last time. Light. Like I'd put down something heavy I'd been carrying for years. I want to remember what it feels like to choose myself."
  },

  significantMoment2: {
    whatHappened: "A conversation with my dad, about two weeks after his diagnosis. We were sitting on his porch and he said, 'Sarah, I wasted a lot of years being afraid. Don't do that.' Then he told me about dreams he'd had that he never chased. We talked for three hours. It was the most honest conversation we'd ever had.",
    whyItMattered: "I saw my own potential future - the regrets I could accumulate if I didn't change something. And I saw that my dad trusted me enough to be vulnerable. We'd never had that before.",
    howItChangedYou: "It made the job decision clearer. It made me think about what I want the next 40 years to look like. It changed how I relate to time - less infinite, more intentional.",
    whatYouWantToRemember: "His exact words: 'Don't let fear be louder than your life.' I wrote it down immediately so I wouldn't forget."
  },

  difficultMoment: {
    whatHappened: "The month between leaving my job and starting the new one. I had no structure, no purpose, no daily proof that I mattered. I slept badly. I questioned everything. I started to wonder if I'd made the biggest mistake of my life.",
    howYouGotThrough: "My husband. He didn't try to fix it or reassure me too much. He just kept saying 'This is the messy middle. You're allowed to be here.' I also started writing every morning - just stream of consciousness. It helped me hear my own thoughts instead of just the fear.",
    whatYouLearned: "I learned that I'm addicted to productivity and external validation. Without a job telling me I was valuable, I didn't know how to feel valuable. That's something I'm still working on.",
    stillProcessing: "The identity question. Who am I when I'm not achieving something? I don't fully know yet. I'm getting more comfortable with not knowing."
  },

  surprisedYou: "I was surprised by how much anger came up once I left. Years of swallowed frustration just... surfaced. I realized I'd been numb for longer than I knew. The anger was actually a sign I was coming back to life.",

  strengthDiscovered: "I'm more resilient than I thought. I can sit with uncertainty and not fall apart. I thought I needed control to function, but it turns out I just needed to trust myself.",

  patternNoticed: "I notice that I over-function when I'm anxious. When things feel out of control, I clean, organize, plan, DO. It's a way of avoiding actually feeling things. This year I've been trying to catch myself and just... stop. Feel the feeling.",

  relationshipInsight: "I learned that my husband has been waiting for me to come back. He said he felt like he'd lost me to that job years ago. We're reconnecting in ways I didn't know we could.",

  letGoOf: "The idea that I have to earn my worth. The belief that rest is laziness. The fear of what people think of my 'impractical' choices.",

  forgiveYourself: "I need to forgive myself for the years I stayed. For the dinners I missed because I was 'just finishing one more thing.' For the version of me my daughter got during those years - the tired, distracted, snappy version.",

  conversationNeeded: "I need to talk to my mom about her expectations for me. She's never said it outright, but I've always felt like I was supposed to be successful in a very specific way. I need to tell her that my definition of success is changing.",

  unfinishedProject: "I started writing a book about career transitions three years ago. I have 40 pages. I keep saying I'll get back to it. Maybe this year.",

  oneWordForNextYear: 'Presence',

  feelingYouWant: "I want to feel present. Like I'm actually in my life, not just getting through it. I want to feel unhurried. I want to laugh more easily. I want to feel like myself, not a performance of myself.",

  nonNegotiableChange: "I will not work evenings and weekends as a default. I will not sacrifice my family for a job again. This is the line I'm drawing, and I will not cross it.",

  secretDream: "I want to write that book. Actually finish it. And maybe even publish it. I've never said that out loud because it sounds so presumptuous. Who am I to write a book? But I want to.",

  healthIntention: "Be in my body more. Less in my head. That means moving it - walking, yoga, dancing in the kitchen. Not for weight loss. For presence.",
  relationshipIntention: "Date my husband again. Like really date. Surprise him. Be interested instead of interesting.",
  careerIntention: "Do good work without it becoming my identity. Remember: I have a career. I am not my career.",
  personalIntention: "Finish the book. Even if it's terrible. Even if no one reads it. Finish it.",

  whatMightGetInWay: "My perfectionism. The voice that says nothing I do is good enough. Also: the comfort of old patterns. It's easier to over-work than to feel uncertain.",

  supportNeeded: "I need my husband to keep being patient as I figure this out. I need time carved out for writing - that means saying no to other things. I need to give myself permission to be a beginner again.",

  tonePreference: 'reflective',
  includeQuarterlyBreakdown: true
};

async function generatePlanner() {
  console.log('='.repeat(70));
  console.log('NEW YEAR REFLECTION RESET - DEEP PERSONALIZATION TEST');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Name: ${deepInput.firstName}`);
  console.log(`Three Words for 2024: ${deepInput.yearOverview.threeWordsToDescribe.join(', ')}`);
  console.log(`Word for 2025: ${deepInput.oneWordForNextYear}`);
  console.log('');
  console.log('Key Themes:');
  console.log('- Left soul-crushing job after 8 years');
  console.log('- Dad\'s Parkinson\'s diagnosis');
  console.log('- Daughter\'s pride in her bravery');
  console.log('- Learning to be present vs. productive');
  console.log('- Secret dream: Finish and publish a book');
  console.log('');
  console.log('-'.repeat(70));

  const fs = require('fs');
  const path = require('path');

  // Load template
  const templatePath = path.join(__dirname, 'src/lib/thoughtEngine/prompts/new_year_reflection_reset_deep.txt');
  let template = fs.readFileSync(templatePath, 'utf-8');

  // Replace placeholders (simplified for test)
  template = template
    .replace(/\{\{firstName\}\}/g, deepInput.firstName)
    .replace(/\{\{oneWordForNextYear\}\}/g, deepInput.oneWordForNextYear)
    .replace(/\{\{oneWordForNextYear \| uppercase\}\}/g, deepInput.oneWordForNextYear.toUpperCase())
    .replace(/\{\{yearOverview\.threeWordsToDescribe\.\[0\]\}\}/g, deepInput.yearOverview.threeWordsToDescribe[0])
    .replace(/\{\{yearOverview\.threeWordsToDescribe\.\[1\]\}\}/g, deepInput.yearOverview.threeWordsToDescribe[1])
    .replace(/\{\{yearOverview\.threeWordsToDescribe\.\[2\]\}\}/g, deepInput.yearOverview.threeWordsToDescribe[2])
    .replace(/\{\{yearOverview\.threeWordsToDescribe\}\}/g, deepInput.yearOverview.threeWordsToDescribe.join(', '))
    .replace(/\{\{yearOverview\.biggestAccomplishment\}\}/g, deepInput.yearOverview.biggestAccomplishment)
    .replace(/\{\{yearOverview\.biggestChallenge\}\}/g, deepInput.yearOverview.biggestChallenge)
    .replace(/\{\{yearOverview\.unexpectedJoy\}\}/g, deepInput.yearOverview.unexpectedJoy)
    .replace(/\{\{significantMoment1\.whatHappened\}\}/g, deepInput.significantMoment1.whatHappened)
    .replace(/\{\{significantMoment1\.whyItMattered\}\}/g, deepInput.significantMoment1.whyItMattered)
    .replace(/\{\{significantMoment1\.howItChangedYou\}\}/g, deepInput.significantMoment1.howItChangedYou)
    .replace(/\{\{significantMoment1\.whatYouWantToRemember\}\}/g, deepInput.significantMoment1.whatYouWantToRemember)
    .replace(/\{\{significantMoment2\.whatHappened\}\}/g, deepInput.significantMoment2.whatHappened)
    .replace(/\{\{significantMoment2\.whyItMattered\}\}/g, deepInput.significantMoment2.whyItMattered)
    .replace(/\{\{significantMoment2\.howItChangedYou\}\}/g, deepInput.significantMoment2.howItChangedYou)
    .replace(/\{\{significantMoment2\.whatYouWantToRemember\}\}/g, deepInput.significantMoment2.whatYouWantToRemember)
    .replace(/\{\{surprisedYou\}\}/g, deepInput.surprisedYou)
    .replace(/\{\{strengthDiscovered\}\}/g, deepInput.strengthDiscovered)
    .replace(/\{\{patternNoticed\}\}/g, deepInput.patternNoticed)
    .replace(/\{\{letGoOf\}\}/g, deepInput.letGoOf)
    .replace(/\{\{feelingYouWant\}\}/g, deepInput.feelingYouWant)
    .replace(/\{\{nonNegotiableChange\}\}/g, deepInput.nonNegotiableChange)
    .replace(/\{\{whatMightGetInWay\}\}/g, deepInput.whatMightGetInWay)
    .replace(/\{\{supportNeeded\}\}/g, deepInput.supportNeeded)
    .replace(/\{\{tonePreference\}\}/g, deepInput.tonePreference);

  // Handle optional sections
  if (deepInput.yearOverview.unexpectedLoss) {
    template = template.replace(
      /\{\{#if yearOverview\.unexpectedLoss\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{yearOverview\.unexpectedLoss\}\}/g, deepInput.yearOverview.unexpectedLoss)
    );
  }

  if (deepInput.difficultMoment) {
    template = template.replace(
      /\{\{#if difficultMoment\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, content) => {
        return content
          .replace(/\{\{difficultMoment\.whatHappened\}\}/g, deepInput.difficultMoment.whatHappened)
          .replace(/\{\{difficultMoment\.howYouGotThrough\}\}/g, deepInput.difficultMoment.howYouGotThrough)
          .replace(/\{\{difficultMoment\.whatYouLearned\}\}/g, deepInput.difficultMoment.whatYouLearned);
      }
    );
  }

  if (deepInput.relationshipInsight) {
    template = template.replace(
      /\{\{#if relationshipInsight\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{relationshipInsight\}\}/g, deepInput.relationshipInsight)
    );
  }

  if (deepInput.forgiveYourself) {
    template = template.replace(
      /\{\{#if forgiveYourself\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{forgiveYourself\}\}/g, deepInput.forgiveYourself)
    );
  }

  if (deepInput.conversationNeeded) {
    template = template.replace(
      /\{\{#if conversationNeeded\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{conversationNeeded\}\}/g, deepInput.conversationNeeded)
    );
  }

  if (deepInput.unfinishedProject) {
    template = template.replace(
      /\{\{#if unfinishedProject\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{unfinishedProject\}\}/g, deepInput.unfinishedProject)
    );
  }

  if (deepInput.secretDream) {
    template = template.replace(
      /\{\{#if secretDream\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `$1`.replace(/\{\{secretDream\}\}/g, deepInput.secretDream)
    );
  }

  // Handle intentions
  if (deepInput.healthIntention) {
    template = template.replace(/\{\{#if healthIntention\}\}.*?\{\{healthIntention\}\}.*?\{\{\/if\}\}/gs,
      `Health: "${deepInput.healthIntention}"`);
  }
  if (deepInput.relationshipIntention) {
    template = template.replace(/\{\{#if relationshipIntention\}\}.*?\{\{relationshipIntention\}\}.*?\{\{\/if\}\}/gs,
      `Relationships: "${deepInput.relationshipIntention}"`);
  }
  if (deepInput.careerIntention) {
    template = template.replace(/\{\{#if careerIntention\}\}.*?\{\{careerIntention\}\}.*?\{\{\/if\}\}/gs,
      `Work/Purpose: "${deepInput.careerIntention}"`);
  }
  if (deepInput.personalIntention) {
    template = template.replace(/\{\{#if personalIntention\}\}.*?\{\{personalIntention\}\}.*?\{\{\/if\}\}/gs,
      `Personal: "${deepInput.personalIntention}"`);
  }

  // Quarterly breakdown
  if (deepInput.includeQuarterlyBreakdown) {
    template = template.replace(
      /\{\{#if includeQuarterlyBreakdown\}\}([\s\S]*?)\{\{\/if\}\}/g,
      '$1'
    );
  }

  console.log('PROMPT GENERATED SUCCESSFULLY');
  console.log(`Prompt length: ${template.length} characters`);
  console.log('');

  console.log('[1/1] Generating personalized reflection planner...');
  console.log('');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY not set');
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: template }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      console.log('='.repeat(70));
      console.log(`${deepInput.firstName.toUpperCase()}'S 2025 REFLECTION & RESET PLANNER`);
      console.log('='.repeat(70));
      console.log('');

      for (const section of parsed.sections) {
        console.log('---');
        console.log(`## ${section.title}`);
        console.log('---');
        console.log(section.content);
        console.log('');
      }
    } else {
      console.log('Raw response:');
      console.log(text);
    }

    console.log('='.repeat(70));
    console.log('SUCCESS! Deep personalization working.');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('Error generating planner:', error.message);
  }
}

generatePlanner().catch(console.error);
