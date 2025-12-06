/**
 * Santa Form Schema
 *
 * JSON-serializable form schema for Santa message questionnaire.
 * Can be rendered directly by any front-end framework.
 */

import { FormSchema, SectionSchema, QuestionSchema } from './formSchemaTypes';

// ============================================================
// SCHEMA DEFINITION
// ============================================================

export function getSantaFormSchema(): FormSchema {
  return {
    productId: 'santa_message',
    productName: 'Personalized Santa Message',
    version: '2.0.0',
    estimatedTime: '5-8 minutes',
    intro: "Create a deeply personalized voice message from Santa that will make your child feel truly special. The more details you share, the more magical the message will be.",

    sections: [
      // Section 1: Basic Info
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
            required: true,
            maxLength: 50
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
            helpText: "This helps Santa use the right words"
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

      // Section 2: Scenario
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
              { value: 'academic_effort', label: 'Worked really hard in school', description: 'Focus on effort and persistence' },
              { value: 'kindness_to_others', label: 'Shown amazing kindness to others', description: 'Highlight their compassion' },
              { value: 'overcoming_challenge', label: 'Overcome a real challenge', description: 'Acknowledge their strength' },
              { value: 'big_life_change', label: 'Handled a big life change well', description: 'Validate their adaptability' },
              { value: 'building_confidence', label: 'Grown more confident', description: 'Celebrate their emergence' },
              { value: 'being_brave', label: 'Been incredibly brave', description: 'Honor their courage' },
              { value: 'helping_family', label: 'Stepped up to help our family', description: 'Recognize their selflessness' },
              { value: 'friendship_growth', label: 'Grown as a friend', description: 'Celebrate social growth' },
              { value: 'personal_achievement', label: 'Achieved something meaningful', description: 'Focus on their journey' },
              { value: 'general_celebration', label: 'Just been wonderful!', description: 'Celebrate who they are' }
            ],
            required: true
          }
        ]
      },

      // Section 3: Proud Moment 1
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
            placeholder: "What did they say or do? (e.g., 'She walked over and invited him to sit with her...')",
            required: true,
            minLength: 30
          },
          {
            id: 'proudMoment1.whyItMattered',
            type: 'textarea',
            label: "Why did this moment matter to you?",
            placeholder: "What did it show you about who they are?",
            required: true,
            minLength: 30
          },
          {
            id: 'proudMoment1.specificDetail',
            type: 'text',
            label: "One small detail that stands out (optional)",
            placeholder: "A quote, expression, or tiny moment you remember",
            required: false,
            helpText: "Specific details make the message incredibly personal"
          }
        ]
      },

      // Section 4: Proud Moment 2
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

      // Section 5: Character
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

      // Section 6: Parent's Heart
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

      // Section 7: Tone & Options
      {
        id: 'tone',
        title: "Final Touches",
        description: "How should Santa sound?",
        questions: [
          {
            id: 'tonePreference',
            type: 'select',
            label: "What tone fits your child best?",
            options: [
              { value: 'warm_gentle', label: 'Warm & Gentle', description: 'Soft, comforting, like a hug' },
              { value: 'cheerful', label: 'Cheerful', description: 'Classic jolly Santa, balanced warmth' },
              { value: 'enthusiastic', label: 'Enthusiastic', description: 'Excited, high energy celebration' }
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
            helpText: "If selected, Santa may reference the true meaning of Christmas, Jesus, or blessings."
          }
        ]
      }
    ]
  };
}

// ============================================================
// ANSWER NORMALIZATION
// ============================================================

export function normalizeSantaAnswers(rawAnswers: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  // Flatten nested answers (e.g., proudMoment1.whatHappened)
  for (const [key, value] of Object.entries(rawAnswers)) {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      if (!normalized[parent]) {
        normalized[parent] = {};
      }
      (normalized[parent] as Record<string, unknown>)[child] = value;
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}
