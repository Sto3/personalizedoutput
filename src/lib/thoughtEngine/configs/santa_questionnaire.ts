/**
 * Santa Message - Deep Personalization Questionnaire
 *
 * PHILOSOPHY:
 * - Go DEEP to create messages that make parents emotional
 * - Extract real stories, specific moments, genuine pride
 * - Output should make both parent AND child say "wow"
 * - No pronouns asked - infer from name + gender selection
 * - No "magic" language (respects all beliefs)
 * - Religious references ONLY when explicitly requested (Christian option)
 * - Focus on: kindness, effort, growth, courage, character
 */

// ============================================================
// TYPES
// ============================================================

export interface SantaQuestionnaireInput {
  // SECTION 1: Basic Info
  childFirstName: string;
  childGender: 'boy' | 'girl';  // Used to infer pronouns, not asked directly
  childAge: number;

  // SECTION 2: This Year's Journey (adaptive)
  primaryScenario: SantaScenarioType;

  // SECTION 3: Deep Dive - Proud Moments (2 required)
  proudMoment1: ProudMomentInput;
  proudMoment2: ProudMomentInput;

  // SECTION 4: Character & Growth
  characterTraits: string[];        // What traits has this child shown?
  growthArea: string;               // Where have they grown most?
  challengeOvercome?: string;       // Optional: specific challenge

  // SECTION 5: Parent's Heart
  whatParentWantsReinforced: string;  // What message matters most?
  anythingToAvoid?: string;           // Sensitive topics to skip

  // SECTION 6: Tone & Style
  tonePreference: 'warm_gentle' | 'cheerful' | 'enthusiastic';

  // SECTION 7: Special Options
  includeChristianMessage?: boolean;  // Include faith-based language (optional)
}

export type SantaScenarioType =
  | 'academic_effort'        // Working hard in school
  | 'kindness_to_others'     // Being kind/helpful
  | 'overcoming_challenge'   // Faced something hard
  | 'big_life_change'        // Move, new sibling, divorce, etc.
  | 'building_confidence'    // Coming out of shell
  | 'being_brave'            // Courage in specific situation
  | 'helping_family'         // Stepped up at home
  | 'friendship_growth'      // Social/friendship development
  | 'personal_achievement'   // Accomplished something meaningful
  | 'general_celebration';   // Just celebrate who they are

export interface ProudMomentInput {
  whatHappened: string;           // Describe the moment
  howChildResponded: string;      // What did they do/say?
  whyItMattered: string;          // Why was this meaningful?
  specificDetail?: string;        // One vivid detail that stands out
}

// ============================================================
// QUESTIONNAIRE FLOW
// ============================================================

