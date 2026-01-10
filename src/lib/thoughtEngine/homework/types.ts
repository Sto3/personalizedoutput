/**
 * Homework Rescue - Type Definitions
 * Core types for the personalized tutoring lesson system
 */

// Grade levels supported
export type GradeLevel = 'K' | '1' | '2' | '3' | '4' | '5' | '6';

// Subject areas
export type Subject = 'Math' | 'Reading';

// Learning style preferences
export type LearningStyle =
  | 'visual'
  | 'auditory'
  | 'hands_on'
  | 'stories'
  | 'not_sure';

// Tone preferences
export type TonePreference =
  | 'enthusiastic'
  | 'calm'
  | 'encouraging'
  | 'matter_of_fact';

// Math topics by grade
export const MATH_TOPICS: Record<GradeLevel, string[]> = {
  'K': [
    'Counting to 20',
    'Number recognition',
    'Basic addition',
    'Basic subtraction',
    'Shapes',
    'Comparing numbers (more/less)',
    'Patterns'
  ],
  '1': [
    'Addition within 20',
    'Subtraction within 20',
    'Place value (tens and ones)',
    'Comparing numbers',
    'Word problems',
    'Telling time',
    'Counting to 100'
  ],
  '2': [
    'Addition with regrouping',
    'Subtraction with regrouping',
    'Skip counting',
    'Place value (hundreds)',
    'Word problems',
    'Basic multiplication concepts',
    'Measuring length',
    'Money'
  ],
  '3': [
    'Multiplication facts',
    'Division facts',
    'Fractions (basic)',
    'Word problems (multi-step)',
    'Area and perimeter',
    'Telling time (elapsed)',
    'Rounding numbers'
  ],
  '4': [
    'Multi-digit multiplication',
    'Long division',
    'Fractions (comparing, adding)',
    'Decimals',
    'Word problems',
    'Factors and multiples',
    'Angles and geometry'
  ],
  '5': [
    'Fraction operations',
    'Decimal operations',
    'Order of operations',
    'Volume',
    'Coordinate graphing',
    'Word problems (complex)',
    'Expressions and equations'
  ],
  '6': [
    'Ratios and rates',
    'Percents',
    'Negative numbers',
    'Algebraic expressions',
    'Equations',
    'Statistics (mean, median)',
    'Geometry (area of complex shapes)'
  ]
};

// Reading topics by grade
export const READING_TOPICS: Record<GradeLevel, string[]> = {
  'K': [
    'Letter sounds',
    'Rhyming words',
    'Beginning sounds',
    'Sight words',
    'Simple CVC words',
    'Blending sounds',
    'Story comprehension (read-aloud)'
  ],
  '1': [
    'Phonics blends (bl, cr, st)',
    'Long vowel sounds',
    'Sight word fluency',
    'Reading fluency',
    'Story sequencing',
    'Main idea',
    'Making predictions'
  ],
  '2': [
    'Vowel teams (ea, oa, ai)',
    'R-controlled vowels',
    'Reading comprehension',
    'Main idea and details',
    'Character traits',
    'Cause and effect',
    'Making inferences'
  ],
  '3': [
    'Multi-syllable words',
    'Vocabulary in context',
    'Main idea',
    'Summarizing',
    'Compare and contrast',
    'Author\'s purpose',
    'Text features'
  ],
  '4': [
    'Context clues',
    'Inferencing',
    'Theme',
    'Point of view',
    'Text structure',
    'Summarizing fiction',
    'Summarizing nonfiction'
  ],
  '5': [
    'Complex inferencing',
    'Theme analysis',
    'Comparing texts',
    'Figurative language',
    'Author\'s argument',
    'Evidence-based answers',
    'Literary elements'
  ],
  '6': [
    'Advanced comprehension',
    'Analyzing arguments',
    'Evaluating sources',
    'Complex vocabulary',
    'Multiple perspectives',
    'Literary analysis',
    'Synthesis across texts'
  ]
};

// Homework rescue intake data
export interface HomeworkIntake {
  // Basic info
  childName: string;
  grade: GradeLevel;
  subject: Subject;

  // The specific struggle
  topic: string;
  specificProblem: string;  // The actual problem they struggled with
  whatHappened: string;     // What occurred when they tried
  whereStuck: string;       // Exactly where confusion happened

  // Diagnosis confirmation
  diagnosisSummary: string;  // Our understanding
  diagnosisConfirmed: boolean;
  additionalContext?: string;

