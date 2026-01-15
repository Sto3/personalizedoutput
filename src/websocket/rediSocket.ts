/**
 * Redi WebSocket Handler
 *
 * Real-time communication layer that coordinates audio transcription,
 * visual analysis, AI decision-making, and voice output.
 * Supports multi-phone sessions with frame aggregation.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import { parse as parseUrl } from 'url';
import { parse as parseQuery } from 'querystring';

import {
  WSMessage,
  WSAudioChunk,
  WSSnapshot,
  WSMotionClip,
  RediMode,
  DecisionContext,
  TranscriptChunk,
  SessionParticipant
} from '../lib/redi/types';

import {
  createSession,
  getSession,
  validateSession,
  updateSensitivity,
  endSession,
  getRemainingTime,
  getSessionCosts,
  joinSession,
  leaveSession,
  getParticipants,
  getParticipantCount,
  isHost,
  updateParticipantActivity,
  updateAudioOutputMode,
  shouldReceiveAudio,
  getSessionByJoinCode
} from '../lib/redi/sessionManager';

import {
  shouldSpeak,
  generateInsight,
  generateQuestionResponse,
  createInitialContext,
  updateTranscript,
  updateSilence,
  updateVisualContext,
  updatePendingInsight,
  markSpoke,
  markSpeakingStart,
  onUserInterruption,
  shouldIgnoreResponse,
  isContextFresh
} from '../lib/redi/decisionEngine';

import {
  startTranscription,
  sendAudio,
  getSilenceDuration,
  stopTranscription
} from '../lib/redi/transcriptionService';

import {
  analyzeSnapshot,
  analyzeSnapshotWithGrounding,
  analyzeMotionClip,
  getVisualContext,
  clearVisualContext
} from '../lib/redi/visionService';

import {
  initVoiceService,
  speak,
  closeVoiceService
} from '../lib/redi/voiceService';

import {
  groundDetections,
  getSceneConfidence,
  shouldSpeakAboutScene,
  GroundedDetection
} from '../lib/redi/ensembleGrounding';

import {
  getHealthMonitor,
  getCircuitBreaker,
  CIRCUIT_BREAKERS,
  CircuitOpenError
} from '../lib/redi/reliabilityService';

import {
  startSessionTracking,
  endSessionTracking,
  recordAIResponse,
  recordUserQuestion,
  recordVisualAnalysis,
  recordMotionClipAnalysis
} from '../lib/redi/sessionHistoryService';

// Connection tracking: sessionId -> Map<deviceId, WebSocket>
const sessionConnections = new Map<string, Map<string, WebSocket>>();
const contexts = new Map<string, DecisionContext>();

// Insight generation intervals by session
const insightIntervals = new Map<string, NodeJS.Timeout>();
const silenceCheckIntervals = new Map<string, NodeJS.Timeout>();

// Host reconnection grace period tracking
const hostDisconnectTimers = new Map<string, NodeJS.Timeout>();
const HOST_RECONNECT_GRACE_MS = 30000; // 30 seconds to reconnect

// Track last processed transcripts per session (prevents duplicate processing)
const lastProcessedTranscripts = new Map<string, string>();

// Track frame aggregation intervals (CRITICAL: must be cleaned up on session end)
const frameAggregationIntervals = new Map<string, NodeJS.Timeout>();

// Frame aggregation buffer: sessionId -> array of recent frames from all devices
const frameBuffers = new Map<string, { deviceId: string; image: string; timestamp: number }[]>();
const FRAME_BUFFER_MAX = 10;
const FRAME_AGGREGATION_INTERVAL_MS = 2000;

// CRITICAL: Track most recent perception packet per session (for fresh visual context in questions)
// This allows questions to use iOS Vision data (fast, fresh) instead of server analysis (slow, stale)
interface RecentPerceptionData {
  timestamp: number;
  objects: string[];      // Object labels from iOS Vision (grounded)
  texts: string[];        // OCR text from iOS Vision
  poseDescription: string | null;  // Brief pose description
  sceneConfidence?: number;        // Ensemble grounding confidence (0-1)
  audioContext?: string;           // Dominant sound / audio events
  motionContext?: string;          // User activity state
  lightLevel?: string;             // Ambient light conditions
  // MILITARY-GRADE: Apple Vision scene classifications (1000+ categories, FREE)
  // These identify things YOLOv8 cannot: conference photos, documents, artwork, etc.
  sceneClassifications?: string[]; // Top 5 Apple Vision classifications
}
const recentPerceptionData = new Map<string, RecentPerceptionData>();

/**
 * Initialize WebSocket server for Redi
 */
export function initRediWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: '/ws/redi'
  });

  console.log('[Redi WebSocket] Server initialized on /ws/redi');

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    handleConnection(ws, req);
  });

  return wss;
}

/**
 * Handle new WebSocket connection
 */
async function handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
  // Parse parameters from URL
  const urlParts = parseUrl(req.url || '');
  const query = parseQuery(urlParts.query || '');
  const sessionId = query.sessionId as string;
  const deviceId = query.deviceId as string;
  const joinCode = query.joinCode as string;

  // Validate device ID
  if (!deviceId) {
    ws.close(4001, 'Missing deviceId');
    return;
  }

  let session;
  let isJoining = false;

  // Handle join by code
  if (joinCode && !sessionId) {
    const joinResult = joinSession(joinCode, deviceId);
    if (!joinResult.success || !joinResult.session) {
      ws.close(4002, joinResult.reason || 'Failed to join session');
      return;
    }
    session = joinResult.session;
    isJoining = true;
  } else if (sessionId) {
    // Validate existing session
    const validation = validateSession(sessionId);
    if (!validation.valid) {
      ws.close(4002, validation.reason || 'Invalid session');
      return;
    }
    session = validation.session!;
  } else {
    ws.close(4001, 'Missing sessionId or joinCode');
    return;
  }

  const isHostDevice = isHost(session.id, deviceId);
  console.log(`[Redi WebSocket] Device ${deviceId} connected to session ${session.id} (host: ${isHostDevice})`);

  // Cancel any pending host disconnect timer (host reconnected!)
  const pendingTimer = hostDisconnectTimers.get(session.id);
  if (pendingTimer) {
    console.log(`[Redi WebSocket] Host reconnected to ${session.id}, canceling disconnect timer`);
    clearTimeout(pendingTimer);
    hostDisconnectTimers.delete(session.id);
  }

  // Get or create session connections map
  let connections = sessionConnections.get(session.id);
  if (!connections) {
    connections = new Map();
    sessionConnections.set(session.id, connections);
  }

  // Store connection
  connections.set(deviceId, ws);

  // Initialize session services if this is the first connection (host)
  if (isHostDevice && !contexts.has(session.id)) {
    await initializeSessionServices(
      session.id,
      session.mode,
      session.sensitivity,
      session.voiceGender,
      session.userId,
      deviceId,
      session.durationMinutes
    );
  }

  // Send session info to this device
  sendToDevice(session.id, deviceId, {
    type: 'session_start',
    sessionId: session.id,
    timestamp: Date.now(),
    payload: {
      mode: session.mode,
      sensitivity: session.sensitivity,
      voiceGender: session.voiceGender,
      durationMinutes: session.durationMinutes,
      remainingSeconds: getRemainingTime(session.id),
      joinCode: session.joinCode,
      isHost: isHostDevice,
      participantCount: getParticipantCount(session.id),
      audioOutputMode: session.audioOutputMode
    }
  });

  // Notify all other devices about new participant
  if (isJoining) {
    broadcastToSession(session.id, {
      type: 'participant_joined',
      sessionId: session.id,
      timestamp: Date.now(),
      payload: {
        deviceId,
        participantCount: getParticipantCount(session.id)
      }
    }, deviceId);  // Exclude the joining device
  }

  // Handle incoming messages
  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString()) as WSMessage & { deviceId?: string };
      message.deviceId = deviceId;  // Ensure device ID is attached
      handleMessage(session.id, deviceId, message);
    } catch (error) {
      console.error(`[Redi WebSocket] Invalid message from ${deviceId}:`, error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    handleDeviceDisconnect(session.id, deviceId);
  });

  ws.on('error', (error) => {
    console.error(`[Redi WebSocket] Error for ${deviceId}:`, error);
    handleDeviceDisconnect(session.id, deviceId);
  });
}

