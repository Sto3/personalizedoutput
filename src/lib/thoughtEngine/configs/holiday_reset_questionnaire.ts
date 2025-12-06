/**
 * Holiday Relationship Reset - Deep Personalization Questionnaire
 *
 * PHILOSOPHY:
 * - This is a ~20 minute IMMERSIVE experience, not a quick form
 * - Go DEEP to help users organize thoughts they haven't articulated
 * - Extract real tensions, specific moments, genuine fears
 * - Output should make users feel "finally, someone understands"
 * - No therapy language, no prescriptions - organize, mirror, clarify
 */

// ============================================================
// TYPES
// ============================================================

export interface HolidayResetQuestionnaireInput {
  // SECTION 1: The Landscape
  primaryRelationship: RelationshipType;
  secondaryRelationships?: RelationshipType[];
  holidayContext: HolidayContextType;

  // SECTION 2: What's Really Going On (Deep Dive)
  coreTension: TensionDeepDive;
  secondaryTension?: TensionDeepDive;

  // SECTION 3: The History
  pastHolidayPattern: string;          // What usually happens?
  lastYearSpecific: string;            // What happened last year specifically?
  whatYouTriedBefore: string;          // What have you tried?
  whyItDidntWork?: string;             // Why didn't it work?

  // SECTION 4: Your Inner World
  biggestFear: string;                 // What are you most afraid will happen?
  secretHope: string;                  // What do you secretly hope for?
  whatPeaceLooksLike: string;          // Describe your ideal scenario
  guiltyAbout?: string;                // What do you feel guilty about?

  // SECTION 5: Practical Reality
  constraints: ConstraintInput[];
  nonNegotiables: string[];            // What MUST happen no matter what?
  flexibleAreas: string[];             // Where do you have wiggle room?

  // SECTION 6: Your Needs
  whatYouNeedToHear: string;           // What do you need someone to tell you?
  whatYouNeedPermissionFor?: string;   // What do you need permission to do/feel?
  boundaryYouWantToSet?: string;       // A boundary you've been afraid to set

  // SECTION 7: Preferences
  tonePreference: 'gentle' | 'direct' | 'balanced';
  spiritualLanguageOk: boolean;
}

export type RelationshipType =
  | 'parent_mother'
  | 'parent_father'
  | 'parent_both'
  | 'in_laws'
  | 'partner_spouse'
  | 'sibling'
  | 'extended_family'
  | 'blended_family'
  | 'estranged_family'
  | 'chosen_family';

export type HolidayContextType =
  | 'first_holiday_after_loss'
  | 'first_holiday_after_divorce'
  | 'first_holiday_with_new_partner'
  | 'first_holiday_with_baby'
  | 'navigating_divided_time'
  | 'hosting_stress'
  | 'traveling_stress'
  | 'financial_pressure'
  | 'family_conflict_ongoing'
  | 'setting_new_boundaries'
  | 'general_overwhelm';

export interface TensionDeepDive {
  withWhom: string;                    // Who is this tension with?
  whatItLooksLike: string;             // What does this tension look like in action?
  specificExample: string;             // Describe a specific recent incident
  whatYouUsuallyDo: string;            // How do you typically respond?
  howItMakesYouFeel: string;           // The emotional impact
  whatYouWishYouCouldSay: string;      // What you've never said but want to
  underlyingNeed?: string;             // What need isn't being met?
}

export interface ConstraintInput {
  type: 'time' | 'money' | 'energy' | 'logistics' | 'other';
  description: string;
}

// ============================================================
// QUESTIONNAIRE FLOW
// ============================================================