export const SANTA_QUESTIONNAIRE_FLOW = {
  sections: [
    {
      id: 'basics',
      title: "Let's get started",
      description: "Just a few quick details about your child",
      questions: [
        {
          id: 'childFirstName',
          type: 'text',
          label: "What's your child's first name?",
          placeholder: "First name only",
          required: true
        },
        {
          id: 'childGender',
          type: 'select',
          label: "Is your child a boy or girl?",
          options: [
            { value: 'boy', label: 'Boy' },
            { value: 'girl', label: 'Girl' }
          ],
          required: true,
          note: "This helps Santa use the right words"
        },
        {
          id: 'childAge',
          type: 'number',
          label: "How old are they?",
          min: 2,
          max: 12,
          required: true
        }
      ]
    },
    {
      id: 'scenario',
      title: "What makes this year special?",
      description: "Choose what best describes your child's year",
      questions: [
        {
          id: 'primaryScenario',
          type: 'select',
          label: "This year, my child has...",
          options: [
            { value: 'academic_effort', label: 'Worked really hard in school' },
            { value: 'kindness_to_others', label: 'Shown amazing kindness to others' },
            { value: 'overcoming_challenge', label: 'Overcome a real challenge' },
            { value: 'big_life_change', label: 'Handled a big life change well' },
            { value: 'building_confidence', label: 'Grown more confident' },
            { value: 'being_brave', label: 'Been incredibly brave' },
            { value: 'helping_family', label: 'Stepped up to help our family' },
            { value: 'friendship_growth', label: 'Grown as a friend' },
            { value: 'personal_achievement', label: 'Achieved something meaningful' },
            { value: 'general_celebration', label: 'Just been wonderful (celebrate who they are!)' }
          ],
          required: true
        }
      ]
    },
    {
      id: 'proud_moment_1',
      title: "First Proud Moment",
      description: "Think of a specific time this year when you felt truly proud of your child. The more specific, the more personal Santa's message will be.",
      questions: [
        {
          id: 'proudMoment1.whatHappened',
          type: 'textarea',
          label: "What happened?",
          placeholder: "Describe the situation... (e.g., 'There was a new kid at school who was eating lunch alone...')",
          required: true,
          minLength: 50
        },
        {
          id: 'proudMoment1.howChildResponded',
          type: 'textarea',
          label: "What did your child do?",
          placeholder: "What did they say or do? (e.g., 'She walked over and invited him to sit with her, even though her friends didn't...')",
          required: true,
          minLength: 30
        },
        {
          id: 'proudMoment1.whyItMattered',
          type: 'textarea',
          label: "Why did this moment matter to you?",
          placeholder: "What did it show you about who they are? (e.g., 'It showed me she has real courage to do what's right...')",
          required: true,
          minLength: 30
        },
        {
          id: 'proudMoment1.specificDetail',
          type: 'text',
          label: "One small detail that stands out (optional)",
          placeholder: "A quote, expression, or tiny moment you remember",
          required: false
        }
      ]
    },
    {
      id: 'proud_moment_2',
      title: "Second Proud Moment",
      description: "Let's capture another moment. This could be big or small - sometimes the little moments say the most.",
      questions: [
        {
          id: 'proudMoment2.whatHappened',
          type: 'textarea',
          label: "What happened?",
          placeholder: "Describe another time you felt proud...",
          required: true,
          minLength: 50
        },
        {
          id: 'proudMoment2.howChildResponded',
          type: 'textarea',
          label: "What did your child do?",
          placeholder: "Their actions or words...",
          required: true,
          minLength: 30
        },
        {
          id: 'proudMoment2.whyItMattered',
          type: 'textarea',
          label: "Why did this moment matter?",
          placeholder: "What it showed you about them...",
          required: true,
          minLength: 30
        },
        {
          id: 'proudMoment2.specificDetail',
          type: 'text',
          label: "One small detail that stands out (optional)",
          placeholder: "Something vivid you remember",
          required: false
        }
      ]
    },
    {
      id: 'character',
      title: "Who They Are",
      description: "Help Santa really see your child",
      questions: [
        {
          id: 'characterTraits',
          type: 'multiselect',
          label: "Which words describe your child? (Pick 2-4)",
          options: [
            { value: 'kind', label: 'Kind' },
            { value: 'brave', label: 'Brave' },
            { value: 'curious', label: 'Curious' },
            { value: 'hardworking', label: 'Hardworking' },
            { value: 'creative', label: 'Creative' },
            { value: 'caring', label: 'Caring' },
            { value: 'funny', label: 'Funny' },
            { value: 'determined', label: 'Determined' },
            { value: 'thoughtful', label: 'Thoughtful' },
            { value: 'helpful', label: 'Helpful' },
            { value: 'patient', label: 'Patient' },
            { value: 'resilient', label: 'Resilient' }
          ],
          required: true,
          min: 2,
          max: 4
        },
        {
          id: 'growthArea',
          type: 'textarea',
          label: "Where have you seen them grow the most this year?",
          placeholder: "This could be emotional, social, academic, or personal...",
          required: true,
          minLength: 30
        },
        {
          id: 'challengeOvercome',
          type: 'textarea',
          label: "Is there a specific challenge they've worked through? (optional)",
          placeholder: "Something they struggled with but kept trying...",
          required: false
        }
      ]
    },
    {
      id: 'parents_heart',
      title: "From Your Heart",
      description: "This is the most important part",
      questions: [
        {
          id: 'whatParentWantsReinforced',
          type: 'textarea',
          label: "What do you most want Santa to tell your child?",
          placeholder: "What message do you want them to carry with them? What do you wish they knew about themselves?",
          required: true,
          minLength: 50,
          helpText: "This will be woven into Santa's message in his own words"
        },
        {
          id: 'anythingToAvoid',
          type: 'textarea',
          label: "Is there anything Santa should NOT mention? (optional)",
          placeholder: "Any sensitive topics, recent events, or things that might upset them",
          required: false
        }
      ]
    },
    {
      id: 'tone',
      title: "Almost done!",
      description: "How should Santa sound?",
      questions: [
        {
          id: 'tonePreference',
          type: 'select',
          label: "What tone fits your child best?",
          options: [
            { value: 'warm_gentle', label: 'Warm & Gentle - Soft, comforting, like a hug' },
            { value: 'cheerful', label: 'Cheerful - Classic jolly Santa, balanced warmth' },
            { value: 'enthusiastic', label: 'Enthusiastic - Excited, high energy celebration' }
          ],
          required: true
        },
        {
          id: 'includeChristianMessage',
          type: 'boolean',
          label: "Would you like Santa to include a Christian message?",
          options: [
            { value: false, label: 'No, keep it secular (default)' },
            { value: true, label: 'Yes, include faith-based language' }
          ],
          required: false,
          helpText: "If selected, Santa may reference the true meaning of Christmas, Jesus, or blessings. Otherwise, the message focuses on character, kindness, and family values."
        }
      ]
    }
  ]
};

