/**
 * Chat to Generation Adapter
 *
 * Converts conversation transcripts into the formats expected by
 * existing Santa and planner generators.
 */

import {
  ThoughtSession,
  getConversationTranscript,
  extractConversationContext
} from './thoughtSession';

// ============================================================
// SANTA MESSAGE ADAPTER
// ============================================================

export interface SantaGenerationInput {
  childFirstName: string;
  childAge: number;
  childGender: 'boy' | 'girl';
  primaryScenario: string;
  proudMoment1: {
    whatHappened: string;
    howChildResponded: string;
    whyItMattered: string;
  };
  proudMoment2?: {
    whatHappened: string;
    howChildResponded: string;
    whyItMattered: string;
  };
  characterTraits: string[];
  growthArea: string;
  whatParentWantsReinforced: string;
  tonePreference: 'warm_gentle' | 'cheerful' | 'enthusiastic';
  includeChristianMessage: boolean;
  conversationTranscript: string;
}

/**
 * Extract Santa generation input from a conversation
 */
export function extractSantaInputFromConversation(
  session: ThoughtSession
): SantaGenerationInput {
  const transcript = getConversationTranscript(session);
  const context = extractConversationContext(session);

  // Find child's name from conversation
  const childName = findChildName(session) || 'Child';

  // Find age from conversation
  const childAge = findChildAge(session) || 7;

  // Find gender from conversation
  const childGender = findChildGender(session) || 'boy';

  // Detect if Christian message requested
  const christianRequested = detectChristianRequest(session);

  // Infer scenario from conversation
  const scenario = inferScenario(session);

  // Extract proud moments
  const proudMoments = extractProudMoments(session);

  // Extract character traits
  const traits = extractCharacterTraits(session);

  // Extract what parent wants reinforced
  const coreMessage = extractCoreMessage(session);

  // Infer tone preference
  const tone = inferTonePreference(session);

  return {
    childFirstName: childName,
    childAge,
    childGender,
    primaryScenario: scenario,
    proudMoment1: proudMoments[0] || {
      whatHappened: 'Information gathered through conversation',
      howChildResponded: 'Discussed in conversation',
      whyItMattered: 'Shared by parent'
    },
    proudMoment2: proudMoments[1],
    characterTraits: traits.length > 0 ? traits : ['kind', 'thoughtful'],
    growthArea: extractGrowthArea(session),
    whatParentWantsReinforced: coreMessage,
    tonePreference: tone,
    includeChristianMessage: christianRequested,
    conversationTranscript: transcript
  };
}

// ============================================================
// HOLIDAY RESET ADAPTER
// ============================================================

export interface HolidayResetGenerationInput {
  primaryRelationship: string;
  holidayContext: string;
  coreTension: {
    withWhom: string;
    whatItLooksLike: string;
    specificExample: string;
    whatYouUsuallyDo: string;
    howItMakesYouFeel: string;
    whatYouWishYouCouldSay: string;
    underlyingNeed?: string;
  };
  pastHolidayPattern: string;
  lastYearSpecific: string;
  whatYouTriedBefore: string;
  biggestFear: string;
  secretHope: string;
  whatPeaceLooksLike: string;
  whatYouNeedToHear: string;
  constraints: Array<{ type: string; description: string }>;
  nonNegotiables: string[];
  flexibleAreas: string[];
  tonePreference: 'gentle' | 'balanced' | 'direct';
  spiritualLanguageOk: boolean;
  conversationTranscript: string;
}

/**
 * Extract Holiday Reset generation input from a conversation
 */
