/**
 * Reliability Service for Redi
 *
 * Implements military-grade reliability patterns:
 * - Health Monitoring: Continuously check all components
 * - Circuit Breakers: Stop hitting failing services
 * - Graceful Degradation: Fallback chains for every component
 *
 * Goal: Never crash, always degrade gracefully, recover automatically.
 */

import { EventEmitter } from 'events';

// ========================================================================
// HEALTH MONITORING
// ========================================================================

export type ComponentStatus = 'healthy' | 'degraded' | 'failed';

export interface SystemHealth {
  objectDetection: ComponentStatus;
  audioClassification: ComponentStatus;
  cloudConnection: ComponentStatus;
  transcription: ComponentStatus;
  tts: ComponentStatus;
  llm: ComponentStatus;

  // Latency metrics (ms)
  visionLatency: number;
  audioLatency: number;
  responseLatency: number;

  lastHealthCheck: number;
  overallStatus: ComponentStatus;
}

type HealthCheckFunction = () => Promise<ComponentStatus>;

/**
 * Health Monitor - Continuously checks system health
 */
export class HealthMonitor extends EventEmitter {
  private health: SystemHealth;
  private checkInterval: NodeJS.Timeout | null = null;
  private healthChecks: Map<string, HealthCheckFunction> = new Map();
  private checkIntervalMs: number = 5000;

  constructor() {
    super();
    this.health = this.getDefaultHealth();
  }

  private getDefaultHealth(): SystemHealth {
    return {
      objectDetection: 'healthy',
      audioClassification: 'healthy',
      cloudConnection: 'healthy',
      transcription: 'healthy',
      tts: 'healthy',
      llm: 'healthy',
      visionLatency: 0,
      audioLatency: 0,
      responseLatency: 0,
      lastHealthCheck: Date.now(),
      overallStatus: 'healthy'
    };
  }

  /**
   * Register a health check function for a component
   */
  registerHealthCheck(component: keyof Omit<SystemHealth, 'visionLatency' | 'audioLatency' | 'responseLatency' | 'lastHealthCheck' | 'overallStatus'>, checkFn: HealthCheckFunction): void {
    this.healthChecks.set(component, checkFn);
  }

  /**
   * Start continuous health monitoring
   */
  start(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => this.runHealthCheck(), this.checkIntervalMs);
    console.log('[HealthMonitor] Started monitoring');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('[HealthMonitor] Stopped monitoring');
  }

  /**
   * Run health check on all components
   */
  async runHealthCheck(): Promise<SystemHealth> {
    // Run all registered health checks
    for (const [component, checkFn] of this.healthChecks) {
      try {
        const status = await checkFn();
        (this.health as any)[component] = status;
      } catch (error) {
        console.error(`[HealthMonitor] Check failed for ${component}:`, error);
        (this.health as any)[component] = 'failed';
      }
    }

    // Update health state
    this.health.lastHealthCheck = Date.now();
    this.health.overallStatus = this.calculateOverallStatus();

    // Emit events for degradations
    const degraded = Object.entries(this.health)
      .filter(([k, v]) => (v === 'degraded' || v === 'failed') && k !== 'overallStatus');

    if (degraded.length > 0) {
      console.warn('[HealthMonitor] Degraded components:', degraded);
      this.emit('degradation', degraded);
    }

    this.emit('healthUpdate', this.health);
    return this.health;
  }

  private calculateOverallStatus(): ComponentStatus {
    const statuses = [
      this.health.objectDetection,
      this.health.cloudConnection,
      this.health.transcription,
      this.health.tts,
      this.health.llm
    ];

    if (statuses.some(s => s === 'failed')) return 'failed';
    if (statuses.some(s => s === 'degraded')) return 'degraded';
    return 'healthy';
  }

  /**
   * Get current health status
   */
  getHealth(): SystemHealth {
    return { ...this.health };
  }

  /**
   * Record latency for a component
   */
  recordLatency(type: 'vision' | 'audio' | 'response', latencyMs: number): void {
    switch (type) {
      case 'vision':
        this.health.visionLatency = latencyMs;
        break;
      case 'audio':
        this.health.audioLatency = latencyMs;
        break;
      case 'response':
        this.health.responseLatency = latencyMs;
        break;
    }
  }

  /**
   * Check if system is healthy enough to operate
   */
  isOperational(): boolean {
    return this.health.overallStatus !== 'failed';
  }
}

// ========================================================================
// CIRCUIT BREAKER
// ========================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  failureThreshold: number;    // Number of failures before opening
  recoveryTime: number;        // Time in ms before attempting recovery
  successThreshold: number;    // Successes needed in half-open to close
}

/**
 * Circuit Breaker - Prevents cascading failures
 */
