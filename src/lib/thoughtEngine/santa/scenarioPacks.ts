/**
 * Santa Scenario Packs
 *
 * Narrative templates and emotional arcs for each scenario type.
 * These guide the AI to create messages with proper structure and emotional flow.
 */

import { SantaScenarioType } from '../configs/santa_questionnaire';

// ============================================================
// TYPES
// ============================================================

export interface ScenarioPack {
  id: SantaScenarioType;
  name: string;
  emotionalArc: EmotionalArc;
  narrativeStructure: NarrativeStructure;
  keyPhrases: string[];
  avoidPhrases: string[];
  exampleOpeners: string[];
  exampleClosers: string[];
}

export interface EmotionalArc {
  opening: 'warm' | 'excited' | 'tender';
  middle: 'proud' | 'moved' | 'impressed' | 'touched';
  closing: 'encouraging' | 'affirming' | 'hopeful' | 'celebratory';
  overallTone: string;
}

export interface NarrativeStructure {
  openingFocus: string;
  momentOneIntro: string;
  momentTwoTransition: string;
  characterAffirmationBridge: string;
  closingTheme: string;
}

// ============================================================
// SCENARIO PACKS
// ============================================================

export const SCENARIO_PACKS: Record<SantaScenarioType, ScenarioPack> = {
  academic_effort: {
    id: 'academic_effort',
    name: 'Academic Effort',
    emotionalArc: {
      opening: 'warm',
      middle: 'proud',
      closing: 'encouraging',
      overallTone: 'Santa as proud grandfather celebrating persistence over perfection'
    },
    narrativeStructure: {
      openingFocus: "Santa has noticed their hard work and dedication",
      momentOneIntro: "Reference specific academic effort moment with admiration for persistence",
      momentTwoTransition: "Connect to broader pattern of not giving up",
      characterAffirmationBridge: "Tie effort to character - this shows who they are",
      closingTheme: "Keep trying, keep growing - effort is what matters"
    },
    keyPhrases: [
      "kept trying",
      "didn't give up",
      "worked so hard",
      "effort shows",
      "proud of how you try"
    ],
    avoidPhrases: [
      "smart",
      "genius",
      "best in class",
      "perfect grades",
      "better than others"
    ],
    exampleOpeners: [
      "I've been watching you work so hard this year",
      "Santa sees more than presents - I see effort"
    ],
    exampleClosers: [
      "Keep that wonderful spirit of trying",
      "Your hard work inspires me"
    ]
  },

  kindness_to_others: {
    id: 'kindness_to_others',
    name: 'Kindness to Others',
    emotionalArc: {
      opening: 'tender',
      middle: 'moved',
      closing: 'affirming',
      overallTone: 'Santa deeply touched by their compassion'
    },
    narrativeStructure: {
      openingFocus: "Santa sees their kind heart",
      momentOneIntro: "Describe specific act of kindness with emotional weight",
      momentTwoTransition: "Show pattern - this wasn't just once",
      characterAffirmationBridge: "Their kindness changes the world around them",
      closingTheme: "Keep that beautiful heart - the world needs people like you"
    },
    keyPhrases: [
      "kind heart",
      "noticed someone needed",
      "made them feel",
      "that's what kindness is",
      "changed their day"
    ],
    avoidPhrases: [
      "good girl/boy for doing",
      "you'll be rewarded",
      "that's how you get presents"
    ],
    exampleOpeners: [
      "I heard about what you did, and it filled my heart",
      "You know what made me smile this year?"
    ],
    exampleClosers: [
      "The world is better because you're in it",
      "Keep that beautiful heart of yours"
    ]
  },

  overcoming_challenge: {
    id: 'overcoming_challenge',
    name: 'Overcoming Challenge',
    emotionalArc: {
      opening: 'warm',
      middle: 'impressed',
      closing: 'hopeful',
      overallTone: 'Santa as steady presence acknowledging their strength'
    },
    narrativeStructure: {
      openingFocus: "Santa acknowledges this year was hard",
      momentOneIntro: "Reference challenge with compassion, then pivot to their response",
      momentTwoTransition: "Show another moment of resilience",
      characterAffirmationBridge: "This shows strength they may not see in themselves",
      closingTheme: "You have what it takes - you've already proven it"
    },
    keyPhrases: [
      "I know it wasn't easy",
      "but you kept going",
      "that takes real strength",
      "you showed",
      "proud of how you handled"
    ],
    avoidPhrases: [
      "that must have been terrible",
      "I'm so sorry",
      "trauma",
      "suffering",
      "victim"
    ],
    exampleOpeners: [
      "I know this year had some hard moments",
      "Santa sees the tough times too, not just the easy ones"
    ],
    exampleClosers: [
      "You're stronger than you know",
      "Look how far you've come"
    ]
  },

  big_life_change: {
    id: 'big_life_change',
    name: 'Big Life Change',
    emotionalArc: {
      opening: 'tender',
      middle: 'touched',
      closing: 'hopeful',
      overallTone: 'Santa as comforting presence during transition'
    },
    narrativeStructure: {
      openingFocus: "Santa knows change is hard",
      momentOneIntro: "Acknowledge the change, focus on their adaptability",
      momentTwoTransition: "Highlight a moment of bravery in the new situation",
      characterAffirmationBridge: "Their flexibility and courage during change",
      closingTheme: "New chapters can be wonderful - you're already proving that"
    },
    keyPhrases: [
      "big changes",
      "new beginnings",
      "adapted so well",
      "brave in a new situation",
      "making the best of"
    ],
    avoidPhrases: [
      "divorce",
      "death",
      "your parents splitting up",
      "losing your home",
      "specific trauma details"
    ],
    exampleOpeners: [
      "I know this year brought some big changes",
      "New chapters can be scary, but you..."
    ],
    exampleClosers: [
      "New adventures await, and you're ready",
      "Change shows us what we're made of - and you're made of wonderful things"
    ]
  },

  building_confidence: {
    id: 'building_confidence',
    name: 'Building Confidence',
    emotionalArc: {
      opening: 'warm',
      middle: 'proud',
      closing: 'encouraging',
      overallTone: 'Santa celebrating their emerging self'
    },
    narrativeStructure: {
      openingFocus: "Santa notices they're coming out of their shell",
      momentOneIntro: "Specific moment when they stepped up or spoke up",
      momentTwoTransition: "Another moment showing growing confidence",
      characterAffirmationBridge: "The person they're becoming is wonderful",
      closingTheme: "Keep shining - the world wants to see you"
    },
    keyPhrases: [
      "found your voice",
      "stepped up",
      "tried something new",
      "growing more confident",
      "showing who you really are"
    ],
    avoidPhrases: [
      "used to be shy",
      "you were so quiet before",
      "finally coming out",
      "better now"
    ],
    exampleOpeners: [
      "I've watched you grow so much this year",
      "Something beautiful is happening with you"
    ],
    exampleClosers: [
      "Keep letting the world see who you are",
      "You have so much to offer"
    ]
  },

  being_brave: {
    id: 'being_brave',
    name: 'Being Brave',
    emotionalArc: {
      opening: 'warm',
      middle: 'impressed',
      closing: 'affirming',
      overallTone: 'Santa honored by their courage'
    },
    narrativeStructure: {
      openingFocus: "Santa recognizes true bravery",
      momentOneIntro: "Describe specific brave moment with admiration",
      momentTwoTransition: "Connect to another moment or pattern of courage",
      characterAffirmationBridge: "Bravery isn't not being scared - it's doing it anyway",
      closingTheme: "You have courage that will carry you far"
    },
    keyPhrases: [
      "that took real courage",
      "even though it was scary",
      "you did it anyway",
      "brave heart",
      "stood up for"
    ],
    avoidPhrases: [
      "you weren't scared",
      "fearless",
      "nothing scares you",
      "tougher than others"
    ],
    exampleOpeners: [
      "You know what courage really is?",
      "Santa knows that being brave isn't easy"
    ],
    exampleClosers: [
      "Your courage inspires me",
      "The world needs brave hearts like yours"
    ]
  },

  helping_family: {
    id: 'helping_family',
    name: 'Helping Family',
    emotionalArc: {
      opening: 'tender',
      middle: 'touched',
      closing: 'affirming',
      overallTone: 'Santa moved by their selflessness at home'
    },
    narrativeStructure: {
      openingFocus: "Santa sees what happens at home, not just outside",
      momentOneIntro: "Specific moment of helping family with appreciation",
      momentTwoTransition: "Pattern of being reliable and caring at home",
      characterAffirmationBridge: "Being there for family shows character",
      closingTheme: "Family is lucky to have you"
    },
    keyPhrases: [
      "stepped up at home",
      "helped without being asked",
      "took care of",
      "your family is lucky",
      "makes home better"
    ],
    avoidPhrases: [
      "had to grow up fast",
      "too much responsibility",
      "parentified",
      "burden on you"
    ],
    exampleOpeners: [
      "I see what you do for your family",
      "Home helpers are some of my favorites"
    ],
    exampleClosers: [
      "Your family is so lucky to have you",
      "That's what family is all about"
    ]
  },

  friendship_growth: {
    id: 'friendship_growth',
    name: 'Friendship Growth',
    emotionalArc: {
      opening: 'warm',
      middle: 'proud',
      closing: 'encouraging',
      overallTone: 'Santa celebrating their social heart'
    },
    narrativeStructure: {
      openingFocus: "Santa notices how they treat friends",
      momentOneIntro: "Specific friendship moment with warmth",
      momentTwoTransition: "Pattern of being a good friend",
      characterAffirmationBridge: "Being a good friend is one of the most important things",
      closingTheme: "Keep being the friend everyone deserves"
    },
    keyPhrases: [
      "good friend",
      "there for others",
      "includes everyone",
      "loyal",
      "makes friends feel"
    ],
    avoidPhrases: [
      "popular",
      "everyone wants to be your friend",
      "best friend",
      "more friends than"
    ],
    exampleOpeners: [
      "I've seen how you treat your friends",
      "Being a good friend is special"
    ],
    exampleClosers: [
      "The world needs friends like you",
      "Keep that wonderful heart for friendship"
    ]
  },

  personal_achievement: {
    id: 'personal_achievement',
    name: 'Personal Achievement',
    emotionalArc: {
      opening: 'excited',
      middle: 'proud',
      closing: 'celebratory',
      overallTone: 'Santa celebrating their accomplishment joyfully'
    },
    narrativeStructure: {
      openingFocus: "Santa celebrates what they achieved",
      momentOneIntro: "Reference achievement with focus on journey not just outcome",
      momentTwoTransition: "The work that went into it",
      characterAffirmationBridge: "This achievement shows who they are inside",
      closingTheme: "You can do amazing things when you try"
    },
    keyPhrases: [
      "you did it",
      "all that work paid off",
      "should be so proud",
      "earned this",
      "showed what you can do"
    ],
    avoidPhrases: [
      "won",
      "beat everyone",
      "the best",
      "number one",
      "better than"
    ],
    exampleOpeners: [
      "I heard about what you accomplished!",
      "Some achievements deserve a special mention"
    ],
    exampleClosers: [
      "I can't wait to see what you do next",
      "You showed everyone - especially yourself - what you can do"
    ]
  },

  general_celebration: {
    id: 'general_celebration',
    name: 'General Celebration',
    emotionalArc: {
      opening: 'warm',
      middle: 'touched',
      closing: 'affirming',
      overallTone: 'Santa simply celebrating who they are'
    },
    narrativeStructure: {
      openingFocus: "Santa is so glad they exist",
      momentOneIntro: "Draw from proud moment to show their wonderful qualities",
      momentTwoTransition: "Another moment that shows who they are",
      characterAffirmationBridge: "These moments paint a picture of a wonderful person",
      closingTheme: "Keep being exactly who you are"
    },
    keyPhrases: [
      "exactly who you are",
      "wonderful person",
      "makes the world better",
      "glad you're here",
      "just being you"
    ],
    avoidPhrases: [
      "perfect",
      "never do anything wrong",
      "always good",
      "best child"
    ],
    exampleOpeners: [
      "I want you to know something important",
      "Sometimes I just want to celebrate who someone is"
    ],
    exampleClosers: [
      "Never stop being you",
      "The world is better because you're in it"
    ]
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getScenarioPack(scenario: SantaScenarioType): ScenarioPack {
  return SCENARIO_PACKS[scenario];
}

export function getEmotionalArcDescription(scenario: SantaScenarioType): string {
  const pack = SCENARIO_PACKS[scenario];
  return `Start with a ${pack.emotionalArc.opening} opening, build to a ${pack.emotionalArc.middle} middle acknowledging specific moments, close with an ${pack.emotionalArc.closing} message. Overall: ${pack.emotionalArc.overallTone}`;
}

export function getNarrativeGuidance(scenario: SantaScenarioType): string {
  const pack = SCENARIO_PACKS[scenario];
  return `
NARRATIVE STRUCTURE:
1. OPENING: ${pack.narrativeStructure.openingFocus}
2. MOMENT ONE: ${pack.narrativeStructure.momentOneIntro}
3. MOMENT TWO: ${pack.narrativeStructure.momentTwoTransition}
4. CHARACTER: ${pack.narrativeStructure.characterAffirmationBridge}
5. CLOSING: ${pack.narrativeStructure.closingTheme}

KEY PHRASES TO WEAVE IN: ${pack.keyPhrases.join(', ')}

PHRASES TO AVOID: ${pack.avoidPhrases.join(', ')}

EXAMPLE OPENERS:
- "${pack.exampleOpeners[0]}"
- "${pack.exampleOpeners[1]}"

EXAMPLE CLOSERS:
- "${pack.exampleClosers[0]}"
- "${pack.exampleClosers[1]}"
`;
}