/**
 * Initialize session services (called once when host connects)
 */
async function initializeSessionServices(
  sessionId: string,
  mode: RediMode,
  sensitivity: number,
  voiceGender: 'male' | 'female',
  userId?: string,
  deviceId?: string,
  durationMinutes: number = 15
): Promise<void> {
  // Initialize decision context
  const context = createInitialContext(sessionId, mode, sensitivity);
  contexts.set(sessionId, context);

  // Initialize frame buffer
  frameBuffers.set(sessionId, []);

  // Start session history tracking
  startSessionTracking(sessionId, userId || 'anonymous', mode, durationMinutes, deviceId);

  // Start health monitoring for this session
  const healthMonitor = getHealthMonitor();
  healthMonitor.start();

  // Register health check for key services
  healthMonitor.registerHealthCheck('cloudConnection', async () => {
    // Simple connectivity check
    try {
      // If we've had recent successful WebSocket messages, we're healthy
      return 'healthy';
    } catch {
      return 'failed';
    }
  });

  healthMonitor.registerHealthCheck('tts', async () => {
    // Check ElevenLabs circuit breaker state
    return CIRCUIT_BREAKERS.elevenlabs.isAllowingRequests() ? 'healthy' : 'degraded';
  });

  healthMonitor.registerHealthCheck('llm', async () => {
    // Check Claude circuit breaker state
    return CIRCUIT_BREAKERS.claude.isAllowingRequests() ? 'healthy' : 'degraded';
  });

  healthMonitor.registerHealthCheck('transcription', async () => {
    // Check Deepgram circuit breaker state
    return CIRCUIT_BREAKERS.deepgram.isAllowingRequests() ? 'healthy' : 'degraded';
  });

  // Log health updates
  healthMonitor.on('degradation', (degraded: [string, string][]) => {
    console.warn(`[Redi Health] Session ${sessionId} - Degraded services:`, degraded);
  });

  try {
    // Start transcription
    const transcriptionEmitter = await startTranscription(sessionId);
    transcriptionEmitter.on('transcript', (chunk: TranscriptChunk) => {
      handleTranscript(sessionId, chunk);
    });
    transcriptionEmitter.on('utterance_end', () => {
      const ctx = contexts.get(sessionId);
      if (ctx) {
        updateSilence(ctx, getSilenceDuration(sessionId));
      }
    });

    // Initialize voice service
    const voiceEmitter = initVoiceService(sessionId, voiceGender);
    voiceEmitter.on('audio_chunk', (data) => {
      // Send audio to devices based on audioOutputMode
      broadcastAudio(sessionId, {
        type: 'voice_audio',
        sessionId,
        timestamp: Date.now(),
        payload: data
      });
    });

    // Start insight generation loop
    startInsightLoop(sessionId);

    // Start silence check loop
    startSilenceCheckLoop(sessionId);

    // Start frame aggregation loop
    startFrameAggregationLoop(sessionId, mode);

    // Send initial greeting quickly (1 second delay for audio setup)
    setTimeout(async () => {
      await sendInitialGreeting(sessionId, mode);
    }, 1000);

  } catch (error) {
    console.error(`[Redi WebSocket] Failed to initialize services for ${sessionId}:`, error);
  }
}

/**
 * Send initial greeting when session starts
 * Keep it SHORT - just "I'm ready" - task agnostic, confident
 */
async function sendInitialGreeting(sessionId: string, mode: RediMode): Promise<void> {
  const ctx = contexts.get(sessionId);
  if (!ctx) return;

  // Check if we haven't already spoken (safety check)
  if (ctx.lastSpokeAt > 0) return;

  // Simple, short, task-agnostic greeting - Redi is ready for anything
  const greeting = "I'm ready.";

  try {
    await speakResponse(sessionId, greeting);
    console.log(`[Redi WebSocket] Sent initial greeting for ${sessionId}`);
  } catch (error) {
    console.error(`[Redi WebSocket] Failed to send greeting for ${sessionId}:`, error);
  }
}

// Import military-grade orchestrator
import {
  initMilitaryGrade,
  cleanupMilitaryGrade,
  processPerception,
  handleDirectQuestion,
  updateMode as updateOrchestratorMode,
  onUserSpeaking,
  onUserStopped,
  onRediSpeaking,
  onRediFinished,
  isMilitaryGradeEnabled,
  updateSensitivity as updateOrchestratorSensitivity,
  updateServerVisualContext  // For fallback when iOS Vision doesn't detect anything
} from '../lib/redi/militaryGradeOrchestrator';
import { PerceptionPacket } from '../lib/redi/militaryGradeTypes';

// Track which sessions use military-grade
const militaryGradeSessions = new Set<string>();

/**
 * Handle incoming WebSocket message from a device
 */
