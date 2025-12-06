/**
 * Santa Message Safety Layer
 *
 * Ensures Santa scripts are appropriate, safe, and positive.
 * Filters content before TTS generation.
 */

// ============================================================
// TYPES
// ============================================================

export interface SafetyCheckResult {
  passed: boolean;
  issues: SafetyIssue[];
  sanitizedScript?: string;
}

export interface SafetyIssue {
  type: SafetyIssueType;
  severity: 'warning' | 'error';
  description: string;
  location?: string;
}

export type SafetyIssueType =
  | 'inappropriate_content'
  | 'religious_reference'
  | 'magic_reference'
  | 'gift_promise'
  | 'pressure_language'
  | 'negative_reinforcement'
  | 'length_violation'
  | 'name_frequency'
  | 'sensitive_topic';

// ============================================================
// BLOCKED PATTERNS
// ============================================================

const BLOCKED_PATTERNS = {
  // Religious references (unless Christian option enabled)
  religious_default: [
    /\bjesus\b/i,
    /\bchrist\b/i,
    /\blord\b/i,
    /\bgod\b/i,
    /\bbible\b/i,
    /\bprayer\b/i,
    /\bblessed\b/i,
    /\bchurch\b/i,
    /\bborn in a manger\b/i,
    /\btrue meaning of christmas\b/i,
    /\breason for the season\b/i
  ],

  // Magic references (always blocked)
  magic: [
    /\bmagic\b/i,
    /\bmagical\b/i,
    /\bspell\b/i,
    /\bwizard\b/i,
    /\bsorcery\b/i,
    /\bwitch\b/i,
    /\benchanted\b/i
  ],

  // Gift promises (never promise specific gifts)
  gift_promises: [
    /you'?ll get/i,
    /you'?re getting/i,
    /under the tree.*will be/i,
    /i'?m bringing you/i,
    /your present is/i,
    /what you asked for/i,
    /your wish.*come true/i
  ],

  // Pressure/shame language
  pressure: [
    /if you'?re good/i,
    /if you behave/i,
    /naughty list/i,
    /coal/i,
    /you better/i,
    /you need to/i,
    /or else/i,
    /disappointed in/i,
    /santa is watching you/i,
    /always watching/i
  ],

  // Negative reinforcement
  negative: [
    /you used to be bad/i,
    /you were naughty/i,
    /you didn'?t used to/i,
    /finally being good/i,
    /for once/i,
    /unlike before/i,
    /not like last year/i
  ],

  // Inappropriate for children
  inappropriate: [
    /\bdeath\b/i,
    /\bdied\b/i,
    /\bkill\b/i,
    /\bhate\b/i,
    /\bstupid\b/i,
    /\bdumb\b/i,
    /\bweird\b/i,
    /\bsex\b/i,
    /\bdrunk\b/i,
    /\bdrugs\b/i
  ]
};

// ============================================================
// SAFETY RULES
// ============================================================

export interface SafetyRules {
  allowChristianLanguage: boolean;
  allowMagicLanguage: boolean;  // Always false, but here for completeness
  minWordCount: number;
  maxWordCount: number;
  minNameMentions: number;
  maxNameMentions: number;
}

export const DEFAULT_SAFETY_RULES: SafetyRules = {
  allowChristianLanguage: false,
  allowMagicLanguage: false,
  minWordCount: 120,
  maxWordCount: 180,
  minNameMentions: 2,
  maxNameMentions: 4
};

// ============================================================
// MAIN SAFETY CHECK
// ============================================================

export function runSafetyCheck(
  script: string,
  childName: string,
  rules: SafetyRules = DEFAULT_SAFETY_RULES
): SafetyCheckResult {
  const issues: SafetyIssue[] = [];

  // Check for blocked patterns
  checkBlockedPatterns(script, issues, rules);

  // Check length
  checkLength(script, issues, rules);

  // Check name frequency
  checkNameFrequency(script, childName, issues, rules);

  // Check for any remaining problematic content
  checkGeneralContent(script, issues);

  const passed = !issues.some(i => i.severity === 'error');

  return {
    passed,
    issues,
    sanitizedScript: passed ? script : undefined
  };
}

// ============================================================
// PATTERN CHECKS
// ============================================================

