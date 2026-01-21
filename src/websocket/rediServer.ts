/**
 * rediServer.ts - Unified Redi Server
 * ===================================
 * 
 * This file re-exports from rediV7Server.ts which is the canonical
 * production server implementation.
 * 
 * The V7 server includes:
 * - Response state machine (prevents race conditions)
 * - Barge-in handling with response.cancel
 * - Fresh frame requests at optimal moment
 * - 2-second max frame age
 * - gpt-realtime GA model with vision support
 * - NO RESPONSE QUEUING (prevents duplicate responses)
 * 
 * Endpoint: /ws/redi?v=7
 */

// Re-export everything from V7 with both old and new names
export {
  initRediV7,
  handleV7Upgrade,
  closeRediV7,
  getV7Stats,
  // New unified names (aliases to V7 functions)
  initRediV7 as initRediServer,
  handleV7Upgrade as handleRediUpgrade,
  closeRediV7 as closeRediServer,
  getV7Stats as getRediStats,
} from './rediV7Server';