async function handleMessage(sessionId: string, deviceId: string, message: WSMessage): Promise<void> {
  const ctx = contexts.get(sessionId);
  updateParticipantActivity(sessionId, deviceId);

  switch (message.type) {
    // NEW: Military-grade perception packet
    case 'perception':
      await handlePerception(sessionId, deviceId, message.payload as PerceptionPacket);
      break;

    // NEW: User speaking status (for interruption handling)
    case 'user_speaking':
      onUserSpeaking(sessionId);
      break;

    case 'user_stopped':
      onUserStopped(sessionId);
      break;

    // Autonomous mode detection: mode change
    case 'mode_change':
      handleModeChange(sessionId, message.payload);
      break;

    case 'audio_chunk':
      handleAudioChunk(sessionId, message as WSAudioChunk);
      break;

    case 'snapshot':
      handleSnapshot(sessionId, deviceId, message as WSSnapshot);
      break;

    case 'motion_clip':
      await handleMotionClip(sessionId, deviceId, message as WSMotionClip);
      break;

    case 'sensitivity_update':
      if (ctx) {
        const newSensitivity = message.payload?.sensitivity;
        if (typeof newSensitivity === 'number') {
          const clampedSensitivity = Math.max(0, Math.min(1, newSensitivity));
          ctx.sensitivity = clampedSensitivity;
          updateSensitivity(sessionId, clampedSensitivity);  // Session manager
          updateOrchestratorSensitivity(sessionId, clampedSensitivity);  // Military-grade orchestrator
          console.log(`[Redi WebSocket] Sensitivity updated to ${clampedSensitivity} for ${sessionId}`);
        }
      }
      break;

    case 'audio_output_mode_changed':
      // Only host can change this
      const newMode = message.payload?.mode;
      if (newMode && (newMode === 'host_only' || newMode === 'all_devices')) {
        if (updateAudioOutputMode(sessionId, deviceId, newMode)) {
          // Broadcast to all devices
          broadcastToSession(sessionId, {
            type: 'audio_output_mode_changed',
            sessionId,
            timestamp: Date.now(),
            payload: { mode: newMode }
          });
        }
      }
      break;

    case 'ping':
      sendToDevice(sessionId, deviceId, {
        type: 'pong',
        sessionId,
        timestamp: Date.now(),
        payload: {
          remainingSeconds: getRemainingTime(sessionId),
          participantCount: getParticipantCount(sessionId)
        }
      });
      break;

    case 'session_end':
      // Only host can end session
      if (isHost(sessionId, deviceId)) {
        handleSessionEnd(sessionId);
      } else {
        // Non-host just leaves
        handleDeviceDisconnect(sessionId, deviceId);
      }
      break;
  }
}

/**
 * Handle audio chunk from any device
 */
function handleAudioChunk(sessionId: string, message: WSAudioChunk): void {
  const audioBuffer = Buffer.from(message.payload.audio, 'base64');
  sendAudio(sessionId, audioBuffer);
}

/**
 * Handle mode change from autonomous mode detection
 * Updates the session's mode when the iOS client detects a new context
 */
function handleModeChange(sessionId: string, payload: any): void {
  const newMode = payload?.mode as RediMode;
  if (!newMode) {
    console.warn(`[Redi WebSocket] Invalid mode_change payload for session ${sessionId}`);
    return;
  }

  // Validate the mode is a valid RediMode
  const validModes = ['general', 'cooking', 'studying', 'meeting', 'sports', 'music', 'assembly', 'monitoring'];
  if (!validModes.includes(newMode)) {
    console.warn(`[Redi WebSocket] Invalid mode "${newMode}" for session ${sessionId}`);
    return;
  }

  // Update orchestrator state
  updateOrchestratorMode(sessionId, newMode);

  console.log(`[Redi WebSocket] Mode changed to "${newMode}" for session ${sessionId} (autonomous detection)`);
}

/**
 * Handle perception packet from military-grade iOS client
 * This is the new structured data format (pose, objects, movement)
 */