export function extractHolidayResetInputFromConversation(
  session: ThoughtSession
): HolidayResetGenerationInput {
  const transcript = getConversationTranscript(session);

  return {
    primaryRelationship: extractFromConversation(session, ['who', 'person', 'relationship', 'family']) || 'family member',
    holidayContext: extractFromConversation(session, ['holiday', 'christmas', 'thanksgiving', 'situation']) || 'general holiday stress',
    coreTension: {
      withWhom: extractFromConversation(session, ['with', 'person', 'tension', 'conflict']) || 'family member',
      whatItLooksLike: extractFromConversation(session, ['looks like', 'happens', 'pattern', 'behavior']) || 'Discussed in conversation',
      specificExample: extractFromConversation(session, ['example', 'time when', 'specific', 'remember']) || 'Shared in conversation',
      whatYouUsuallyDo: extractFromConversation(session, ['usually', 'respond', 'react', 'do when']) || 'Discussed in conversation',
      howItMakesYouFeel: extractFromConversation(session, ['feel', 'feeling', 'makes me', 'emotion']) || 'Shared in conversation',
      whatYouWishYouCouldSay: extractFromConversation(session, ['wish', 'want to say', 'tell them']) || 'Shared in conversation'
    },
    pastHolidayPattern: extractFromConversation(session, ['past', 'usually', 'every year', 'pattern']) || 'Discussed in conversation',
    lastYearSpecific: extractFromConversation(session, ['last year', 'previous', 'before']) || 'Discussed in conversation',
    whatYouTriedBefore: extractFromConversation(session, ['tried', 'attempted', 'done before']) || 'Discussed in conversation',
    biggestFear: extractFromConversation(session, ['fear', 'afraid', 'worried', 'dread']) || 'Discussed in conversation',
    secretHope: extractFromConversation(session, ['hope', 'wish', 'want']) || 'Discussed in conversation',
    whatPeaceLooksLike: extractFromConversation(session, ['peace', 'calm', 'better', 'ideal']) || 'Discussed in conversation',
    whatYouNeedToHear: extractFromConversation(session, ['need to hear', 'want someone', 'validation']) || 'Discussed in conversation',
    constraints: extractConstraints(session),
    nonNegotiables: extractNonNegotiables(session),
    flexibleAreas: extractFlexibleAreas(session),
    tonePreference: inferHolidayTone(session),
    spiritualLanguageOk: detectSpiritualPreference(session),
    conversationTranscript: transcript
  };
}

// ============================================================
// NEW YEAR RESET ADAPTER
// ============================================================

export interface NewYearResetGenerationInput {
  firstName: string;
  yearOverview: {
    threeWordsToDescribe: string[];
    biggestAccomplishment: string;
    biggestChallenge: string;
    unexpectedJoy: string;
    unexpectedLoss?: string;
  };
  significantMoment1: {
    whatHappened: string;
    whyItMattered: string;
    howItChangedYou: string;
    whatYouWantToRemember: string;
  };
  significantMoment2: {
    whatHappened: string;
    whyItMattered: string;
    howItChangedYou: string;
    whatYouWantToRemember: string;
  };
  surprisedYou: string;
  strengthDiscovered: string;
  patternNoticed: string;
  letGoOf: string;
  oneWordForNextYear: string;
  feelingYouWant: string;
  nonNegotiableChange: string;
  whatMightGetInWay: string;
  supportNeeded: string;
  tonePreference: 'reflective' | 'balanced' | 'motivating';
  includeQuarterlyBreakdown: boolean;
  conversationTranscript: string;
}

/**
 * Extract New Year Reset generation input from a conversation
 */
