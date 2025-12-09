/**
 * New Year Reset Form Schema
 *
 * JSON-serializable form schema for New Year Reflection Reset planner.
 * Can be rendered directly by any front-end framework.
 */

import { FormSchema } from './formSchemaTypes';

// ============================================================
// SCHEMA DEFINITION
// ============================================================

export function getNewYearResetFormSchema(): FormSchema {
  return {
    productId: 'new_year_reflection_reset',
    productName: 'New Year Reflection & Reset Planner',
    version: '1.0.0',
    estimatedTime: '20-25 minutes',
    intro: "This is a space to reflect honestly on your year. There are no right answers - only your truth.",

    sections: [
      // Section 0: Order Verification (REQUIRED)
      {
        id: 'order_verification',
        title: "Verify Your Purchase",
        description: "Before we begin, please enter your Etsy Order ID so we can securely attach your personalized planner to your purchase.",
        questions: [
          {
            id: 'orderId',
            type: 'text',
            label: "Etsy Order ID",
            placeholder: "Enter your Etsy Order ID (e.g., 1234567890)",
            required: true,
            minLength: 4,
            maxLength: 20,
            helpText: "You can find this in your Etsy purchase confirmation email or order history"
          }
        ]
      },

      // Section 1: Basics
      {
        id: 'basics',
        title: "Let's Begin",
        description: "Just one thing to start",
        questions: [
          {
            id: 'firstName',
            type: 'text',
            label: "What's your first name?",
            placeholder: "First name",
            required: true,
            helpText: "Your planner will be personally addressed to you"
          }
        ]
      },

      // Section 2: Year Overview
      {
        id: 'year_overview',
        title: "2024 at a Glance",
        description: "Before we go deep, let's get the big picture",
        questions: [
          {
            id: 'yearOverview.threeWordsToDescribe',
            type: 'multi_text',
            label: "Three words that describe your 2024",
            count: 3,
            placeholder: "First word",
            required: true,
            helpText: "Don't overthink it - what comes to mind?"
          },
          {
            id: 'yearOverview.biggestAccomplishment',
            type: 'textarea',
            label: "What are you most proud of accomplishing this year?",
            placeholder: "This could be big or small. External achievement or internal growth.",
            required: true,
            minLength: 50
          },
          {
            id: 'yearOverview.biggestChallenge',
            type: 'textarea',
            label: "What was the hardest thing you faced?",
            placeholder: "Be honest. What really challenged you?",
            required: true,
            minLength: 50
          },
          {
            id: 'yearOverview.unexpectedJoy',
            type: 'textarea',
            label: "What unexpected joy found you this year?",
            placeholder: "Something good that surprised you...",
            required: true,
            minLength: 30
          },
          {
            id: 'yearOverview.unexpectedLoss',
            type: 'textarea',
            label: "Did you experience any unexpected losses? (optional)",
            placeholder: "A person, a relationship, a dream, a version of yourself...",
            required: false
          }
        ]
      },

      // Section 3: Significant Moment 1
      {
        id: 'significant_moment_1',
        title: "A Moment That Mattered",
        description: "Think of a specific moment this year that felt significant",
        questions: [
          {
            id: 'significantMoment1.whatHappened',
            type: 'textarea',
            label: "What happened?",
            placeholder: "Describe the moment. Where were you? What was happening?",
            required: true,
            minLength: 75
          },
          {
            id: 'significantMoment1.whyItMattered',
            type: 'textarea',
            label: "Why did this moment matter?",
            placeholder: "What made it significant to you?",
            required: true,
            minLength: 50
          },
          {
            id: 'significantMoment1.howItChangedYou',
            type: 'textarea',
            label: "How did it change you?",
            placeholder: "What shifted in you because of this moment?",
            required: true,
            minLength: 50
          },
          {
            id: 'significantMoment1.whatYouWantToRemember',
            type: 'textarea',
            label: "What do you want to carry forward from this moment?",
            placeholder: "A lesson, a feeling, a truth...",
            required: true,
            minLength: 30
          }
        ]
      },

      // Section 4: Significant Moment 2
      {
        id: 'significant_moment_2',
        title: "Another Moment",
        description: "Let's capture one more significant moment",
        questions: [
          {
            id: 'significantMoment2.whatHappened',
            type: 'textarea',
            label: "What happened?",
            placeholder: "Another moment that stands out from this year...",
            required: true,
            minLength: 75
          },
          {
            id: 'significantMoment2.whyItMattered',
            type: 'textarea',
            label: "Why did this moment matter?",
            placeholder: "What made it significant?",
            required: true,
            minLength: 50
          },
          {
            id: 'significantMoment2.howItChangedYou',
            type: 'textarea',
            label: "How did it change you?",
            placeholder: "The impact it had on you...",
            required: true,
            minLength: 50
          },
          {
            id: 'significantMoment2.whatYouWantToRemember',
            type: 'textarea',
            label: "What do you want to remember?",
            placeholder: "What stays with you from this?",
            required: true,
            minLength: 30
          }
        ]
      },

      // Section 5: Difficult Moment (Optional)
      {
        id: 'difficult_moment',
        title: "The Hard Stuff (Optional)",
        description: "If you're comfortable, reflecting on difficulty can be powerful",
        optional: true,
        questions: [
          {
            id: 'difficultMoment.whatHappened',
            type: 'textarea',
            label: "What was a particularly difficult moment this year?",
            placeholder: "Something that really tested you...",
            required: false,
            minLength: 50
          },
          {
            id: 'difficultMoment.howYouGotThrough',
            type: 'textarea',
            label: "How did you get through it?",
            placeholder: "What helped? What did you do?",
            required: false
          },
          {
            id: 'difficultMoment.whatYouLearned',
            type: 'textarea',
            label: "What did you learn from it?",
            placeholder: "About yourself, about life, about others...",
            required: false
          },
          {
            id: 'difficultMoment.stillProcessing',
            type: 'textarea',
            label: "What are you still processing?",
            placeholder: "It's okay if you're not done with this yet...",
            required: false
          }
        ]
      },

      // Section 6: What You Learned
      {
        id: 'what_you_learned',
        title: "What 2024 Taught You",
        description: "Let's name what you discovered about yourself",
        questions: [
          {
            id: 'surprisedYou',
            type: 'textarea',
            label: "What surprised you about yourself this year?",
            placeholder: "Something you didn't expect to feel, do, or be capable of...",
            required: true,
            minLength: 50
          },
          {
            id: 'strengthDiscovered',
            type: 'textarea',
            label: "What strength did you discover or develop?",
            placeholder: "A capability you didn't know you had, or grew this year...",
            required: true,
            minLength: 50
          },
          {
            id: 'patternNoticed',
            type: 'textarea',
            label: "What pattern did you notice in yourself?",
            placeholder: "A recurring theme in your behavior, choices, or feelings...",
            required: true,
            minLength: 50
          },
          {
            id: 'relationshipInsight',
            type: 'textarea',
            label: "What did you learn about relationships? (optional)",
            placeholder: "Any insights about how you connect with others...",
            required: false
          }
        ]
      },

      // Section 7: Unfinished Business
      {
        id: 'unfinished_business',
        title: "Unfinished Business",
        description: "What needs attention before you can fully step into the new year?",
        questions: [
          {
            id: 'letGoOf',
            type: 'textarea',
            label: "What do you need to let go of?",
            placeholder: "A grudge, a regret, an expectation, a version of yourself...",
            required: true,
            minLength: 50
          },
          {
            id: 'forgiveYourself',
            type: 'textarea',
            label: "What do you need to forgive yourself for? (optional)",
            placeholder: "Something you're still carrying guilt or shame about...",
            required: false
          },
          {
            id: 'conversationNeeded',
            type: 'textarea',
            label: "Is there a conversation you still need to have? (optional)",
            placeholder: "Something unsaid that needs to be said...",
            required: false
          },
          {
            id: 'unfinishedProject',
            type: 'textarea',
            label: "Is there something unfinished that still matters to you? (optional)",
            placeholder: "A project, a promise, a dream set aside...",
            required: false
          }
        ]
      },

      // Section 8: Looking Forward
      {
        id: 'looking_forward',
        title: "2025: The Year Ahead",
        description: "Not resolutions. Intentions. Directions. Feelings.",
        questions: [
          {
            id: 'oneWordForNextYear',
            type: 'text',
            label: "Choose one word to guide your 2025",
            placeholder: "One word that captures how you want to move through the year",
            required: true,
            helpText: "Examples: Growth, Peace, Courage, Joy, Presence, Freedom"
          },
          {
            id: 'feelingYouWant',
            type: 'textarea',
            label: "How do you want to FEEL in 2025?",
            placeholder: "Not what you want to accomplish - how you want to feel day to day...",
            required: true,
            minLength: 50
          },
          {
            id: 'nonNegotiableChange',
            type: 'textarea',
            label: "What is ONE thing that absolutely must change?",
            placeholder: "The one thing you know you can't carry into another year...",
            required: true,
            minLength: 50
          },
          {
            id: 'secretDream',
            type: 'textarea',
            label: "What's a secret dream you haven't told anyone? (optional)",
            placeholder: "Something you want but haven't said out loud...",
            required: false
          }
        ]
      },

      // Section 9: Practical Intentions
      {
        id: 'practical_intentions',
        title: "Making It Real",
        description: "Let's ground your intentions in reality",
        questions: [
          {
            id: 'healthIntention',
            type: 'textarea',
            label: "Health & Body: What's your intention?",
            placeholder: "Not a goal - an intention. How do you want to relate to your health?",
            required: false
          },
          {
            id: 'relationshipIntention',
            type: 'textarea',
            label: "Relationships: What's your intention?",
            placeholder: "How do you want to show up in your relationships?",
            required: false
          },
          {
            id: 'careerIntention',
            type: 'textarea',
            label: "Work & Purpose: What's your intention?",
            placeholder: "What do you want your work life to feel like?",
            required: false
          },
          {
            id: 'personalIntention',
            type: 'textarea',
            label: "Personal Growth: What's your intention?",
            placeholder: "How do you want to grow as a person?",
            required: false
          },
          {
            id: 'whatMightGetInWay',
            type: 'textarea',
            label: "What might get in your way?",
            placeholder: "Be honest about the obstacles - internal and external...",
            required: true,
            minLength: 50
          },
          {
            id: 'supportNeeded',
            type: 'textarea',
            label: "What support do you need?",
            placeholder: "From others, from yourself, from your environment...",
            required: true,
            minLength: 50
          }
        ]
      },

      // Section 10: Preferences
      {
        id: 'preferences',
        title: "Final Touches",
        description: "How should your reflection planner feel?",
        questions: [
          {
            id: 'tonePreference',
            type: 'select',
            label: "What tone resonates with you?",
            options: [
              { value: 'reflective', label: 'Reflective', description: 'Contemplative, thoughtful, spacious' },
              { value: 'balanced', label: 'Balanced', description: 'Warm but grounded' },
              { value: 'motivating', label: 'Motivating', description: 'Energizing, forward-looking' }
            ],
            required: true
          },
          {
            id: 'includeQuarterlyBreakdown',
            type: 'boolean',
            label: "Include a quarterly breakdown for 2025?",
            options: [
              { value: true, label: 'Yes, help me plan by quarter' },
              { value: false, label: 'No, keep it high-level' }
            ],
            required: true
          }
        ]
      }
    ]
  };
}

// ============================================================
// ANSWER NORMALIZATION
// ============================================================

export function normalizeNewYearResetAnswers(rawAnswers: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawAnswers)) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = normalized;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]] as Record<string, unknown>;
      }
      current[parts[parts.length - 1]] = value;
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}