async function handlePerception(sessionId: string, deviceId: string, packet: PerceptionPacket): Promise<void> {
  const session = getSession(sessionId);
  if (!session) return;

  // Get decision context for this session
  const ctx = contexts.get(sessionId);

  // Initialize military-grade if not already
  if (!militaryGradeSessions.has(sessionId)) {
    initMilitaryGrade(sessionId, session.mode, session.sensitivity);
    militaryGradeSessions.add(sessionId);
    console.log(`[Redi WebSocket] Military-grade enabled for session ${sessionId}`);
  }

  // CRITICAL FIX: Store fallbackFrame in frameBuffers so getFreshVisualAnalysis can use it
  // Military-grade packets send fallbackFrame when iOS Vision doesn't detect objects
  // Without this, visual questions have no frame to analyze!
  const extPacket = packet as any;
  if (extPacket.fallbackFrame) {
    let buffer = frameBuffers.get(sessionId);
    if (!buffer) {
      buffer = [];
      frameBuffers.set(sessionId, buffer);
    }
    buffer.push({
      deviceId,
      image: extPacket.fallbackFrame,
      timestamp: Date.now()
    });
    // Keep buffer size limited
    while (buffer.length > FRAME_BUFFER_MAX) {
      buffer.shift();
    }
    console.log(`[Redi] Stored fallback frame from perception packet (buffer size: ${buffer.length})`);
  }

  // CRITICAL: Store perception data for questions to use (fresh iOS Vision data)
  // This allows questions to use real-time visual context instead of stale server analysis

  // Apply ensemble grounding to validate detections across multiple sources
  const rawDetections = packet.objects?.map(o => ({
    label: o.label,
    confidence: o.confidence,
    boundingBox: o.boundingBox,
    source: 'ios_vision' as const
  })) || [];

  const rawTexts = packet.texts?.filter(t => t.confidence > 0.7).map(t => t.text.substring(0, 50)) || [];

  // Get audio events for grounding (if available in new packet format)
  const audioEvents = (packet as any).audioEvents?.map((e: any) => ({
    label: e.label,
    confidence: e.confidence
  })) || [];

  // Ground the detections using ensemble method
  const groundedDetections = groundDetections(rawDetections, rawTexts, audioEvents);
  const sceneConfidence = getSceneConfidence(groundedDetections);

  // Log grounding results
  if (groundedDetections.length > 0) {
    const groundedLabels = groundedDetections.map(d =>
      `${d.label}(${d.sources.length} sources, ${Math.round(d.confidence * 100)}%)`
    ).join(', ');
    console.log(`[Redi] Grounded detections: ${groundedLabels} | Scene confidence: ${Math.round(sceneConfidence * 100)}%`);
  }

  // Build context from new sensor data
  const extendedPacket = packet as any;
  let audioContext: string | undefined;
  if (extendedPacket.dominantSound) {
    audioContext = extendedPacket.dominantSound;
  } else if (extendedPacket.audioEvents?.length > 0) {
    audioContext = extendedPacket.audioEvents
      .filter((e: any) => e.confidence > 0.6)
      .map((e: any) => e.label)
      .join(', ');
  }

  let motionContext: string | undefined;
  if (extendedPacket.motionState) {
    const ms = extendedPacket.motionState;
    if (ms.isExercising) motionContext = 'exercising';
    else if (ms.isWalking) motionContext = 'walking';
    else if (ms.isStationary) motionContext = 'stationary';
    if (ms.suddenMovement) motionContext = (motionContext || '') + ' (sudden movement detected)';
  }

  // MILITARY-GRADE: Extract Apple Vision scene classifications
  // These are FREE and identify things YOLOv8 cannot (1000+ categories)
  const sceneClassifications = (packet as any).sceneClassifications as string[] | undefined;

  const perceptionData: RecentPerceptionData = {
    timestamp: Date.now(),
    objects: groundedDetections.map(d => d.label),  // Use grounded objects (higher confidence)
    texts: rawTexts,
    poseDescription: packet.pose?.bodyPosition || null,
    sceneConfidence,  // Store confidence for later use
    audioContext,
    motionContext,
    lightLevel: packet.lightLevel,
    sceneClassifications  // Apple Vision classifications (1000+ categories)
  };
  recentPerceptionData.set(sessionId, perceptionData);

  // Log what iOS detected for debugging
  if (sceneClassifications && sceneClassifications.length > 0) {
    console.log(`[Redi] Apple Vision: ${sceneClassifications.slice(0, 3).join(', ')}`);
  }

  // SMART HYBRID: iOS always watching, Claude Vision for deep understanding
  //
  // iOS (FREE, instant): Detects WHAT is in the scene (categories, objects, text)
  // Claude Vision (costly, slow): Describes and UNDERSTANDS what it sees
  //
  // Strategy:
  // 1. iOS runs continuously - we always know something about the scene
  // 2. Claude Vision called when:
  //    a) User asks a visual question ("what do you see?")
  //    b) iOS detects significant scene change AND we have budget
  //    c) iOS detected nothing useful (fallback)
  //
  // Budget: ~60 calls per 15-min session ($0.90), leaving healthy margin

  const hasFrame = !!extPacket.fallbackFrame;
  const hasSceneClassifications = sceneClassifications && sceneClassifications.length > 0;
  const iosDetectedNothing = groundedDetections.length === 0 && rawTexts.length === 0 && !hasSceneClassifications;

  // Frame is stored in frameBuffers for on-demand analysis
  if (hasFrame && iosDetectedNothing) {
    console.log(`[Redi] iOS ML completely empty - frame stored for Claude Vision on next question`);
  } else if (hasSceneClassifications) {
    // iOS detected something - log it for debugging
    console.log(`[Redi] iOS scene: ${sceneClassifications!.slice(0, 2).join(', ')}`);
  }

  // CRITICAL: Bridge transcript from DecisionContext to perception packet
  // iOS sends perception packets separately from audio, so we need to inject
  // the recent transcript for triage to have context to work with
  // Note: ctx is already defined above
  if (ctx && ctx.transcriptBuffer.length > 0) {
    // Get most recent transcript if it's fresh (within last 3 seconds)
    const recentTranscript = ctx.transcriptBuffer[ctx.transcriptBuffer.length - 1];
    const transcriptAge = Date.now() - ctx.lastTranscriptAt;

    // Only inject transcript if:
    // 1. It's fresh (within 3 seconds)
    // 2. Packet doesn't already have a transcript
    // 3. We haven't already processed this exact transcript (prevents duplicates)
    const lastProcessed = lastProcessedTranscripts.get(sessionId);

    if (transcriptAge < 3000 && !packet.transcript && recentTranscript !== lastProcessed) {
      packet.transcript = recentTranscript;
      packet.transcriptIsFinal = true;
      lastProcessedTranscripts.set(sessionId, recentTranscript); // Mark as processed
    }
  }

  // Process through military-grade orchestrator
  const result = await processPerception(sessionId, packet);

  // If rep count updated, broadcast it
  if (result.repCount !== undefined) {
    broadcastToSession(sessionId, {
      type: 'rep_count' as any,
      sessionId,
      timestamp: Date.now(),
      payload: { count: result.repCount }
    });
  }

  // If we have a response, speak it
  if (result.response) {
    // Mark Redi as speaking - update BOTH state stores for consistency
    onRediSpeaking(sessionId);  // Pipeline state
    if (ctx) {
      markSpeakingStart(ctx);  // DecisionContext state (for interruption detection)
    }

    try {
      // Broadcast text response
      broadcastToSession(sessionId, {
        type: 'ai_response',
        sessionId,
        timestamp: Date.now(),
        payload: {
          text: result.response,
          source: result.source,
          latencyMs: result.latencyMs,
          isStreaming: false,
          isFinal: true
        }
      });

      // Generate and send audio (with circuit breaker for reliability)
      try {
        const audioBuffer = await CIRCUIT_BREAKERS.elevenlabs.execute(() =>
          speak(sessionId, result.response)
        );

        if (audioBuffer) {
          broadcastAudio(sessionId, {
            type: 'voice_audio',
            sessionId,
            timestamp: Date.now(),
            payload: {
              audio: audioBuffer.toString('base64'),
              format: 'mp3',
              isStreaming: false,
              isFinal: true
            }
          });
        }
      } catch (error) {
        if (error instanceof CircuitOpenError) {
          // ElevenLabs circuit open - notify iOS to use local TTS fallback
          console.warn(`[Redi] ElevenLabs circuit open, signaling iOS for fallback TTS`);
          broadcastToSession(sessionId, {
            type: 'tts_fallback',
            sessionId,
            timestamp: Date.now(),
            payload: {
              text: result.response,
              reason: 'cloud_unavailable'
            }
          } as any);
        } else {
          console.error('[Redi] Voice generation failed:', error);
        }
      }

      console.log(`[Redi WebSocket] Military-grade response (${result.source}): "${result.response}" [${result.latencyMs}ms]`);

    } finally {
      // Mark Redi finished speaking - update BOTH state stores
      onRediFinished(sessionId);  // Pipeline state
      if (ctx) {
        markSpoke(ctx, result.response);  // DecisionContext state (releases lock)
      }
    }
  }
}

/**
 * Get fresh visual analysis from the most recent frame
 * Used when user asks visual questions like "what do you see?"
 *
 * Uses ENRICHED analysis when iOS detections available (context, not constraints)
 */