export function extractNewYearResetInputFromConversation(
  session: ThoughtSession
): NewYearResetGenerationInput {
  const transcript = getConversationTranscript(session);

  // Find user's name
  const firstName = findUserName(session) || 'Friend';

  // Extract three words for year
  const threeWords = extractThreeWords(session);

  return {
    firstName,
    yearOverview: {
      threeWordsToDescribe: threeWords.length >= 3 ? threeWords.slice(0, 3) : ['growth', 'challenge', 'change'],
      biggestAccomplishment: extractFromConversation(session, ['proud', 'accomplished', 'achievement', 'success']) || 'Discussed in conversation',
      biggestChallenge: extractFromConversation(session, ['hard', 'difficult', 'challenge', 'struggled']) || 'Discussed in conversation',
      unexpectedJoy: extractFromConversation(session, ['unexpected', 'surprise', 'joy', 'happy']) || 'Discussed in conversation'
    },
    significantMoment1: {
      whatHappened: extractFromConversation(session, ['moment', 'happened', 'significant', 'remember']) || 'Discussed in conversation',
      whyItMattered: extractFromConversation(session, ['mattered', 'important', 'significant']) || 'Discussed in conversation',
      howItChangedYou: extractFromConversation(session, ['changed', 'different', 'learned']) || 'Discussed in conversation',
      whatYouWantToRemember: extractFromConversation(session, ['remember', 'carry', 'keep']) || 'Discussed in conversation'
    },
    significantMoment2: {
      whatHappened: 'Another moment shared in conversation',
      whyItMattered: 'Discussed in conversation',
      howItChangedYou: 'Discussed in conversation',
      whatYouWantToRemember: 'Discussed in conversation'
    },
    surprisedYou: extractFromConversation(session, ['surprised', 'didn\'t expect', 'realized']) || 'Discussed in conversation',
    strengthDiscovered: extractFromConversation(session, ['strength', 'capable', 'strong', 'resilient']) || 'Discussed in conversation',
    patternNoticed: extractFromConversation(session, ['pattern', 'notice', 'tend to', 'always']) || 'Discussed in conversation',
    letGoOf: extractFromConversation(session, ['let go', 'release', 'leave behind', 'stop']) || 'Discussed in conversation',
    oneWordForNextYear: extractOneWord(session) || 'Growth',
    feelingYouWant: extractFromConversation(session, ['feel', 'want to feel', 'feeling']) || 'Discussed in conversation',
    nonNegotiableChange: extractFromConversation(session, ['must change', 'have to', 'need to change']) || 'Discussed in conversation',
    whatMightGetInWay: extractFromConversation(session, ['obstacle', 'challenge', 'get in way', 'stop me']) || 'Discussed in conversation',
    supportNeeded: extractFromConversation(session, ['support', 'need', 'help', 'from others']) || 'Discussed in conversation',
    tonePreference: inferNewYearTone(session),
    includeQuarterlyBreakdown: true,
    conversationTranscript: transcript
  };
}

// ============================================================
// EXTRACTION HELPER FUNCTIONS
// ============================================================

