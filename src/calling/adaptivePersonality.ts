/**
 * Adaptive Personality — Tone adaptation for phone calls
 * =======================================================
 * Adjusts Redi's personality based on who it's calling.
 */

export type CallTone = 'professional' | 'medical' | 'casual' | 'government' | 'default';

interface PersonalityProfile {
  tone: CallTone;
  systemPromptAddition: string;
  identificationPhrase: string;
}

const BUSINESS_PATTERNS = [
  /^1[- ]?8[0-9]{2}/,   // 1-800, 1-888, etc.
  /^1[- ]?866/,
  /^1[- ]?877/,
  /^1[- ]?855/,
];

const PROFILES: Record<CallTone, PersonalityProfile> = {
  professional: {
    tone: 'professional',
    systemPromptAddition: `TONE: Professional and efficient. Be polite, clear, and to the point. Identify yourself as an AI assistant calling on behalf of the user. Use formal language.`,
    identificationPhrase: "Hi, I'm calling on behalf of {userName}. I'm their AI assistant, Redi.",
  },
  medical: {
    tone: 'medical',
    systemPromptAddition: `TONE: Careful and accurate. Only share health information the user has explicitly authorized. Never speculate about diagnoses. Be patient with hold times. Ask for reference numbers and appointment IDs.`,
    identificationPhrase: "Hello, I'm calling on behalf of {userName} regarding their appointment. I'm their AI assistant.",
  },
  casual: {
    tone: 'casual',
    systemPromptAddition: `TONE: Warm and casual, like a friend making a call for a friend. Use the user's first name naturally. Be conversational and friendly.`,
    identificationPhrase: "Hey! I'm Redi, {userName}'s assistant. They asked me to give you a call.",
  },
  government: {
    tone: 'government',
    systemPromptAddition: `TONE: Patient and persistent. Government lines often have long holds and transfers. Always ask for reference numbers. Be precise with dates, numbers, and case IDs. Stay calm through bureaucratic processes.`,
    identificationPhrase: "Hello, I'm calling on behalf of {userName}. I'm their authorized representative.",
  },
  default: {
    tone: 'default',
    systemPromptAddition: `TONE: Polite and professional. Identify yourself as an AI assistant. Be clear and helpful.`,
    identificationPhrase: "Hi, I'm calling on behalf of {userName}. I'm Redi, their AI assistant.",
  },
};

export function detectCallTone(params: {
  targetNumber: string;
  targetName?: string;
  contactCategory?: string;
  userOverride?: string;
}): PersonalityProfile {
  const { targetNumber, targetName, contactCategory, userOverride } = params;

  // User override takes priority
  if (userOverride) {
    const lc = userOverride.toLowerCase();
    if (lc.includes('casual') || lc.includes('friendly') || lc.includes('warm')) return PROFILES.casual;
    if (lc.includes('formal') || lc.includes('professional') || lc.includes('firm')) return PROFILES.professional;
    if (lc.includes('medical') || lc.includes('doctor') || lc.includes('health')) return PROFILES.medical;
    if (lc.includes('government') || lc.includes('insurance') || lc.includes('dmv')) return PROFILES.government;
  }

  // Contact category from iOS contacts
  if (contactCategory) {
    const cat = contactCategory.toLowerCase();
    if (cat.includes('family') || cat.includes('friend')) return PROFILES.casual;
    if (cat.includes('doctor') || cat.includes('medical') || cat.includes('health')) return PROFILES.medical;
    if (cat.includes('business') || cat.includes('work')) return PROFILES.professional;
  }

  // Target name heuristics
  if (targetName) {
    const name = targetName.toLowerCase();
    if (name.includes('dr.') || name.includes('doctor') || name.includes('clinic') || name.includes('hospital') || name.includes('pharmacy') || name.includes('medical')) {
      return PROFILES.medical;
    }
    if (name.includes('insurance') || name.includes('dmv') || name.includes('irs') || name.includes('social security') || name.includes('county') || name.includes('city of')) {
      return PROFILES.government;
    }
    if (name.includes('mom') || name.includes('dad') || name.includes('grandma') || name.includes('brother') || name.includes('sister')) {
      return PROFILES.casual;
    }
  }

  // Phone number patterns
  if (BUSINESS_PATTERNS.some((p) => p.test(targetNumber.replace(/\D/g, '')))) {
    return PROFILES.professional;
  }

  return PROFILES.default;
}

export function buildCallSystemPrompt(params: {
  targetNumber: string;
  targetName?: string;
  purpose: string;
  constraints?: any;
  userDisplayName: string;
  contactCategory?: string;
  userOverride?: string;
  memoryContext?: string;
}): string {
  const profile = detectCallTone({
    targetNumber: params.targetNumber,
    targetName: params.targetName,
    contactCategory: params.contactCategory,
    userOverride: params.userOverride,
  });

  const identification = profile.identificationPhrase.replace('{userName}', params.userDisplayName);

  let prompt = `You are Redi, an AI assistant making a phone call on behalf of ${params.userDisplayName}.

TARGET: ${params.targetName || params.targetNumber}
PURPOSE: ${params.purpose}
${params.constraints ? `CONSTRAINTS: ${JSON.stringify(params.constraints)}` : ''}

OPENING: ${identification}

${profile.systemPromptAddition}

RULES:
- Never make commitments beyond what the user authorized
- If asked something you don't know, say "Let me check with ${params.userDisplayName} and get back to you"
- If you reach voicemail, leave a brief message and hang up
- If you encounter an IVR menu, navigate it based on the purpose
- If put on hold, wait patiently
- Keep responses concise — this is a phone call, not an essay`;

  if (params.memoryContext) {
    prompt += `\n\nUSER CONTEXT FROM MEMORY:\n${params.memoryContext}`;
  }

  return prompt;
}