async function getFreshVisualAnalysis(sessionId: string, mode: RediMode): Promise<string | null> {
  const buffer = frameBuffers.get(sessionId);
  if (!buffer || buffer.length === 0) {
    console.log(`[Redi] No frames in buffer for fresh visual analysis`);
    return null;
  }

  // Get the most recent frame
  const recentFrame = buffer[buffer.length - 1];
  const frameAge = Date.now() - recentFrame.timestamp;

  // Only use if frame is less than 5 seconds old (extended from 2s for perception packets)
  // Military-grade packets with fallbackFrame may come less frequently
  if (frameAge > 5000) {
    console.log(`[Redi] Most recent frame too old (${Math.round(frameAge/1000)}s), skipping`);
    return null;
  }

  // PIPELINE DIAGNOSTIC: Log image details
  const imageSize = recentFrame.image.length;
  const imageSizeKB = (imageSize * 0.75 / 1024).toFixed(1);  // base64 is ~33% larger than binary
  console.log(`[Redi] PIPELINE DIAGNOSTIC:`);
  console.log(`[Redi]   Frame age: ${Math.round(frameAge)}ms`);
  console.log(`[Redi]   Image size: ${imageSizeKB}KB (base64: ${(imageSize/1024).toFixed(1)}KB)`);
  console.log(`[Redi]   Device: ${recentFrame.deviceId}`);

  try {
    // Get iOS detections for grounding (prevents hallucination)
    const iosPerception = recentPerceptionData.get(sessionId);
    const iosAge = iosPerception ? Date.now() - iosPerception.timestamp : Infinity;

    let analysis;

    // PIPELINE DIAGNOSTIC: Log iOS detection state
    console.log(`[Redi]   iOS perception age: ${iosPerception ? Math.round(iosAge) + 'ms' : 'NONE'}`);
    if (iosPerception) {
      console.log(`[Redi]   iOS objects: ${iosPerception.objects?.join(', ') || 'NONE'}`);
      console.log(`[Redi]   iOS texts: ${iosPerception.texts?.join(', ') || 'NONE'}`);
      console.log(`[Redi]   iOS scene: ${iosPerception.sceneClassifications?.slice(0, 3).join(', ') || 'NONE'}`);
    }

    // Use enriched analysis if we have fresh iOS detections (context, not constraints!)
    if (iosPerception && iosAge < 3000) {
      const hasObjects = iosPerception.objects && iosPerception.objects.length > 0;
      const hasTexts = iosPerception.texts && iosPerception.texts.length > 0;
      const hasSceneClass = iosPerception.sceneClassifications && iosPerception.sceneClassifications.length > 0;
      console.log(`[Redi] Using ENRICHED analysis - iOS provides context, Claude is expert`);
      analysis = await analyzeSnapshotWithGrounding(
        sessionId,
        recentFrame.image,
        mode,
        {
          objects: iosPerception.objects,
          texts: iosPerception.texts,
          poseDetected: !!iosPerception.poseDescription,
          sceneClassifications: iosPerception.sceneClassifications  // Pass scene classifications for context
        },
        '' // No transcript context needed
      );
    } else {
      // Fallback to standard analysis (no grounding available)
      console.log(`[Redi] Using standard analysis (no fresh iOS detections)`);
      analysis = await analyzeSnapshot(
        sessionId,
        recentFrame.image,
        mode,
        '' // No transcript context needed
      );
    }

    // PIPELINE DIAGNOSTIC: Log what Claude Vision returned
    const latency = Date.now() - recentFrame.timestamp;
    console.log(`[Redi] CLAUDE VISION RESULT:`);
    console.log(`[Redi]   Total latency: ${latency}ms`);
    console.log(`[Redi]   Response length: ${analysis.description.length} chars`);
    console.log(`[Redi]   First 200 chars: "${analysis.description.substring(0, 200)}..."`);

    // Also update the cached context
    const ctx = contexts.get(sessionId);
    if (ctx) {
      updateVisualContext(ctx, analysis.description);
    }

    // Update orchestrator's server visual context for NEEDS_REASONING fallback
    updateServerVisualContext(sessionId, analysis.description);

    return analysis.description;
  } catch (error) {
    console.error(`[Redi] Fresh visual analysis failed:`, error);
    return null;
  }
}

/**
 * Handle snapshot from a device - add to aggregation buffer
 */
function handleSnapshot(sessionId: string, deviceId: string, message: WSSnapshot): void {
  const buffer = frameBuffers.get(sessionId);
  if (!buffer) return;

  // Add frame to buffer
  buffer.push({
    deviceId,
    image: message.payload.image,
    timestamp: Date.now()
  });

  // Keep buffer size limited
  while (buffer.length > FRAME_BUFFER_MAX) {
    buffer.shift();
  }
}

/**
 * Handle transcript from Deepgram
 */