// ============================================================
// PRONOUN INFERENCE
// ============================================================

export function inferPronouns(gender: 'boy' | 'girl'): {
  subject: string;
  object: string;
  possessive: string;
  child: string;
} {
  if (gender === 'boy') {
    return { subject: 'he', object: 'him', possessive: 'his', child: 'boy' };
  } else {
    return { subject: 'she', object: 'her', possessive: 'her', child: 'girl' };
  }
}

// ============================================================
// SCENARIO DESCRIPTIONS (for prompt building)
// ============================================================

export const SCENARIO_CONTEXTS: Record<SantaScenarioType, string> = {
  academic_effort: "This child has shown remarkable dedication to their schoolwork. Focus on effort and persistence, not grades.",
  kindness_to_others: "This child has demonstrated genuine kindness. Highlight how their compassion makes the world better.",
  overcoming_challenge: "This child faced something difficult and pushed through. Acknowledge their strength without dwelling on the hardship.",
  big_life_change: "This child has navigated a significant life transition. Validate their feelings and praise their adaptability.",
  building_confidence: "This child has grown more confident. Celebrate their courage to try new things and come out of their shell.",
  being_brave: "This child showed real bravery. Honor their courage while keeping the tone supportive, not pressure-inducing.",
  helping_family: "This child stepped up to help their family. Recognize their selflessness and maturity.",
  friendship_growth: "This child has grown in how they relate to others. Celebrate their social and emotional development.",
  personal_achievement: "This child accomplished something meaningful to them. Focus on their journey, not just the outcome.",
  general_celebration: "Celebrate this child for who they are. Draw from the proud moments to paint a picture of their wonderful qualities."
};

// ============================================================
// VALIDATION
// ============================================================

export function validateSantaInput(input: Partial<SantaQuestionnaireInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.childFirstName?.trim()) {
    errors.push("Child's first name is required");
  }

  if (!input.childGender) {
    errors.push("Please select boy or girl");
  }

  if (!input.childAge || input.childAge < 2 || input.childAge > 12) {
    errors.push("Age must be between 2 and 12");
  }

  if (!input.primaryScenario) {
    errors.push("Please select what makes this year special");
  }

  if (!input.proudMoment1?.whatHappened || input.proudMoment1.whatHappened.length < 50) {
    errors.push("First proud moment needs more detail (at least 50 characters)");
  }

  if (!input.proudMoment2?.whatHappened || input.proudMoment2.whatHappened.length < 50) {
    errors.push("Second proud moment needs more detail (at least 50 characters)");
  }

  if (!input.characterTraits || input.characterTraits.length < 2) {
    errors.push("Please select at least 2 character traits");
  }

  if (!input.whatParentWantsReinforced || input.whatParentWantsReinforced.length < 50) {
    errors.push("Please share what you want Santa to tell your child (at least 50 characters)");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