function findChildName(session: ThoughtSession): string | null {
  for (const turn of session.turns) {
    if (turn.role === 'user') {
      // Look for patterns like "Emma", "my daughter Emma", "his name is Jake"
      const namePatterns = [
        /(?:my (?:son|daughter|child)|(?:his|her) name is|called)\s+([A-Z][a-z]+)/i,
        /^([A-Z][a-z]+)(?:\.|,|\s|$)/,
        /name is ([A-Z][a-z]+)/i
      ];

      for (const pattern of namePatterns) {
        const match = turn.content.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }
  }
  return null;
}

function findChildAge(session: ThoughtSession): number | null {
  for (const turn of session.turns) {
    if (turn.role === 'user') {
      const agePatterns = [
        /(\d+)\s*(?:years?\s*old|yo)/i,
        /(?:age|aged)\s*(\d+)/i,
        /(?:he's|she's|they're)\s*(\d+)/i
      ];

      for (const pattern of agePatterns) {
        const match = turn.content.match(pattern);
        if (match) {
          const age = parseInt(match[1], 10);
          if (age >= 2 && age <= 12) {
            return age;
          }
        }
      }
    }
  }
  return null;
}

function findChildGender(session: ThoughtSession): 'boy' | 'girl' | null {
  for (const turn of session.turns) {
    if (turn.role === 'user') {
      const content = turn.content.toLowerCase();
      if (content.includes('daughter') || content.includes('girl') || content.includes(' she ') || content.includes(' her ')) {
        return 'girl';
      }
      if (content.includes('son') || content.includes('boy') || content.includes(' he ') || content.includes(' him ')) {
        return 'boy';
      }
    }
  }
  return null;
}

function detectChristianRequest(session: ThoughtSession): boolean {
  for (const turn of session.turns) {
    if (turn.role === 'user') {
      const content = turn.content.toLowerCase();
      if (
        content.includes('jesus') ||
        content.includes('christ') ||
        content.includes('christian') ||
        content.includes('religious') ||
        content.includes('faith-based') ||
        content.includes('true meaning of christmas')
      ) {
        return true;
      }
    }
  }
  return false;
}

function detectSpiritualPreference(session: ThoughtSession): boolean {
  for (const turn of session.turns) {
    if (turn.role === 'user') {
      const content = turn.content.toLowerCase();
      if (
        content.includes('god') ||
        content.includes('pray') ||
        content.includes('faith') ||
        content.includes('spiritual') ||
        content.includes('church') ||
        content.includes('blessing')
      ) {
        return true;
      }
    }
  }
  return false;
}

function inferScenario(session: ThoughtSession): string {
  const transcript = session.turns.map(t => t.content).join(' ').toLowerCase();

  if (transcript.includes('kind') || transcript.includes('helped') || transcript.includes('compassion')) {
    return 'kindness_to_others';
  }
  if (transcript.includes('hard') || transcript.includes('struggled') || transcript.includes('challenge')) {
    return 'overcoming_challenge';
  }
  if (transcript.includes('brave') || transcript.includes('courage') || transcript.includes('scared but')) {
    return 'being_brave';
  }
  if (transcript.includes('school') || transcript.includes('grades') || transcript.includes('learning')) {
    return 'academic_effort';
  }
  if (transcript.includes('confident') || transcript.includes('shy') || transcript.includes('speaking up')) {
    return 'building_confidence';
  }

  return 'general_celebration';
}

function extractProudMoments(session: ThoughtSession): Array<{ whatHappened: string; howChildResponded: string; whyItMattered: string }> {
  const moments: Array<{ whatHappened: string; howChildResponded: string; whyItMattered: string }> = [];

  // Collect all user messages as potential moments
  const userMessages = session.turns.filter(t => t.role === 'user').map(t => t.content);

  // Take the longest/most detailed messages as proud moments
  const sortedByLength = userMessages.sort((a, b) => b.length - a.length);

  for (let i = 0; i < Math.min(2, sortedByLength.length); i++) {
    if (sortedByLength[i].length > 50) {
      moments.push({
        whatHappened: sortedByLength[i],
        howChildResponded: 'Described by parent',
        whyItMattered: 'Shared in conversation'
      });
    }
  }

  return moments;
}

function extractCharacterTraits(session: ThoughtSession): string[] {
  const traits: string[] = [];
  const transcript = session.turns.map(t => t.content).join(' ').toLowerCase();

  const traitMap: Record<string, string> = {
    'kind': 'kind',
    'brave': 'brave',
    'curious': 'curious',
    'hardworking': 'hardworking',
    'hard-working': 'hardworking',
    'creative': 'creative',
    'caring': 'caring',
    'funny': 'funny',
    'determined': 'determined',
    'thoughtful': 'thoughtful',
    'helpful': 'helpful',
    'patient': 'patient',
    'resilient': 'resilient',
    'gentle': 'caring',
    'strong': 'resilient',
    'smart': 'curious',
    'loving': 'caring'
  };

  for (const [keyword, trait] of Object.entries(traitMap)) {
    if (transcript.includes(keyword) && !traits.includes(trait)) {
      traits.push(trait);
    }
  }

  return traits;
}

function extractCoreMessage(session: ThoughtSession): string {
  // Look for messages about what parent wants child to know/feel
  for (const turn of session.turns) {
    if (turn.role === 'user') {
      const content = turn.content.toLowerCase();
      if (
        content.includes('want them to know') ||
        content.includes('want her to know') ||
        content.includes('want him to know') ||
        content.includes('want them to feel') ||
        content.includes('important to me') ||
        content.includes('wish they knew')
      ) {
        return turn.content;
      }
    }
  }

  // Default to last substantial user message
  const userMessages = session.turns.filter(t => t.role === 'user' && t.content.length > 30);
  return userMessages[userMessages.length - 1]?.content || 'Shared throughout our conversation';
}

function extractGrowthArea(session: ThoughtSession): string {
  for (const turn of session.turns) {
    if (turn.role === 'user') {
      const content = turn.content.toLowerCase();
      if (
        content.includes('grown') ||
        content.includes('learning') ||
        content.includes('getting better') ||
        content.includes('improved')
      ) {
        return turn.content;
      }
    }
  }
  return 'Discussed in conversation';
}

function inferTonePreference(session: ThoughtSession): 'warm_gentle' | 'cheerful' | 'enthusiastic' {
  const transcript = session.turns.map(t => t.content).join(' ').toLowerCase();

  if (transcript.includes('sensitive') || transcript.includes('gentle') || transcript.includes('soft')) {
    return 'warm_gentle';
  }
  if (transcript.includes('excited') || transcript.includes('energy') || transcript.includes('enthusiastic')) {
    return 'enthusiastic';
  }

  return 'cheerful';
}

function inferHolidayTone(session: ThoughtSession): 'gentle' | 'balanced' | 'direct' {
  const transcript = session.turns.map(t => t.content).join(' ').toLowerCase();

  if (transcript.includes('direct') || transcript.includes('straight') || transcript.includes('no sugarcoating')) {
    return 'direct';
  }
  if (transcript.includes('gentle') || transcript.includes('soft') || transcript.includes('careful')) {
    return 'gentle';
  }

  return 'balanced';
}

function inferNewYearTone(session: ThoughtSession): 'reflective' | 'balanced' | 'motivating' {
  const transcript = session.turns.map(t => t.content).join(' ').toLowerCase();

  if (transcript.includes('motivate') || transcript.includes('push') || transcript.includes('ambitious')) {
    return 'motivating';
  }
  if (transcript.includes('reflect') || transcript.includes('contemplate') || transcript.includes('thoughtful')) {
    return 'reflective';
  }

  return 'balanced';
}

function findUserName(session: ThoughtSession): string | null {
  for (const turn of session.turns) {
    if (turn.role === 'user') {
      // Look for "I'm [Name]" or "my name is [Name]"
      const namePatterns = [
        /(?:I'm|I am|my name is|call me)\s+([A-Z][a-z]+)/i,
        /^([A-Z][a-z]+)(?:\.|,|\s|$)/
      ];

      for (const pattern of namePatterns) {
        const match = turn.content.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }
  }
  return null;
}

function extractThreeWords(session: ThoughtSession): string[] {
  for (const turn of session.turns) {
    if (turn.role === 'user') {
      // Look for comma-separated or space-separated words
      const content = turn.content;

      // Check for "three words" context
      if (content.toLowerCase().includes('word')) {
        const words = content.match(/\b[A-Za-z]+\b/g);
        if (words) {
          return words.filter(w =>
            w.length > 3 &&
            !['the', 'and', 'for', 'was', 'were', 'that', 'this', 'with', 'would', 'year', 'word', 'words', 'three'].includes(w.toLowerCase())
          ).slice(0, 3);
        }
      }
    }
  }
  return [];
}

function extractOneWord(session: ThoughtSession): string | null {
  for (const turn of session.turns) {
    if (turn.role === 'user') {
      const content = turn.content.toLowerCase();
      if (content.includes('one word') || content.includes('word for next year') || content.includes('guiding word')) {
        const words = turn.content.match(/\b[A-Z][a-z]+\b/g);
        if (words && words.length > 0) {
          return words[0];
        }
      }
    }
  }
  return null;
}

function extractFromConversation(session: ThoughtSession, keywords: string[]): string | null {
  for (const turn of session.turns) {
    if (turn.role === 'user') {
      const content = turn.content.toLowerCase();
      for (const keyword of keywords) {
        if (content.includes(keyword.toLowerCase())) {
          return turn.content;
        }
      }
    }
  }
  return null;
}

function extractConstraints(session: ThoughtSession): Array<{ type: string; description: string }> {
  const constraints: Array<{ type: string; description: string }> = [];

  for (const turn of session.turns) {
    if (turn.role === 'user') {
      const content = turn.content.toLowerCase();

      if (content.includes('time') || content.includes('days off') || content.includes('schedule')) {
        constraints.push({ type: 'time', description: turn.content });
      }
      if (content.includes('money') || content.includes('budget') || content.includes('afford')) {
        constraints.push({ type: 'financial', description: turn.content });
      }
      if (content.includes('tired') || content.includes('exhausted') || content.includes('energy')) {
        constraints.push({ type: 'energy', description: turn.content });
      }
    }
  }

  return constraints;
}

function extractNonNegotiables(session: ThoughtSession): string[] {
  const nonNegotiables: string[] = [];

  for (const turn of session.turns) {
    if (turn.role === 'user') {
      const content = turn.content.toLowerCase();
      if (
        content.includes('non-negotiable') ||
        content.includes('must') ||
        content.includes('have to') ||
        content.includes('absolutely')
      ) {
        nonNegotiables.push(turn.content);
      }
    }
  }

  return nonNegotiables;
}

function extractFlexibleAreas(session: ThoughtSession): string[] {
  const flexible: string[] = [];

  for (const turn of session.turns) {
    if (turn.role === 'user') {
      const content = turn.content.toLowerCase();
      if (
        content.includes('flexible') ||
        content.includes('could compromise') ||
        content.includes('doesn\'t matter as much') ||
        content.includes('willing to')
      ) {
        flexible.push(turn.content);
      }
    }
  }

  return flexible;
}