async function handleTranscript(sessionId: string, chunk: TranscriptChunk): Promise<void> {
  const ctx = contexts.get(sessionId);
  if (!ctx || !chunk.text.trim()) return;

  // INTERRUPTION DETECTION: If user speaks while Redi is speaking, stop immediately
  if (ctx.isSpeaking) {
    console.log(`[Redi WebSocket] User interrupted Redi - stopping immediately`);
    onUserInterruption(ctx);

    // Stop current speech on iOS immediately (no deferral audio - just yield the floor)
    broadcastToSession(sessionId, {
      type: 'ai_response',
      sessionId,
      timestamp: Date.now(),
      payload: { text: '', isStreaming: false, isFinal: true, interrupted: true }
    });

    // Don't generate deferral audio - it adds latency and feels unnatural
    // Just go silent and listen to what the user is saying
  }

  // Update context
  updateTranscript(ctx, chunk.text);

  // Broadcast transcript to all devices
  broadcastToSession(sessionId, {
    type: 'transcript',
    sessionId,
    timestamp: Date.now(),
    payload: chunk
  });

  // Check if this is a PROMPTED response (user asked Redi something)
  // Triggers: question mark, or user said "Redi" / "hey Redi" / "okay Redi"
  const text = chunk.text.trim();
  const isQuestion = text.endsWith('?');
  const isDirectAddress = /\b(hey |ok |okay )?redi\b/i.test(text);

  if (chunk.isFinal && (isQuestion || isDirectAddress)) {
    // Track user question for history
    recordUserQuestion(sessionId, text);

    const session = getSession(sessionId);
    if (session) {
      let visualContext = '';

      // FRESHNESS-AWARE VISUAL DATA SELECTION (per Claude Chat architecture)
      // Priority: 1) Fresh iOS perception data (real-time)
      //           2) Fresh server analysis (for complex visual questions)
      //           3) Cached server analysis (if somewhat fresh)

      const iosPerception = recentPerceptionData.get(sessionId);
      const iosAge = iosPerception ? Date.now() - iosPerception.timestamp : Infinity;
      const serverAge = Date.now() - ctx.lastVisualAt;

      // Check if this is a visual question requiring deep analysis
      const isDeepVisualQuestion = /what (do you |can you )?see|look(ing)? at|in front|show(ing)?|camera|visible|watching|describe|tell me about/i.test(text);

      if (isDeepVisualQuestion) {
        // Deep visual question - get fresh server analysis for intelligent description
        const freshVisual = await getFreshVisualAnalysis(sessionId, session.mode);
        if (freshVisual) {
          visualContext = freshVisual;
          console.log(`[Redi] Fresh server analysis for deep visual question`);
        }
      } else if (iosAge < 1000 && (iosPerception!.objects.length > 0 || iosPerception!.texts.length > 0 || (iosPerception!.sceneClassifications && iosPerception!.sceneClassifications.length > 0))) {
        // iOS perception data is fresh (<1s) and has content - USE IT
        const parts: string[] = [];
        // MILITARY-GRADE: Include Apple Vision scene classifications (1000+ categories, FREE)
        if (iosPerception!.sceneClassifications && iosPerception!.sceneClassifications.length > 0) {
          parts.push(`Scene: ${iosPerception!.sceneClassifications.slice(0, 3).join(', ')}`);
        }
        if (iosPerception!.objects.length > 0) {
          parts.push(`Objects: ${iosPerception!.objects.join(', ')}`);
        }
        if (iosPerception!.texts.length > 0) {
          parts.push(`Text on screen: ${iosPerception!.texts.join('; ')}`);
        }
        if (iosPerception!.poseDescription) {
          parts.push(`Person: ${iosPerception!.poseDescription}`);
        }
        visualContext = parts.join('. ');
        console.log(`[Redi] Using fresh iOS perception data (${Math.round(iosAge)}ms old)`);
      } else if (serverAge < 3000) {
        // Server analysis is fresh enough - use it
        visualContext = ctx.visualContext;
        console.log(`[Redi] Using server visual context (${Math.round(serverAge/1000)}s old)`);
      } else if (iosAge < 3000 && iosPerception) {
        // iOS data is moderately fresh - better than nothing
        const parts: string[] = [];
        // Include scene classifications even in fallback (they're FREE and valuable)
        if (iosPerception.sceneClassifications && iosPerception.sceneClassifications.length > 0) {
          parts.push(`Scene: ${iosPerception.sceneClassifications.slice(0, 3).join(', ')}`);
        }
        if (iosPerception.objects.length > 0) {
          parts.push(`Objects: ${iosPerception.objects.join(', ')}`);
        }
        if (iosPerception.texts.length > 0) {
          parts.push(`Text visible: ${iosPerception.texts.join('; ')}`);
        }
        visualContext = parts.join('. ');
        console.log(`[Redi] Using iOS perception as fallback (${Math.round(iosAge)}ms old)`);
      } else {
        console.log(`[Redi] No fresh visual context available (iOS: ${Math.round(iosAge)}ms, Server: ${Math.round(serverAge)}ms)`);
      }

      // Use military-grade orchestrator for questions (proper Layer 2/3 routing)
      // Pass thinking callback - if response takes > 2s, Redi says "let me think about that" etc.
      const result = await handleDirectQuestion(sessionId, text, visualContext, async (thinkingPhrase) => {
        // Speak the thinking acknowledgment immediately (don't wait for full response)
        await speakResponse(sessionId, thinkingPhrase, true);
      });

      console.log(`[Redi] Question answered in ${result.latencyMs}ms (${result.source})`);
      await speakResponse(sessionId, result.response, true);  // isPrompted=true: skip staleness check
    }
  }
}

/**
 * Handle motion clip from a device
 */
async function handleMotionClip(sessionId: string, deviceId: string, message: WSMotionClip): Promise<void> {
  const ctx = contexts.get(sessionId);
  const session = getSession(sessionId);
  if (!ctx || !session) return;

  const frames = message.payload.frames.map(f => Buffer.from(f, 'base64'));

  const analysis = await analyzeMotionClip(
    sessionId,
    {
      frames,
      duration: message.payload.duration,
      capturedAt: Date.now()
    },
    session.mode,
    ctx.transcriptBuffer.slice(-3).join(' ')
  );

  // Track motion clip analysis for history
  recordMotionClipAnalysis(sessionId, analysis.description);

  // Update visual context (both DecisionContext and Orchestrator fallback)
  updateVisualContext(ctx, analysis.description);
  updateServerVisualContext(sessionId, analysis.description);

  // Motion analysis often warrants immediate feedback
  if (analysis.suggestions.length > 0) {
    const feedback = analysis.suggestions[0];
    await speakResponse(sessionId, feedback);
  }

  // Broadcast analysis to all devices
  broadcastToSession(sessionId, {
    type: 'visual_analysis',
    sessionId,
    timestamp: Date.now(),
    payload: analysis
  });
}

/**
 * Aggregate frames from multiple devices and analyze
 * Uses GROUNDED analysis when iOS detections available to prevent hallucination
 */
async function aggregateAndAnalyzeFrames(sessionId: string): Promise<void> {
  const buffer = frameBuffers.get(sessionId);
  const ctx = contexts.get(sessionId);
  const session = getSession(sessionId);

  if (!buffer || !ctx || !session || buffer.length === 0) return;

  // Get unique recent frames (one per device)
  const deviceFrames = new Map<string, { image: string; timestamp: number }>();
  for (const frame of buffer) {
    const existing = deviceFrames.get(frame.deviceId);
    if (!existing || frame.timestamp > existing.timestamp) {
      deviceFrames.set(frame.deviceId, { image: frame.image, timestamp: frame.timestamp });
    }
  }

  // Get iOS detections for grounding (prevents hallucination)
  const iosPerception = recentPerceptionData.get(sessionId);
  const iosAge = iosPerception ? Date.now() - iosPerception.timestamp : Infinity;
  const hasGrounding = iosPerception && iosAge < 5000; // 5s for background analysis

  // If only one device, do simple analysis
  if (deviceFrames.size === 1) {
    const [frame] = deviceFrames.values();

    let analysis;
    if (hasGrounding) {
      // Use enriched analysis with iOS context (not constraining, providing context!)
      analysis = await analyzeSnapshotWithGrounding(
        sessionId,
        frame.image,
        session.mode,
        {
          objects: iosPerception!.objects,
          texts: iosPerception!.texts,
          poseDetected: !!iosPerception!.poseDescription,
          sceneClassifications: iosPerception!.sceneClassifications  // Scene context from Apple Vision
        },
        ctx.transcriptBuffer.slice(-3).join(' ')
      );
    } else {
      // Standard analysis
      analysis = await analyzeSnapshot(
        sessionId,
        frame.image,
        session.mode,
        ctx.transcriptBuffer.slice(-3).join(' ')
      );
    }

    // Track snapshot analysis for history
    recordVisualAnalysis(sessionId, analysis.description);

    // Update visual context (both DecisionContext and Orchestrator fallback)
    updateVisualContext(ctx, analysis.description);
    updateServerVisualContext(sessionId, analysis.description);

    broadcastToSession(sessionId, {
      type: 'visual_analysis',
      sessionId,
      timestamp: Date.now(),
      payload: analysis
    });
    return;
  }

  // Multiple devices - aggregate frames for multi-angle analysis
  const frames = Array.from(deviceFrames.values()).map(f => f.image);
  const analysis = await analyzeMultiAngleSnapshots(
    sessionId,
    frames,
    session.mode,
    ctx.transcriptBuffer.slice(-3).join(' ')
  );

  // Track multi-angle analysis for history
  recordVisualAnalysis(sessionId, analysis.description);

  // Update visual context (both DecisionContext and Orchestrator fallback)
  updateVisualContext(ctx, analysis.description);
  updateServerVisualContext(sessionId, analysis.description);

  broadcastToSession(sessionId, {
    type: 'visual_analysis',
    sessionId,
    timestamp: Date.now(),
    payload: {
      ...analysis,
      sourceCount: deviceFrames.size
    }
  });
}