export const HOLIDAY_RESET_QUESTIONNAIRE_FLOW = {
  estimatedTime: '20-25 minutes',
  sections: [
    {
      id: 'landscape',
      title: "Let's Start With the Landscape",
      description: "Help me understand who's involved and what you're navigating",
      questions: [
        {
          id: 'primaryRelationship',
          type: 'select',
          label: "Which relationship feels most challenging right now?",
          options: [
            { value: 'parent_mother', label: 'My mother' },
            { value: 'parent_father', label: 'My father' },
            { value: 'parent_both', label: 'Both parents' },
            { value: 'in_laws', label: 'In-laws' },
            { value: 'partner_spouse', label: 'Partner/Spouse' },
            { value: 'sibling', label: 'Sibling(s)' },
            { value: 'extended_family', label: 'Extended family' },
            { value: 'blended_family', label: 'Blended family dynamics' },
            { value: 'estranged_family', label: 'Estranged family member' },
            { value: 'chosen_family', label: 'Chosen family / friends' }
          ],
          required: true
        },
        {
          id: 'holidayContext',
          type: 'select',
          label: "What makes this holiday season particularly significant?",
          options: [
            { value: 'first_holiday_after_loss', label: 'First holiday after a loss' },
            { value: 'first_holiday_after_divorce', label: 'First holiday after divorce/separation' },
            { value: 'first_holiday_with_new_partner', label: 'First holiday with a new partner' },
            { value: 'first_holiday_with_baby', label: 'First holiday with a new baby' },
            { value: 'navigating_divided_time', label: 'Navigating divided time between families' },
            { value: 'hosting_stress', label: 'Hosting stress' },
            { value: 'traveling_stress', label: 'Travel logistics stress' },
            { value: 'financial_pressure', label: 'Financial pressure' },
            { value: 'family_conflict_ongoing', label: 'Ongoing family conflict' },
            { value: 'setting_new_boundaries', label: 'Trying to set new boundaries' },
            { value: 'general_overwhelm', label: 'General overwhelm (multiple things)' }
          ],
          required: true
        }
      ]
    },
    {
      id: 'core_tension',
      title: "The Core Tension",
      description: "Let's go deeper into what's really going on. Take your time here.",
      questions: [
        {
          id: 'coreTension.withWhom',
          type: 'text',
          label: "Who is this tension primarily with?",
          placeholder: "e.g., My mother, My mother-in-law, My sister",
          required: true
        },
        {
          id: 'coreTension.whatItLooksLike',
          type: 'textarea',
          label: "What does this tension actually look like in practice?",
          placeholder: "Describe what happens... the comments, the dynamics, the patterns...",
          required: true,
          minLength: 100
        },
        {
          id: 'coreTension.specificExample',
          type: 'textarea',
          label: "Describe a specific recent example",
          placeholder: "Think of a specific moment in the last few months. What happened? What was said? How did it unfold?",
          required: true,
          minLength: 100,
          helpText: "The more specific you are, the more personalized your plan will be"
        },
        {
          id: 'coreTension.whatYouUsuallyDo',
          type: 'textarea',
          label: "How do you typically respond in these moments?",
          placeholder: "Do you go quiet? Snap back? Change the subject? Over-explain? People please?",
          required: true,
          minLength: 50
        },
        {
          id: 'coreTension.howItMakesYouFeel',
          type: 'textarea',
          label: "How does this make you feel? (Be honest - no one's judging)",
          placeholder: "Angry? Sad? Exhausted? Small? Invisible? Guilty? Resentful? All of the above?",
          required: true,
          minLength: 50
        },
        {
          id: 'coreTension.whatYouWishYouCouldSay',
          type: 'textarea',
          label: "What do you wish you could say that you've never said?",
          placeholder: "If you could speak with complete honesty and no consequences, what would you say?",
          required: true,
          minLength: 50
        },
        {
          id: 'coreTension.underlyingNeed',
          type: 'textarea',
          label: "What need isn't being met in this relationship? (optional but powerful)",
          placeholder: "Respect? Acknowledgment? To be seen? To be trusted? To not be controlled?",
          required: false
        }
      ]
    },
    {
      id: 'history',
      title: "The Pattern",
      description: "Understanding your history helps break the cycle",
      questions: [
        {
          id: 'pastHolidayPattern',
          type: 'textarea',
          label: "What's the usual pattern at holidays?",
          placeholder: "Walk me through a typical holiday with this person/these people. What happens?",
          required: true,
          minLength: 100
        },
        {
          id: 'lastYearSpecific',
          type: 'textarea',
          label: "What happened last year specifically?",
          placeholder: "Think about last holiday season. What moments stand out? What went wrong? What went okay?",
          required: true,
          minLength: 100
        },
        {
          id: 'whatYouTriedBefore',
          type: 'textarea',
          label: "What have you tried before to make things better?",
          placeholder: "Conversations? Boundaries? Avoiding topics? Limiting time? Therapy? Nothing?",
          required: true,
          minLength: 50
        },
        {
          id: 'whyItDidntWork',
          type: 'textarea',
          label: "Why do you think it didn't work? (optional)",
          placeholder: "What got in the way? Their response? Your follow-through? Guilt? External pressure?",
          required: false
        }
      ]
    },
    {
      id: 'inner_world',
      title: "Your Inner World",
      description: "This is the most important section. Be completely honest with yourself.",
      questions: [
        {
          id: 'biggestFear',
          type: 'textarea',
          label: "What are you most afraid will happen this holiday season?",
          placeholder: "Your worst-case scenario. The thing that keeps you up at night.",
          required: true,
          minLength: 50
        },
        {
          id: 'secretHope',
          type: 'textarea',
          label: "What do you secretly hope for?",
          placeholder: "Even if it feels unrealistic. What would you love to happen?",
          required: true,
          minLength: 50
        },
        {
          id: 'whatPeaceLooksLike',
          type: 'textarea',
          label: "Describe what 'peace' would actually look like for you this holiday",
          placeholder: "Not perfection - peace. What would that feel like? What would be different?",
          required: true,
          minLength: 75
        },
        {
          id: 'guiltyAbout',
          type: 'textarea',
          label: "What do you feel guilty about in all this? (optional but helpful)",
          placeholder: "The guilt you carry. The 'should's that weigh on you.",
          required: false
        }
      ]
    },
    {
      id: 'practical',
      title: "Practical Reality",
      description: "Let's ground this in what's actually possible",
      questions: [
        {
          id: 'constraints',
          type: 'multi_input',
          label: "What are your real constraints?",
          categories: [
            { id: 'time', label: 'Time constraints', placeholder: 'e.g., Only have 3 days off' },
            { id: 'money', label: 'Financial constraints', placeholder: 'e.g., Tight budget this year' },
            { id: 'energy', label: 'Energy/health constraints', placeholder: 'e.g., Exhausted from work' },
            { id: 'logistics', label: 'Logistical constraints', placeholder: 'e.g., Kids have school until 22nd' }
          ],
          required: true
        },
        {
          id: 'nonNegotiables',
          type: 'textarea',
          label: "What absolutely MUST happen no matter what?",
          placeholder: "The things that are truly non-negotiable for you or your family",
          required: true,
          minLength: 30
        },
        {
          id: 'flexibleAreas',
          type: 'textarea',
          label: "Where do you actually have flexibility?",
          placeholder: "Where could you compromise if needed? What matters less than you've been acting like it does?",
          required: true,
          minLength: 30
        }
      ]
    },
    {
      id: 'your_needs',
      title: "What You Need",
      description: "This section is just for you",
      questions: [
        {
          id: 'whatYouNeedToHear',
          type: 'textarea',
          label: "What do you need someone to tell you right now?",
          placeholder: "What words would help? What validation are you seeking? What truth do you need to hear?",
          required: true,
          minLength: 50
        },
        {
          id: 'whatYouNeedPermissionFor',
          type: 'textarea',
          label: "What do you need permission to do or feel? (optional)",
          placeholder: "Permission to say no? To feel angry? To not go? To prioritize yourself?",
          required: false
        },
        {
          id: 'boundaryYouWantToSet',
          type: 'textarea',
          label: "Is there a boundary you've been afraid to set? (optional)",
          placeholder: "Something you know you need to say or do but haven't been able to",
          required: false
        }
      ]
    },
    {
      id: 'preferences',
      title: "Almost Done",
      description: "A few quick preferences for your personalized plan",
      questions: [
        {
          id: 'tonePreference',
          type: 'select',
          label: "How would you like your plan to speak to you?",
          options: [
            { value: 'gentle', label: 'Gentle - Compassionate, soft, nurturing' },
            { value: 'balanced', label: 'Balanced - Warm but straightforward' },
            { value: 'direct', label: 'Direct - Tell it like it is, no sugarcoating' }
          ],
          required: true
        },
        {
          id: 'spiritualLanguageOk',
          type: 'boolean',
          label: "Are you comfortable with spiritual or faith-based language?",
          options: [
            { value: true, label: 'Yes, that resonates with me' },
            { value: false, label: 'No, please keep it secular' }
          ],
          required: true
        }
      ]
    }
  ]
};

