/**
 * Provider Health Check
 * =====================
 * Pings each AI provider on startup and every 6 hours.
 * If a provider is down or model is deprecated, logs a warning
 * and can trigger fallback routing.
 *
 * Created: Feb 21, 2026
 */

import { cerebrasComplete } from './cerebrasProvider';
import { openaiComplete } from './openaiProvider';
import { anthropicComplete } from './anthropicProvider';

export interface ProviderStatus {
  name: string;
  model: string;
  healthy: boolean;
  latencyMs: number;
  error?: string;
  lastChecked: Date;
}

const providerStatuses: Map<string, ProviderStatus> = new Map();
let healthCheckInterval: NodeJS.Timeout | null = null;

const HEALTH_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const TEST_PROMPT = [{ role: 'user' as const, content: 'Say OK' }];

async function checkCerebras(): Promise<ProviderStatus> {
  const start = Date.now();
  try {
    const result = await cerebrasComplete({ messages: TEST_PROMPT, max_tokens: 5 });
    return {
      name: 'Cerebras (Fast Brain)',
      model: result.model,
      healthy: true,
      latencyMs: Date.now() - start,
      lastChecked: new Date(),
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    // Detect deprecation specifically
    const isDeprecated = errorMsg.includes('404') || errorMsg.includes('not_found') || errorMsg.includes('does not exist');
    return {
      name: 'Cerebras (Fast Brain)',
      model: 'gpt-oss-120b',
      healthy: false,
      latencyMs: Date.now() - start,
      error: isDeprecated ? `MODEL DEPRECATED: ${errorMsg}` : errorMsg,
      lastChecked: new Date(),
    };
  }
}

async function checkOpenAI(): Promise<ProviderStatus> {
  const start = Date.now();
  try {
    const result = await openaiComplete({ messages: TEST_PROMPT, max_tokens: 5 });
    return {
      name: 'OpenAI (Deep Brain)',
      model: result.model,
      healthy: true,
      latencyMs: Date.now() - start,
      lastChecked: new Date(),
    };
  } catch (err: any) {
    return {
      name: 'OpenAI (Deep Brain)',
      model: 'gpt-4o',
      healthy: false,
      latencyMs: Date.now() - start,
      error: err?.message || String(err),
      lastChecked: new Date(),
    };
  }
}

async function checkAnthropic(): Promise<ProviderStatus> {
  const start = Date.now();
  try {
    const result = await anthropicComplete({ messages: TEST_PROMPT, max_tokens: 5 });
    return {
      name: 'Anthropic (Voice Brain)',
      model: result.model,
      healthy: true,
      latencyMs: Date.now() - start,
      lastChecked: new Date(),
    };
  } catch (err: any) {
    return {
      name: 'Anthropic (Voice Brain)',
      model: 'claude-haiku-4-5',
      healthy: false,
      latencyMs: Date.now() - start,
      error: err?.message || String(err),
      lastChecked: new Date(),
    };
  }
}

export async function runHealthChecks(): Promise<ProviderStatus[]> {
  console.log('[HealthCheck] Running provider health checks...');
  
  const results = await Promise.allSettled([
    checkCerebras(),
    checkOpenAI(),
    checkAnthropic(),
  ]);

  const statuses: ProviderStatus[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const status = result.value;
      providerStatuses.set(status.name, status);
      statuses.push(status);

      if (status.healthy) {
        console.log(`[HealthCheck] \u2705 ${status.name}: ${status.model} (${status.latencyMs}ms)`);
      } else {
        console.error(`[HealthCheck] \u274c ${status.name}: ${status.error}`);
      }
    } else {
      console.error(`[HealthCheck] \u274c Check failed entirely:`, result.reason);
    }
  }

  const unhealthy = statuses.filter(s => !s.healthy);
  if (unhealthy.length > 0) {
    console.error(`[HealthCheck] \u26a0\ufe0f ${unhealthy.length} provider(s) UNHEALTHY:`);
    for (const u of unhealthy) {
      console.error(`[HealthCheck]   - ${u.name}: ${u.error}`);
    }
  } else {
    console.log(`[HealthCheck] \u2705 All ${statuses.length} providers healthy`);
  }

  return statuses;
}

export function startPeriodicHealthChecks(): void {
  // Run immediately on startup
  runHealthChecks().catch(err => console.error('[HealthCheck] Initial check failed:', err));

  // Then every 6 hours
  healthCheckInterval = setInterval(() => {
    runHealthChecks().catch(err => console.error('[HealthCheck] Periodic check failed:', err));
  }, HEALTH_CHECK_INTERVAL_MS);

  console.log(`[HealthCheck] Scheduled every ${HEALTH_CHECK_INTERVAL_MS / 3600000}h`);
}

export function stopPeriodicHealthChecks(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

export function getProviderStatuses(): ProviderStatus[] {
  return Array.from(providerStatuses.values());
}

/**
 * Check if a specific brain is healthy. Used by the pipeline
 * to decide whether to fallback.
 */
export function isBrainHealthy(brain: 'fast' | 'voice' | 'deep'): boolean {
  const nameMap: Record<string, string> = {
    fast: 'Cerebras (Fast Brain)',
    voice: 'Anthropic (Voice Brain)',
    deep: 'OpenAI (Deep Brain)',
  };
  const status = providerStatuses.get(nameMap[brain]);
  if (!status) return true; // Assume healthy if not checked yet
  return status.healthy;
}
