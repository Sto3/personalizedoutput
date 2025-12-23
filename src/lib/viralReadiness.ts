/**
 * Viral Readiness Layer
 *
 * Handles API protection and graceful degradation for high traffic scenarios.
 *
 * Features:
 * - Rate limiting per IP
 * - Request queuing for burst traffic
 * - Graceful error responses
 * - Alert integration
 */

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { alertError, alertTrafficSpike } from './alerts/emailAlerts';

// ============================================================
// RATE LIMITING
// ============================================================

// General page view rate limit (generous)
export const pageRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 mins per IP
  message: {
    error: 'Too many requests. Please wait a moment and try again.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[RateLimit] Page rate limit hit for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests. Please wait a moment and try again.',
      retryAfter: 900
    });
  }
});

// API rate limit (more restrictive for expensive operations)
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 API calls per minute per IP
  message: {
    error: 'API rate limit reached. Please wait before making more requests.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[RateLimit] API rate limit hit for IP: ${req.ip}, path: ${req.path}`);
    res.status(429).json({
      error: 'Rate limit reached. Please wait before making more requests.',
      retryAfter: 60
    });
  }
});

// Generation rate limit (very restrictive for expensive AI operations)
export const generationRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 generations per 5 mins per IP (1 per minute average)
  message: {
    error: 'Generation limit reached. Please wait before generating more content.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use email or IP as key for generations
    const body = req.body as { email?: string };
    return body?.email || req.ip || 'unknown';
  },
  handler: (req, res) => {
    console.log(`[RateLimit] Generation limit hit for IP: ${req.ip}`);
    res.status(429).json({
      error: 'You have reached the generation limit. Please wait a few minutes before trying again.',
      retryAfter: 300
    });
  }
});

// ============================================================
// REQUEST QUEUE
// ============================================================

interface QueuedRequest {
  resolve: (value: void) => void;
  reject: (reason: Error) => void;
  timeout: NodeJS.Timeout;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = 0;
  private readonly maxConcurrent: number;
  private readonly maxQueueSize: number;
  private readonly queueTimeout: number;

  constructor(maxConcurrent = 10, maxQueueSize = 50, queueTimeout = 30000) {
    this.maxConcurrent = maxConcurrent;
    this.maxQueueSize = maxQueueSize;
    this.queueTimeout = queueTimeout;
  }

  async acquire(): Promise<void> {
    if (this.processing < this.maxConcurrent) {
      this.processing++;
      return Promise.resolve();
    }

    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Server is too busy. Please try again later.');
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.queue.findIndex(q => q.resolve === resolve);
        if (index > -1) {
          this.queue.splice(index, 1);
          reject(new Error('Request timed out while waiting in queue.'));
        }
      }, this.queueTimeout);

      this.queue.push({ resolve, reject, timeout });
    });
  }

  release(): void {
    this.processing--;

    if (this.queue.length > 0 && this.processing < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) {
        clearTimeout(next.timeout);
        this.processing++;
        next.resolve();
      }
    }
  }

  getStats(): { processing: number; queued: number; maxConcurrent: number; maxQueue: number } {
    return {
      processing: this.processing,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueue: this.maxQueueSize
    };
  }
}

// Separate queues for different operation types
export const generationQueue = new RequestQueue(5, 20, 60000);  // 5 concurrent, 20 max queue, 60s timeout
export const apiQueue = new RequestQueue(20, 100, 30000);       // 20 concurrent, 100 max queue, 30s timeout

// ============================================================
// QUEUE MIDDLEWARE
// ============================================================

export function queueMiddleware(queue: RequestQueue) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await queue.acquire();

      // Release on response finish
      res.on('finish', () => queue.release());
      res.on('close', () => queue.release());

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Queue error';
      console.log(`[Queue] Request rejected: ${errorMessage}`);
      res.status(503).json({
        error: errorMessage,
        retryAfter: 30
      });
    }
  };
}

// ============================================================
// ERROR HANDLING WITH ALERTS
// ============================================================