export class CircuitBreaker {
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure: number = 0;
  private state: CircuitState = 'closed';
  private options: CircuitBreakerOptions;
  private name: string;

  constructor(name: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.name = name;
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      recoveryTime: options.recoveryTime ?? 30000, // 30 seconds
      successThreshold: options.successThreshold ?? 2
    };
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      // Check if recovery time has passed
      if (Date.now() - this.lastFailure > this.options.recoveryTime) {
        this.state = 'half-open';
        this.successes = 0;
        console.log(`[CircuitBreaker:${this.name}] Attempting recovery (half-open)`);
      } else {
        throw new CircuitOpenError(`Circuit breaker ${this.name} is open`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = 'closed';
        console.log(`[CircuitBreaker:${this.name}] Circuit closed (recovered)`);
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    this.successes = 0;

    if (this.failures >= this.options.failureThreshold) {
      this.state = 'open';
      console.error(`[CircuitBreaker:${this.name}] Circuit opened after ${this.failures} failures`);
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is allowing requests
   */
  isAllowingRequests(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open' && Date.now() - this.lastFailure > this.options.recoveryTime) {
      return true; // Will transition to half-open
    }
    return this.state === 'half-open';
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    console.log(`[CircuitBreaker:${this.name}] Manually reset`);
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

// ========================================================================
// GRACEFUL DEGRADATION
// ========================================================================

/**
 * Fallback chains for graceful degradation
 */
export const FALLBACK_CHAINS = {
  objectDetection: [
    'yolo_on_device',      // Primary: YOLOv8 on Neural Engine
    'apple_vision',        // Fallback 1: Apple Vision framework
    'cloud_vision_lite',   // Fallback 2: Fast cloud model
    'none'                 // Fallback 3: Skip object detection
  ],

  audioClassification: [
    'apple_sound_analysis', // Primary: Apple SoundAnalysis
    'audio_context_rules',  // Fallback: Rule-based
    'none'
  ],

  tts: [
    'elevenlabs_streaming', // Primary: ElevenLabs
    'azure_speech',         // Fallback 1: Azure
    'ios_system_tts',       // Fallback 2: AVSpeechSynthesizer
  ],

  llm: [
    'claude_sonnet',        // Primary: Full reasoning
    'claude_haiku',         // Fallback 1: Fast, cheaper
    'rule_based_responses', // Fallback 2: Pre-defined responses
  ],

  transcription: [
    'deepgram_nova',        // Primary: Deepgram Nova-2
    'whisper_api',          // Fallback 1: OpenAI Whisper
    'ios_speech',           // Fallback 2: iOS Speech Recognition
  ]
};

type FallbackExecutor<T> = () => Promise<T>;

/**
 * Execute with fallback chain
 */
export async function withFallback<T>(
  chain: string[],
  executors: Record<string, FallbackExecutor<T>>,
  circuitBreakers?: Record<string, CircuitBreaker>
): Promise<{ result: T | null; usedFallback: string }> {
  for (const option of chain) {
    if (option === 'none') {
      return { result: null, usedFallback: 'none' };
    }

    const executor = executors[option];
    if (!executor) continue;

    // Check circuit breaker if available
    const breaker = circuitBreakers?.[option];
    if (breaker && !breaker.isAllowingRequests()) {
      console.warn(`[Fallback] Skipping ${option} - circuit open`);
      continue;
    }

    try {
      const result = breaker
        ? await breaker.execute(executor)
        : await executor();

      return { result, usedFallback: option };
    } catch (error) {
      console.warn(`[Fallback] ${option} failed, trying next:`, error instanceof Error ? error.message : error);
      continue;
    }
  }

  return { result: null, usedFallback: 'none' };
}

// ========================================================================
// SINGLETON INSTANCES
// ========================================================================

// Global health monitor
let healthMonitor: HealthMonitor | null = null;

export function getHealthMonitor(): HealthMonitor {
  if (!healthMonitor) {
    healthMonitor = new HealthMonitor();
  }
  return healthMonitor;
}

// Circuit breakers for each service
const circuitBreakers: Map<string, CircuitBreaker> = new Map();

export function getCircuitBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, options));
  }
  return circuitBreakers.get(name)!;
}

// Pre-create common circuit breakers
export const CIRCUIT_BREAKERS = {
  elevenlabs: getCircuitBreaker('elevenlabs', { failureThreshold: 3, recoveryTime: 60000 }),
  claude: getCircuitBreaker('claude', { failureThreshold: 5, recoveryTime: 30000 }),
  deepgram: getCircuitBreaker('deepgram', { failureThreshold: 3, recoveryTime: 30000 }),
  cloudVision: getCircuitBreaker('cloudVision', { failureThreshold: 5, recoveryTime: 30000 }),
};
