/**
 * rediV7Server.ts
 *
 * DEPRECATED - Use rediServer.ts instead.
 * This file exists only for backward compatibility.
 *
 * All exports are re-exported from rediServer.ts.
 */

export {
  initRediServer as initRediV7,
  handleRediUpgrade as handleV7Upgrade,
  closeRediServer as closeRediV7,
  getRediStats as getV7Stats,
  // Also export the new names for gradual migration
  initRediServer,
  handleRediUpgrade,
  closeRediServer,
  getRediStats
} from './rediServer';