export async function handleApiError(
  error: unknown,
  context: string,
  res: Response
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);

  console.error(`[API Error] ${context}: ${errorMessage}`);

  // Determine error type and response
  let statusCode = 500;
  let userMessage = 'An error occurred. Please try again.';
  let shouldAlert = true;

  if (errorMessage.includes('rate limit') || errorMessage.includes('Rate limit')) {
    statusCode = 429;
    userMessage = 'Service is temporarily busy. Please wait a moment and try again.';
    shouldAlert = false; // Don't alert for rate limits
  } else if (errorMessage.includes('quota') || errorMessage.includes('Quota')) {
    statusCode = 503;
    userMessage = 'Service temporarily unavailable. Please try again later.';
    shouldAlert = true; // Alert for quota issues
  } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    statusCode = 504;
    userMessage = 'Request timed out. Please try again.';
    shouldAlert = false; // Don't alert for timeouts
  }

  // Send alert for serious errors (throttled)
  if (shouldAlert) {
    try {
      await alertError(errorMessage, context);
    } catch (alertError) {
      console.error('[Alert] Failed to send error alert:', alertError);
    }
  }

  res.status(statusCode).json({
    error: userMessage,
    context,
    retryAfter: statusCode === 429 ? 60 : undefined
  });
}

// ============================================================
// TRAFFIC MONITORING
// ============================================================

interface TrafficStats {
  hourlyRequests: Map<string, number>;
  lastSpikeAlert: string | null;
}

const trafficStats: TrafficStats = {
  hourlyRequests: new Map(),
  lastSpikeAlert: null
};

const TRAFFIC_SPIKE_THRESHOLD = 100; // Requests per hour

export function trackRequest(req: Request): void {
  const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const current = trafficStats.hourlyRequests.get(hourKey) || 0;
  trafficStats.hourlyRequests.set(hourKey, current + 1);

  // Clean old entries (keep last 24 hours)
  for (const [key] of trafficStats.hourlyRequests) {
    if (key < new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 13)) {
      trafficStats.hourlyRequests.delete(key);
    }
  }

  // Check for spike
  const hourlyCount = trafficStats.hourlyRequests.get(hourKey) || 0;
  if (hourlyCount >= TRAFFIC_SPIKE_THRESHOLD && trafficStats.lastSpikeAlert !== hourKey) {
    alertTrafficSpike(hourlyCount, hourKey).catch(console.error);
    trafficStats.lastSpikeAlert = hourKey;
  }
}

export function trafficMonitorMiddleware(req: Request, _res: Response, next: NextFunction): void {
  trackRequest(req);
  next();
}

// ============================================================
// HEALTH CHECK
// ============================================================

export function getSystemHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  queues: {
    generation: ReturnType<RequestQueue['getStats']>;
    api: ReturnType<RequestQueue['getStats']>;
  };
  traffic: {
    currentHour: number;
    lastHour: number;
  };
} {
  const genStats = generationQueue.getStats();
  const apiStats = apiQueue.getStats();

  const now = new Date();
  const currentHourKey = now.toISOString().slice(0, 13);
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  const lastHourKey = lastHour.toISOString().slice(0, 13);

  const currentHourTraffic = trafficStats.hourlyRequests.get(currentHourKey) || 0;
  const lastHourTraffic = trafficStats.hourlyRequests.get(lastHourKey) || 0;

  // Determine health status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (genStats.queued > genStats.maxQueue * 0.8 || apiStats.queued > apiStats.maxQueue * 0.8) {
    status = 'unhealthy';
  } else if (genStats.queued > genStats.maxQueue * 0.5 || apiStats.queued > apiStats.maxQueue * 0.5) {
    status = 'degraded';
  }

  return {
    status,
    queues: {
      generation: genStats,
      api: apiStats
    },
    traffic: {
      currentHour: currentHourTraffic,
      lastHour: lastHourTraffic
    }
  };
}

// ============================================================
// GRACEFUL DEGRADATION RESPONSE
// ============================================================

export function gracefulDegradationResponse(res: Response, message?: string): void {
  res.status(503).json({
    error: message || 'Service is experiencing high demand. Please try again in a few minutes.',
    retryAfter: 120,
    status: 'busy'
  });
}
