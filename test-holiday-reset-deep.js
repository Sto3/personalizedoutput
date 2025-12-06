/**
 * Test Holiday Relationship Reset - Deep Personalization
 *
 * Demonstrates the deeply personalized planner flow.
 */

require('dotenv').config();

// Deep personalization input - simulates what the questionnaire collects
const deepInput = {
  primaryRelationship: 'parent_mother',
  holidayContext: 'setting_new_boundaries',

  coreTension: {
    withWhom: 'My mother',
    whatItLooksLike: "She criticizes everything - my parenting, my house, my career choices. Every visit turns into a running commentary about how I could be doing better. If I cook dinner, the chicken is dry. If the kids watch TV, I'm not engaging them enough. She sighs loudly and I know exactly what it means.",
    specificExample: "Last month, she came over for my daughter's birthday party. Within 20 minutes, she'd rearranged my living room furniture 'so people could move around better,' told my husband the grill wasn't hot enough, and commented that my daughter's dress was 'certainly colorful.' When I asked her to stop, she got teary and said she was 'just trying to help' and that I 'take everything so personally.'",
    whatYouUsuallyDo: "I go quiet. I swallow it and change the subject. Later I vent to my husband for an hour. Sometimes I snap and then feel terrible about it for days. I've tried having calm conversations but she cries and I end up comforting her.",
    howItMakesYouFeel: "Exhausted. Small. Like I'm 15 again and nothing I do will ever be good enough. Guilty for being annoyed by my own mother. Angry that she can't just let things be. Sad that this is our relationship.",
    whatYouWishYouCouldSay: "I wish I could say: 'Mom, I need you to trust that I'm doing okay. I'm not asking for your help because I don't need fixing. I need you to just be proud of me, even if you'd do things differently. Your criticism hurts, even when you mean well.'",
    underlyingNeed: "I need to feel respected as an adult and a parent. I need her approval but I'm starting to realize I may never get it the way I want."
  },

  pastHolidayPattern: "The pattern is always the same: She arrives, she takes over. She comments on the food, the decorations, how tired the kids look. My dad retreats to the TV. I spend the whole holiday managing her feelings and apologizing to my husband later. By Christmas night, I'm completely drained and relieved it's over.",

  lastYearSpecific: "Last Christmas was the worst. She reorganized my entire pantry while I was putting the kids to bed. When I came down and saw it, I burst into tears. She said she was being helpful because my system 'didn't make sense.' My husband and I had a huge fight because he said I needed to stand up to her and I felt like he didn't understand how hard that is.",

  whatYouTriedBefore: "I've tried: having a calm conversation before she arrives about expectations (she agreed and nothing changed), limiting visit time (she got hurt and called my sister to complain), having my husband intervene (made it worse), going to therapy myself (helpful for me, but doesn't change her behavior).",

  whyItDidntWork: "She genuinely believes she's being helpful. She doesn't see criticism, she sees 'suggestions.' When I push back, she becomes the victim and I become the ungrateful daughter. It's exhausting to be the bad guy.",

  biggestFear: "I'm afraid this Christmas will blow up. That I'll finally snap and say something I can't take back. That my kids will see me and their grandmother fighting. That my husband will lose his patience. That we'll ruin the holiday for everyone.",

  secretHope: "I hope she'll just once walk in and say 'everything looks beautiful, you're doing such a good job.' I hope she'll play with the kids without correcting how they play. I hope I can feel relaxed in my own home while she's there.",

  whatPeaceLooksLike: "Peace would be: she arrives, we hug, and she sits down and just... enjoys being here. No rearranging. No comments. Just presence. I know that's probably unrealistic. Realistically, peace would be me feeling okay even when she does comment. Not taking it personally. Letting it roll off. That's probably the peace I need to find.",

  guiltyAbout: "I feel guilty that I dread her visits. She's my mother. She's getting older. She won't be here forever. What if I look back and wish I'd been more patient? What if my kids grow up thinking I didn't like their grandmother?",

  constraints: [
    { type: 'logistics', description: "She's staying with us for 4 days (Dec 23-26). Separate accommodation isn't realistic - she'd be devastated." },
    { type: 'energy', description: "I'm already exhausted from work and the holidays. I have nothing extra to give." },
    { type: 'other', description: "My dad comes too and he just wants everyone to get along. If I set boundaries, he looks sad and that kills me." }
  ],

  nonNegotiables: [
    "My kids should have a happy Christmas morning without tension they can sense",
    "I will not apologize for how I run my household",
    "I need at least 30 minutes of alone time each day"
  ],

  flexibleAreas: [
    "She can help with cooking if she wants to - I just need her to not criticize how I do it",
    "I can let go of small comments if the big ones stop",
    "The schedule can be somewhat flexible if it reduces tension"
  ],

  whatYouNeedToHear: "I need someone to tell me that it's okay to protect my peace even if it disappoints her. That I'm not a bad daughter for having boundaries. That wanting to enjoy my own holiday in my own home is not selfish.",

  whatYouNeedPermissionFor: "I need permission to not fix everything. To let some moments be uncomfortable without rushing to smooth them over. To be okay with her being upset if that's what setting a boundary causes.",

  boundaryYouWantToSet: "I want to be able to say: 'Mom, I'm not asking for input right now. I've got this.' And have it be enough. And not have to deal with the fallout for days after.",

  tonePreference: 'balanced',
  spiritualLanguageOk: false
};

