/**
 * Homework Rescue - Main Export Module
 *
 * Exports all homework rescue functionality for integration
 * with the main application.
 */

// Types
export * from './types';

// Questionnaire / Personalization
export {
  createConversationState,
  generateNextMessage,
  finalizeIntake,
  generateDiagnosisSummary,
  getTopicsForGradeSubject,
  ConversationState,
  ConversationMessage,
  ConversationPhase
} from './homeworkQuestionnaire';

// Script Generation
export {
  generateHomeworkScript,
  generateSafeFallbackScript
} from './generateHomeworkScript';

// Quality Assurance
export {
  verifyLessonScript,
  verifyAndRegenerateIfNeeded,
  validateIntakeForGeneration
} from './homeworkQA';

// Visual Generation
export {
  generateLessonVisuals,
  getVisualsOutputDir
} from './lessonVisualGenerator';

// Video Composition
export {
  composeLessonVideo,
  composeLessonVideoSmooth,
  uploadVideo,
  selectVoiceForIntake,
  getOrderPaths
} from './lessonVideoComposer';

// PDF Generation
export {
  generateHomeworkPDFs,
  uploadPDFs
} from './homeworkPDFGenerator';

// Email Service
export {
  sendEmail,
  sendOrderConfirmation,
  sendLessonDelivered,
  sendFeedbackRequest,
  sendRemakeStarted,
  sendAbandonedCheckout,
  scheduleFeedbackEmail
} from './emailService';

// Referral System
export {
  generateReferralCode,
  validateReferralCode,
  applyReferralCode,
  awardReferrerCredit,
  getUserReferralInfo,
  useCredit,
  getReferralLeaderboard,
  ReferralCode,
  ReferralUsage
} from './referralSystem';