// ============================================================
// RELATIONSHIP CONTEXT
// ============================================================

export const RELATIONSHIP_CONTEXTS: Record<RelationshipType, string> = {
  parent_mother: "navigating a challenging relationship with their mother",
  parent_father: "navigating a challenging relationship with their father",
  parent_both: "navigating challenging relationships with both parents",
  in_laws: "navigating difficult in-law dynamics",
  partner_spouse: "working through tension with their partner/spouse around the holidays",
  sibling: "dealing with sibling conflict",
  extended_family: "managing extended family stress",
  blended_family: "navigating blended family complexities",
  estranged_family: "processing feelings about an estranged family member",
  chosen_family: "managing dynamics with chosen family or close friends"
};

export const HOLIDAY_CONTEXTS: Record<HolidayContextType, string> = {
  first_holiday_after_loss: "facing their first holiday season after losing someone",
  first_holiday_after_divorce: "navigating their first holidays post-divorce/separation",
  first_holiday_with_new_partner: "introducing a new partner to family holiday dynamics",
  first_holiday_with_baby: "adjusting to holidays with a new baby",
  navigating_divided_time: "juggling time between multiple families",
  hosting_stress: "dealing with the pressure of hosting",
  traveling_stress: "managing the stress of holiday travel",
  financial_pressure: "feeling financial strain during the holidays",
  family_conflict_ongoing: "dealing with ongoing family conflict",
  setting_new_boundaries: "trying to establish healthier boundaries",
  general_overwhelm: "feeling overwhelmed by multiple holiday pressures"
};

// ============================================================
// VALIDATION
// ============================================================

export function validateHolidayResetInput(input: Partial<HolidayResetQuestionnaireInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.primaryRelationship) {
    errors.push("Please select the primary relationship you're navigating");
  }

  if (!input.holidayContext) {
    errors.push("Please select what makes this holiday season significant");
  }

  if (!input.coreTension?.whatItLooksLike || input.coreTension.whatItLooksLike.length < 100) {
    errors.push("Please describe the tension in more detail (at least 100 characters)");
  }

  if (!input.coreTension?.specificExample || input.coreTension.specificExample.length < 100) {
    errors.push("Please provide a specific example (at least 100 characters)");
  }

  if (!input.biggestFear || input.biggestFear.length < 50) {
    errors.push("Please share what you're most afraid of (at least 50 characters)");
  }

  if (!input.whatPeaceLooksLike || input.whatPeaceLooksLike.length < 75) {
    errors.push("Please describe what peace looks like for you (at least 75 characters)");
  }

  if (!input.whatYouNeedToHear || input.whatYouNeedToHear.length < 50) {
    errors.push("Please share what you need to hear (at least 50 characters)");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