async function generatePlanner() {
  console.log('='.repeat(70));
  console.log('HOLIDAY RELATIONSHIP RESET - DEEP PERSONALIZATION TEST');
  console.log('='.repeat(70));
  console.log('');
  console.log('Primary Relationship: Parent (Mother)');
  console.log('Holiday Context: Setting New Boundaries');
  console.log('');
  console.log('Core Tension With: My mother');
  console.log('');
  console.log('Key Themes:');
  console.log('- Constant criticism disguised as "help"');
  console.log('- Feeling small and never good enough');
  console.log('- Pattern of swallowing feelings then exploding');
  console.log('- Fear of confrontation ruining Christmas');
  console.log('');
  console.log('-'.repeat(70));

  // For now, we'll just build and display the prompt
  // In production, this would call the full generator

  const fs = require('fs');
  const path = require('path');

  // Load template
  const templatePath = path.join(__dirname, 'src/lib/thoughtEngine/prompts/holiday_relationship_reset_deep.txt');
  let template = fs.readFileSync(templatePath, 'utf-8');

  // Simple replacement for demo
  const RELATIONSHIP_CONTEXTS = {
    parent_mother: "navigating a challenging relationship with their mother"
  };
  const HOLIDAY_CONTEXTS = {
    setting_new_boundaries: "trying to establish healthier boundaries"
  };

  template = template
    .replace(/\{\{firstName\}\}/g, 'Friend')
    .replace(/\{\{primaryRelationship\}\}/g, RELATIONSHIP_CONTEXTS[deepInput.primaryRelationship])
    .replace(/\{\{holidayContext\}\}/g, HOLIDAY_CONTEXTS[deepInput.holidayContext])
    .replace(/\{\{coreTension\.withWhom\}\}/g, deepInput.coreTension.withWhom)
    .replace(/\{\{coreTension\.whatItLooksLike\}\}/g, deepInput.coreTension.whatItLooksLike)
    .replace(/\{\{coreTension\.specificExample\}\}/g, deepInput.coreTension.specificExample)
    .replace(/\{\{coreTension\.whatYouUsuallyDo\}\}/g, deepInput.coreTension.whatYouUsuallyDo)
    .replace(/\{\{coreTension\.howItMakesYouFeel\}\}/g, deepInput.coreTension.howItMakesYouFeel)
    .replace(/\{\{coreTension\.whatYouWishYouCouldSay\}\}/g, deepInput.coreTension.whatYouWishYouCouldSay)
    .replace(/\{\{pastHolidayPattern\}\}/g, deepInput.pastHolidayPattern)
    .replace(/\{\{lastYearSpecific\}\}/g, deepInput.lastYearSpecific)
    .replace(/\{\{whatYouTriedBefore\}\}/g, deepInput.whatYouTriedBefore)
    .replace(/\{\{biggestFear\}\}/g, deepInput.biggestFear)
    .replace(/\{\{secretHope\}\}/g, deepInput.secretHope)
    .replace(/\{\{whatPeaceLooksLike\}\}/g, deepInput.whatPeaceLooksLike)
    .replace(/\{\{whatYouNeedToHear\}\}/g, deepInput.whatYouNeedToHear)
    .replace(/\{\{tonePreference\}\}/g, deepInput.tonePreference);

  console.log('PROMPT GENERATED SUCCESSFULLY');
  console.log(`Prompt length: ${template.length} characters`);
  console.log('');

  // Now call the LLM
  console.log('[1/1] Generating personalized planner...');
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
        max_tokens: 6000,
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
      console.log('GENERATED PLANNER SECTIONS:');
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