function checkBlockedPatterns(
  script: string,
  issues: SafetyIssue[],
  rules: SafetyRules
): void {
  // Check religious (unless allowed)
  if (!rules.allowChristianLanguage) {
    for (const pattern of BLOCKED_PATTERNS.religious_default) {
      if (pattern.test(script)) {
        issues.push({
          type: 'religious_reference',
          severity: 'error',
          description: `Religious reference detected: ${pattern.source}`,
          location: script.match(pattern)?.[0]
        });
      }
    }
  }

  // Always check magic
  for (const pattern of BLOCKED_PATTERNS.magic) {
    if (pattern.test(script)) {
      issues.push({
        type: 'magic_reference',
        severity: 'error',
        description: `Magic reference detected: "${script.match(pattern)?.[0]}"`,
        location: script.match(pattern)?.[0]
      });
    }
  }

  // Check gift promises
  for (const pattern of BLOCKED_PATTERNS.gift_promises) {
    if (pattern.test(script)) {
      issues.push({
        type: 'gift_promise',
        severity: 'error',
        description: `Gift promise detected - we never promise specific gifts`,
        location: script.match(pattern)?.[0]
      });
    }
  }

  // Check pressure language
  for (const pattern of BLOCKED_PATTERNS.pressure) {
    if (pattern.test(script)) {
      issues.push({
        type: 'pressure_language',
        severity: 'error',
        description: `Pressure/shame language detected`,
        location: script.match(pattern)?.[0]
      });
    }
  }

  // Check negative reinforcement
  for (const pattern of BLOCKED_PATTERNS.negative) {
    if (pattern.test(script)) {
      issues.push({
        type: 'negative_reinforcement',
        severity: 'error',
        description: `Negative reinforcement detected`,
        location: script.match(pattern)?.[0]
      });
    }
  }

  // Check inappropriate content
  for (const pattern of BLOCKED_PATTERNS.inappropriate) {
    if (pattern.test(script)) {
      issues.push({
        type: 'inappropriate_content',
        severity: 'error',
        description: `Inappropriate content detected`,
        location: script.match(pattern)?.[0]
      });
    }
  }
}

function checkLength(
  script: string,
  issues: SafetyIssue[],
  rules: SafetyRules
): void {
  const wordCount = script.split(/\s+/).filter(w => w.length > 0).length;

  if (wordCount < rules.minWordCount) {
    issues.push({
      type: 'length_violation',
      severity: 'warning',
      description: `Script too short: ${wordCount} words (minimum: ${rules.minWordCount})`
    });
  }

  if (wordCount > rules.maxWordCount) {
    issues.push({
      type: 'length_violation',
      severity: 'warning',
      description: `Script too long: ${wordCount} words (maximum: ${rules.maxWordCount})`
    });
  }
}

function checkNameFrequency(
  script: string,
  childName: string,
  issues: SafetyIssue[],
  rules: SafetyRules
): void {
  const nameRegex = new RegExp(`\\b${childName}\\b`, 'gi');
  const matches = script.match(nameRegex) || [];
  const count = matches.length;

  if (count < rules.minNameMentions) {
    issues.push({
      type: 'name_frequency',
      severity: 'warning',
      description: `Name "${childName}" appears only ${count} times (minimum: ${rules.minNameMentions})`
    });
  }

  if (count > rules.maxNameMentions) {
    issues.push({
      type: 'name_frequency',
      severity: 'warning',
      description: `Name "${childName}" appears ${count} times (maximum: ${rules.maxNameMentions})`
    });
  }
}

function checkGeneralContent(
  script: string,
  issues: SafetyIssue[]
): void {
  // Check for potential sensitive topics that slipped through
  const sensitivePatterns = [
    { pattern: /divorce/i, topic: 'divorce' },
    { pattern: /cancer/i, topic: 'cancer' },
    { pattern: /hospital/i, topic: 'hospital' },
    { pattern: /sick\s+(mom|dad|parent|brother|sister)/i, topic: 'family illness' },
    { pattern: /passed away/i, topic: 'death' },
    { pattern: /went to heaven/i, topic: 'death' }
  ];

  for (const { pattern, topic } of sensitivePatterns) {
    if (pattern.test(script)) {
      issues.push({
        type: 'sensitive_topic',
        severity: 'warning',
        description: `Potentially sensitive topic mentioned: ${topic} - verify this was intentional`,
        location: script.match(pattern)?.[0]
      });
    }
  }
}

// ============================================================
// SANITIZATION
// ============================================================

export function sanitizeScript(script: string): string {
  let sanitized = script;

  // Replace common magic terms with alternatives
  sanitized = sanitized.replace(/\bmagic\b/gi, 'wonderful');
  sanitized = sanitized.replace(/\bmagical\b/gi, 'special');
  sanitized = sanitized.replace(/\benchanted\b/gi, 'wonderful');

  // Clean up any double spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

// ============================================================
// PRE-GENERATION CONTENT FILTER
// ============================================================

export function filterUserInput(input: string, fieldName: string): {
  clean: boolean;
  filtered: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  let filtered = input;

  // Check for potentially harmful content in user input
  const problematicPatterns = [
    { pattern: /santa isn'?t real/i, warning: 'Reference to Santa not being real' },
    { pattern: /lie to/i, warning: 'Reference to lying' },
    { pattern: /fake/i, warning: 'Reference to fake/not real' },
    { pattern: /you'?re bad/i, warning: 'Negative language about child' },
    { pattern: /worst/i, warning: 'Extremely negative language' },
    { pattern: /hate you/i, warning: 'Hateful language' }
  ];

  for (const { pattern, warning } of problematicPatterns) {
    if (pattern.test(input)) {
      warnings.push(`${fieldName}: ${warning}`);
    }
  }

  return {
    clean: warnings.length === 0,
    filtered,
    warnings
  };
}

// ============================================================
// EXPORTS
// ============================================================

export {
  BLOCKED_PATTERNS,
  SafetyRules as SafetyRulesType
};