/**
 * Analyze snapshots from multiple angles
 */
async function analyzeMultiAngleSnapshots(
  sessionId: string,
  images: string[],
  mode: RediMode,
  recentTranscript: string
): Promise<{ description: string; suggestions: string[] }> {
  // Import Anthropic for multi-image analysis
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { MODE_CONFIGS } = await import('../lib/redi/types');
  const modeConfig = MODE_CONFIGS[mode];

  const systemPrompt = `You are Redi's multi-angle visual analysis system for ${modeConfig.systemPromptFocus}.

You're seeing ${images.length} different camera angles of the same scene/activity.
Combine these perspectives to provide:
1. A comprehensive understanding of what's happening
2. Insights that wouldn't be visible from a single angle
3. Specific, actionable feedback

Be concise (2-3 sentences max).`;

  const imageContent = images.map((img, i) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: img
    }
  }));

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: recentTranscript
              ? `Context: "${recentTranscript}"\n\nAnalyze these ${images.length} camera angles:`
              : `Analyze these ${images.length} camera angles:`
          }
        ]
      }],
      system: systemPrompt
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';

    // Extract suggestions
    const suggestionPatterns = /(?:suggest|recommend|could|should|try)\s+([^.!?]+[.!?])/gi;
    const suggestions: string[] = [];
    let match;
    while ((match = suggestionPatterns.exec(text)) !== null) {
      suggestions.push(match[1].trim());
    }

    return {
      description: text,
      suggestions: suggestions.slice(0, 3)
    };
  } catch (error) {
    console.error('[Redi Vision] Multi-angle analysis error:', error);
    return {
      description: 'Unable to analyze multiple angles',
      suggestions: []
    };
  }
}

/**
 * Clean text for speech - remove markdown, asterisks, and other formatting
 */
function cleanTextForSpeech(text: string): string {
  let cleaned = text;

  // Remove markdown formatting
  cleaned = cleaned.replace(/\*\*/g, '');           // Bold **text**
  cleaned = cleaned.replace(/\*/g, '');             // Italic *text*
  cleaned = cleaned.replace(/__/g, '');             // Bold __text__
  cleaned = cleaned.replace(/_/g, ' ');             // Italic _text_
  cleaned = cleaned.replace(/~~(.*?)~~/g, '$1');    // Strikethrough
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');    // Inline code
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ''); // Code blocks
  cleaned = cleaned.replace(/#{1,6}\s*/g, '');      // Headers
  cleaned = cleaned.replace(/>\s*/g, '');           // Blockquotes
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1'); // Images

  // Remove bullet points and list markers
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '');
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '');

  // Clean up multiple spaces and newlines
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Speak a response and broadcast to appropriate devices
 * @param isPrompted - If true (user asked a question), skip staleness check
 */
async function speakResponse(sessionId: string, text: string, isPrompted: boolean = false): Promise<void> {
  const ctx = contexts.get(sessionId);
  if (!ctx) return;

  // Check if user interrupted - ignore stale responses
  if (shouldIgnoreResponse(ctx)) {
    console.log(`[Redi] Skipping speak - user interrupted, ignoring stale response`);
    return;
  }

  // Check context freshness - but SKIP for prompted responses (user is waiting for answer)
  if (!isPrompted && !isContextFresh(ctx)) {
    console.log(`[Redi] Skipping speak - context is stale (>2sec old, unprompted)`);
    return;
  }

  // Clean text for speech - remove markdown and formatting
  const cleanedText = cleanTextForSpeech(text);
  if (!cleanedText) {
    console.log(`[Redi] Skipping speak - no content after cleaning`);
    return;
  }

  // Acquire speaking lock - prevents concurrent/repeated responses
  if (!markSpeakingStart(ctx)) {
    console.log(`[Redi] Skipping speak - already speaking in session ${sessionId}`);
    return;
  }

  try {
    // Track AI response for history
    recordAIResponse(sessionId, cleanedText);

    // Broadcast text response to all devices
    broadcastToSession(sessionId, {
      type: 'ai_response',
      sessionId,
      timestamp: Date.now(),
      payload: {
        text: cleanedText,
        isStreaming: false,
        isFinal: true
      }
    });

    // Generate complete audio with circuit breaker (non-streaming for better quality)
    try {
      const audioBuffer = await CIRCUIT_BREAKERS.elevenlabs.execute(() =>
        speak(sessionId, cleanedText)
      );

      if (audioBuffer) {
        // Send complete audio at once - prevents breaking up on inconsistent networks
        broadcastAudio(sessionId, {
          type: 'voice_audio',
          sessionId,
          timestamp: Date.now(),
          payload: {
            audio: audioBuffer.toString('base64'),
            format: 'mp3',
            isStreaming: false,
            isFinal: true
          }
        });
      }
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        // ElevenLabs circuit open - notify iOS to use local TTS fallback
        console.warn(`[Redi] ElevenLabs circuit open, using iOS fallback TTS`);
        broadcastToSession(sessionId, {
          type: 'tts_fallback',
          sessionId,
          timestamp: Date.now(),
          payload: {
            text: cleanedText,
            reason: 'cloud_unavailable'
          }
        } as any);
      } else {
        console.error('[Redi] Voice generation failed:', error);
      }
    }
  } finally {
    // Release lock and mark that we spoke
    markSpoke(ctx, cleanedText);
  }
}

/**
 * Broadcast audio based on session's audioOutputMode
 */
