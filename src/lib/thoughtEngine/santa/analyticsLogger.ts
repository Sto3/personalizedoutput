/**
 * Santa Message Analytics & Logging
 *
 * Tracks usage, generation metrics, and provides insights.
 * Designed for future database integration.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// TYPES
// ============================================================

export interface SantaGenerationLog {
  id: string;
  timestamp: string;
  childName: string;
  childAge: number;
  scenario: string;

  // Generation metrics
  scriptWordCount: number;
  scriptCharCount: number;
  estimatedDuration: number;
  generationTimeMs: number;

  // Quality metrics
  nameOccurrences: number;
  specificDetailsUsed: number;
  safetyCheckPassed: boolean;
  safetyIssues: string[];

  // TTS metrics
  ttsSuccess: boolean;
  ttsRetries: number;
  audioSizeBytes?: number;
  audioDurationSeconds?: number;

  // Status
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

export interface UsageStats {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageScriptWordCount: number;
  averageGenerationTimeMs: number;
  scenarioBreakdown: Record<string, number>;
  ageBreakdown: Record<string, number>;
  errorBreakdown: Record<string, number>;
}

// ============================================================
// LOGGER CLASS
// ============================================================

export class SantaAnalyticsLogger {
  private logs: SantaGenerationLog[] = [];
  private logFilePath: string;
  private sessionId: string;

  constructor(logDirectory: string = 'outputs/logs') {
    this.sessionId = this.generateSessionId();
    this.logFilePath = path.join(logDirectory, `santa-analytics-${this.formatDate()}.json`);

    // Ensure log directory exists
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory, { recursive: true });
    }

    // Load existing logs if any
    this.loadLogs();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private formatDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const data = fs.readFileSync(this.logFilePath, 'utf-8');
        this.logs = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load existing logs:', error);
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      fs.writeFileSync(this.logFilePath, JSON.stringify(this.logs, null, 2));
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }

  // ============================================================
  // LOGGING METHODS
  // ============================================================

  public startGeneration(childName: string, childAge: number, scenario: string): string {
    const id = `gen-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const log: SantaGenerationLog = {
      id,
      timestamp: new Date().toISOString(),
      childName,
      childAge,
      scenario,
      scriptWordCount: 0,
      scriptCharCount: 0,
      estimatedDuration: 0,
      generationTimeMs: 0,
      nameOccurrences: 0,
      specificDetailsUsed: 0,
      safetyCheckPassed: false,
      safetyIssues: [],
      ttsSuccess: false,
      ttsRetries: 0,
      status: 'partial'
    };

    this.logs.push(log);
    return id;
  }

  public updateScriptMetrics(
    id: string,
    script: string,
    childName: string,
    generationTimeMs: number
  ): void {
    const log = this.findLog(id);
    if (!log) return;

    const words = script.split(/\s+/).filter(w => w.length > 0);
    const nameRegex = new RegExp(`\\b${childName}\\b`, 'gi');
    const nameMatches = script.match(nameRegex) || [];

    log.scriptWordCount = words.length;
    log.scriptCharCount = script.length;
    log.estimatedDuration = words.length / 2.5; // 2.5 words per second
    log.generationTimeMs = generationTimeMs;
    log.nameOccurrences = nameMatches.length;

    this.saveLogs();
  }

  public updateSafetyCheck(
    id: string,
    passed: boolean,
    issues: string[]
  ): void {
    const log = this.findLog(id);
    if (!log) return;

    log.safetyCheckPassed = passed;
    log.safetyIssues = issues;

    this.saveLogs();
  }

  public updateTTSResult(
    id: string,
    success: boolean,
    retries: number,
    audioSizeBytes?: number,
    audioDurationSeconds?: number
  ): void {
    const log = this.findLog(id);
    if (!log) return;

    log.ttsSuccess = success;
    log.ttsRetries = retries;
    log.audioSizeBytes = audioSizeBytes;
    log.audioDurationSeconds = audioDurationSeconds;

    if (success && log.safetyCheckPassed) {
      log.status = 'success';
    } else if (success || log.safetyCheckPassed) {
      log.status = 'partial';
    }

    this.saveLogs();
  }

  public markFailed(id: string, error: string): void {
    const log = this.findLog(id);
    if (!log) return;

    log.status = 'failed';
    log.error = error;

    this.saveLogs();
  }

  private findLog(id: string): SantaGenerationLog | undefined {
    return this.logs.find(l => l.id === id);
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  public getStats(): UsageStats {
    const successfulLogs = this.logs.filter(l => l.status === 'success');
    const failedLogs = this.logs.filter(l => l.status === 'failed');

    const scenarioBreakdown: Record<string, number> = {};
    const ageBreakdown: Record<string, number> = {};
    const errorBreakdown: Record<string, number> = {};

    let totalWordCount = 0;
    let totalGenerationTime = 0;

    for (const log of this.logs) {
      // Scenario breakdown
      scenarioBreakdown[log.scenario] = (scenarioBreakdown[log.scenario] || 0) + 1;

      // Age breakdown (group by age)
      const ageGroup = `age_${log.childAge}`;
      ageBreakdown[ageGroup] = (ageBreakdown[ageGroup] || 0) + 1;

      // Metrics
      totalWordCount += log.scriptWordCount;
      totalGenerationTime += log.generationTimeMs;

      // Errors
      if (log.error) {
        const errorType = this.categorizeError(log.error);
        errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
      }
    }

    return {
      totalGenerations: this.logs.length,
      successfulGenerations: successfulLogs.length,
      failedGenerations: failedLogs.length,
      averageScriptWordCount: this.logs.length > 0
        ? Math.round(totalWordCount / this.logs.length)
        : 0,
      averageGenerationTimeMs: this.logs.length > 0
        ? Math.round(totalGenerationTime / this.logs.length)
        : 0,
      scenarioBreakdown,
      ageBreakdown,
      errorBreakdown
    };
  }

  private categorizeError(error: string): string {
    if (error.includes('API')) return 'api_error';
    if (error.includes('TTS') || error.includes('ElevenLabs')) return 'tts_error';
    if (error.includes('safety')) return 'safety_error';
    if (error.includes('validation')) return 'validation_error';
    return 'other_error';
  }

  public getRecentLogs(count: number = 10): SantaGenerationLog[] {
    return this.logs.slice(-count).reverse();
  }

  public getDailyStats(): Record<string, { count: number; success: number }> {
    const dailyStats: Record<string, { count: number; success: number }> = {};

    for (const log of this.logs) {
      const date = log.timestamp.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, success: 0 };
      }
      dailyStats[date].count++;
      if (log.status === 'success') {
        dailyStats[date].success++;
      }
    }

    return dailyStats;
  }

  // ============================================================
  // EXPORT
  // ============================================================

  public exportToCSV(): string {
    const headers = [
      'id', 'timestamp', 'childName', 'childAge', 'scenario',
      'wordCount', 'duration', 'genTimeMs', 'nameOccurrences',
      'safetyPassed', 'ttsSuccess', 'status'
    ].join(',');

    const rows = this.logs.map(log => [
      log.id,
      log.timestamp,
      `"${log.childName}"`,
      log.childAge,
      log.scenario,
      log.scriptWordCount,
      Math.round(log.estimatedDuration),
      log.generationTimeMs,
      log.nameOccurrences,
      log.safetyCheckPassed,
      log.ttsSuccess,
      log.status
    ].join(','));

    return [headers, ...rows].join('\n');
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let loggerInstance: SantaAnalyticsLogger | null = null;

export function getLogger(): SantaAnalyticsLogger {
  if (!loggerInstance) {
    loggerInstance = new SantaAnalyticsLogger();
  }
  return loggerInstance;
}

// ============================================================
// QUICK LOG HELPERS
// ============================================================

export function logGeneration(
  childName: string,
  childAge: number,
  scenario: string
): string {
  return getLogger().startGeneration(childName, childAge, scenario);
}

export function logScriptComplete(
  id: string,
  script: string,
  childName: string,
  timeMs: number
): void {
  getLogger().updateScriptMetrics(id, script, childName, timeMs);
}

export function logTTSComplete(
  id: string,
  success: boolean,
  retries: number,
  audioSize?: number,
  duration?: number
): void {
  getLogger().updateTTSResult(id, success, retries, audioSize, duration);
}

export function logError(id: string, error: string): void {
  getLogger().markFailed(id, error);
}

export function getUsageStats(): UsageStats {
  return getLogger().getStats();
}
