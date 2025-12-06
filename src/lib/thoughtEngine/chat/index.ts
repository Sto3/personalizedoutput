/**
 * Chat Module Index
 *
 * Central exports for the chat-based thought organization system.
 */

// Session management
export {
  ThoughtSession,
  ThoughtTurn,
  ProductId,
  SessionStatus,
  createThoughtSession,
  getThoughtSession,
  saveThoughtSession,
  deleteThoughtSession,
  listAllSessions,
  addTurn,
  getConversationTranscript,
  extractConversationContext
} from './thoughtSession';

// Product configuration
export {
  ProductChatConfig,
  GenerationTarget,
  getProductChatConfig,
  getAllProductConfigs,
  loadSystemPrompt,
  shouldStartWrapUp,
  canGenerate,
  getWrapUpMessage
} from './productChatConfig';

// Chat orchestrator
export {
  continueThoughtSession,
  startThoughtSession
} from './chatOrchestrator';

// Generation adapters
export {
  SantaGenerationInput,
  HolidayResetGenerationInput,
  NewYearResetGenerationInput,
  extractSantaInputFromConversation,
  extractHolidayResetInputFromConversation,
  extractNewYearResetInputFromConversation
} from './chatToGenerationAdapter';