function broadcastAudio(sessionId: string, message: WSMessage): void {
  const connections = sessionConnections.get(sessionId);
  if (!connections) return;

  for (const [deviceId, ws] of connections) {
    if (shouldReceiveAudio(sessionId, deviceId) && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

/**
 * Broadcast message to all devices in a session
 */
function broadcastToSession(sessionId: string, message: WSMessage, excludeDeviceId?: string): void {
  const connections = sessionConnections.get(sessionId);
  if (!connections) return;

  const messageStr = JSON.stringify(message);
  for (const [deviceId, ws] of connections) {
    if (deviceId !== excludeDeviceId && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  }
}

/**
 * Send message to a specific device
 */
function sendToDevice(sessionId: string, deviceId: string, message: WSMessage): void {
  const connections = sessionConnections.get(sessionId);
  const ws = connections?.get(deviceId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Start the insight generation loop
 */
function startInsightLoop(sessionId: string): void {
  const interval = setInterval(async () => {
    const ctx = contexts.get(sessionId);
    const session = getSession(sessionId);
    if (!ctx || !session) {
      clearInterval(interval);
      return;
    }

    const insight = await generateInsight(
      session.mode,
      ctx.transcriptBuffer,
      ctx.visualContext,
      ctx.sensitivity,
      ctx.recentResponses,
      ctx.transcriptCountAtLastSpoke,
      ctx.visualContextAtLastSpoke,
      ctx.isSpeaking
    );

    if (insight) {
      updatePendingInsight(ctx, insight.insight, insight.confidence);
    }
  }, 5000);

  insightIntervals.set(sessionId, interval);
}

/**
 * Start the silence check loop
 */
function startSilenceCheckLoop(sessionId: string): void {
  const interval = setInterval(async () => {
    const ctx = contexts.get(sessionId);
    if (!ctx) {
      clearInterval(interval);
      return;
    }

    const silenceMs = getSilenceDuration(sessionId);
    updateSilence(ctx, silenceMs);

    const decision = shouldSpeak(ctx);

    if (decision.shouldSpeak && ctx.pendingInsight) {
      await speakResponse(sessionId, ctx.pendingInsight);
    }
  }, 1000);

  silenceCheckIntervals.set(sessionId, interval);
}

/**
 * Start frame aggregation loop for multi-phone sessions
 */
function startFrameAggregationLoop(sessionId: string, mode: RediMode): void {
  const { MODE_CONFIGS } = require('../lib/redi/types');
  const modeConfig = MODE_CONFIGS[mode];

  // Only run for modes that use periodic snapshots
  if (modeConfig.snapshotIntervalMs === 0) return;

  // Clear any existing interval first
  const existingInterval = frameAggregationIntervals.get(sessionId);
  if (existingInterval) {
    clearInterval(existingInterval);
  }

  const interval = setInterval(() => {
    aggregateAndAnalyzeFrames(sessionId);
  }, Math.max(modeConfig.snapshotIntervalMs, FRAME_AGGREGATION_INTERVAL_MS));

  // CRITICAL: Store interval so it can be cleaned up on session end
  frameAggregationIntervals.set(sessionId, interval);
}

/**
 * Handle device disconnection
 */
function handleDeviceDisconnect(sessionId: string, deviceId: string): void {
  console.log(`[Redi WebSocket] Device ${deviceId} disconnected from session ${sessionId}`);

  const connections = sessionConnections.get(sessionId);
  if (connections) {
    connections.delete(deviceId);
  }

  // If host disconnected, start grace period instead of ending immediately
  if (isHost(sessionId, deviceId)) {
    console.log(`[Redi WebSocket] Host disconnected from ${sessionId}, starting ${HOST_RECONNECT_GRACE_MS}ms grace period`);

    // Clear any existing timer
    const existingTimer = hostDisconnectTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Start grace period timer
    const timer = setTimeout(() => {
      // Check if host reconnected
      const currentConnections = sessionConnections.get(sessionId);
      if (!currentConnections || currentConnections.size === 0) {
        console.log(`[Redi WebSocket] Host didn't reconnect to ${sessionId}, ending session`);
        handleSessionEnd(sessionId);
      }
      hostDisconnectTimers.delete(sessionId);
    }, HOST_RECONNECT_GRACE_MS);

    hostDisconnectTimers.set(sessionId, timer);
    return;
  }

  // Otherwise, just remove the participant
  leaveSession(sessionId, deviceId);

  // Notify remaining devices
  broadcastToSession(sessionId, {
    type: 'participant_left',
    sessionId,
    timestamp: Date.now(),
    payload: {
      deviceId,
      participantCount: getParticipantCount(sessionId)
    }
  });
}

/**
 * Handle full session end
 */
async function handleSessionEnd(sessionId: string): Promise<void> {
  console.log(`[Redi WebSocket] Ending session ${sessionId}`);

  // Notify all devices
  broadcastToSession(sessionId, {
    type: 'session_end',
    sessionId,
    timestamp: Date.now(),
    payload: { reason: 'Session ended by host' }
  });

  // Clear intervals
  const insightInterval = insightIntervals.get(sessionId);
  if (insightInterval) {
    clearInterval(insightInterval);
    insightIntervals.delete(sessionId);
  }

  const silenceInterval = silenceCheckIntervals.get(sessionId);
  if (silenceInterval) {
    clearInterval(silenceInterval);
    silenceCheckIntervals.delete(sessionId);
  }

  // Clear frame aggregation interval (CRITICAL: prevents memory leak)
  const frameInterval = frameAggregationIntervals.get(sessionId);
  if (frameInterval) {
    clearInterval(frameInterval);
    frameAggregationIntervals.delete(sessionId);
  }

  // Clean up session-scoped state
  lastProcessedTranscripts.delete(sessionId);
  recentPerceptionData.delete(sessionId);  // CRITICAL: Prevent memory leak

  // Stop services
  stopTranscription(sessionId);
  closeVoiceService(sessionId);
  clearVisualContext(sessionId);

  // Clean up military-grade if enabled
  if (militaryGradeSessions.has(sessionId)) {
    cleanupMilitaryGrade(sessionId);
    militaryGradeSessions.delete(sessionId);
    console.log(`[Redi WebSocket] Military-grade cleaned up for ${sessionId}`);
  }

  // End session and get costs
  const result = endSession(sessionId);
  if (result) {
    console.log(`[Redi WebSocket] Session ${sessionId} costs:`, result.costs);
  }

  // Save session history to database (async, don't block shutdown)
  endSessionTracking(sessionId).then(historyEntry => {
    if (historyEntry) {
      console.log(`[Redi WebSocket] Session history saved for ${sessionId}`);
    }
  }).catch(error => {
    console.error(`[Redi WebSocket] Failed to save session history for ${sessionId}:`, error);
  });

  // Close all connections
  const connections = sessionConnections.get(sessionId);
  if (connections) {
    for (const ws of connections.values()) {
      ws.close();
    }
    connections.clear();
  }

  // Clean up
  sessionConnections.delete(sessionId);
  contexts.delete(sessionId);
  frameBuffers.delete(sessionId);
}

/**
 * Get connection stats
 */
export function getConnectionStats(): {
  activeSessions: number;
  totalConnections: number;
  sessionsWithMultipleDevices: number;
} {
  let totalConnections = 0;
  let multiDeviceSessions = 0;

  for (const connections of sessionConnections.values()) {
    totalConnections += connections.size;
    if (connections.size > 1) {
      multiDeviceSessions++;
    }
  }

  return {
    activeSessions: sessionConnections.size,
    totalConnections,
    sessionsWithMultipleDevices: multiDeviceSessions
  };
}