  // Interest hook
  interest: string;         // What the child loves
  whyLoveIt: string;        // Why they love it

  // Learning preferences
  learningStyle: LearningStyle;
  previousAttempts?: string;

  // Goals and preferences
  parentGoal: string;       // What parent wants child to understand
  tone: TonePreference;
  thingsToAvoid?: string;

  // Metadata
  orderId: string;
  createdAt: Date;
  sessionId: string;
}

// Lesson script structure
export interface LessonScript {
  // Metadata
  childName: string;
  grade: GradeLevel;
  subject: Subject;
  topic: string;

  // Content sections
  introduction: string;           // ~1 min - hook with interest
  conceptExplanation: string;     // ~3 min - core teaching
  firstPractice: PracticeSegment; // ~2 min - pause and practice
  deeperExplanation: string;      // ~2 min - build understanding
  secondPractice: PracticeSegment;// ~1.5 min - more practice
  miniChallenge: PracticeSegment; // ~0.5 min - closing challenge
  closing: string;                // ~30 sec - encouragement

  // Parent section
  parentSummary: ParentSummary;

  // Full narration script (for TTS)
  fullScript: string;

  // Timing markers
  estimatedDuration: number;  // seconds
  wordCount: number;
}

export interface PracticeSegment {
  setup: string;              // Narration leading into practice
  pausePrompt: string;        // "Pause here and try these..."
  practiceItems: PracticeItem[];
  resumeScript: string;       // Narration after practice
  answerReveal: string;       // Walking through answers
}

export interface PracticeItem {
  problem: string;
  answer: string;
  explanation?: string;
  displayFormat: 'text' | 'equation' | 'word_problem' | 'sentence' | 'passage';
}

export interface ParentSummary {
  whatWeLearned: string;
  keyConceptExplained: string;
  howToReinforce: string[];
  signsOfProgress: string[];
  nextSteps?: string;
}

// QA verification result
export interface QAResult {
  passed: boolean;
  errors: QAError[];
  warnings: QAWarning[];
  verifiedAt: Date;
}

export interface QAError {
  type: 'math_error' | 'reading_error' | 'safety_error' | 'consistency_error';
  location: string;
  description: string;
  suggestion?: string;
}

export interface QAWarning {
  type: 'pacing' | 'complexity' | 'tone';
  description: string;
}

// Video generation types
export interface LessonVisuals {
  scenes: VideoScene[];
  totalDuration: number;
}

export interface VideoScene {
  id: string;
  type: 'title' | 'explanation' | 'practice' | 'pause' | 'reveal' | 'challenge' | 'closing';
  duration: number;         // seconds
  startTime: number;        // seconds from start

  // Visual content
  mainText?: string;
  subText?: string;
  equation?: string;
  steps?: string[];
  practiceItems?: string[];

  // Styling
  highlight?: string;       // text to highlight
  animation?: 'fade_in' | 'slide_up' | 'reveal_step' | 'highlight';
  backgroundColor?: string;
}

// Order and delivery
export interface HomeworkOrder {
  id: string;
  intake: HomeworkIntake;
  status: OrderStatus;

  // Generation progress
  scriptGenerated?: boolean;
  audioGenerated?: boolean;
  visualsGenerated?: boolean;
  videoGenerated?: boolean;
  pdfsGenerated?: boolean;

  // Outputs
  videoUrl?: string;
  practiceSheetUrl?: string;
  answerKeyUrl?: string;
  parentSummaryUrl?: string;

  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  deliveredAt?: Date;

  // Quality
  qaResult?: QAResult;

  // Customer
  email: string;
  stripePaymentId?: string;

  // Remake
  isRemake: boolean;
  originalOrderId?: string;
  remakeReason?: string;
}

export type OrderStatus =
  | 'pending'
  | 'intake_complete'
  | 'generating_script'
  | 'verifying_qa'
  | 'generating_audio'
  | 'generating_visuals'
  | 'rendering_video'
  | 'generating_pdfs'
  | 'uploading'
  | 'completed'
  | 'delivered'
  | 'failed'
  | 'remake_requested';

// Referral system
export interface ReferralCode {
  code: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: Date;
  usageCount: number;
  creditsEarned: number;
}

export interface ReferralUsage {
  code: string;
  usedBy: string;
  usedByEmail: string;
  orderId: string;
  usedAt: Date;
  creditAwarded: boolean;
}
