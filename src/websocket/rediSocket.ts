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
  markSpeakingStart
} from '../lib/redi/decisionEngine';

import {
  startTranscription,
  sendAudio,
  getSilenceDuration,
  stopTranscription
} from '../lib/redi/transcriptionService';

import {
  analyzeSnapshot,
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

// Frame aggregation buffer: sessionId -> array of recent frames from all devices
const frameBuffers = new Map<string, { deviceId: string; image: string; timestamp: number }[]>();
const FRAME_BUFFER_MAX = 10;
const FRAME_AGGREGATION_INTERVAL_MS = 2000;

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

  } catch (error) {
    console.error(`[Redi WebSocket] Failed to initialize services for ${sessionId}:`, error);
  }
}

/**
 * Handle incoming WebSocket message from a device
 */
async function handleMessage(sessionId: string, deviceId: string, message: WSMessage): Promise<void> {
  const ctx = contexts.get(sessionId);
  updateParticipantActivity(sessionId, deviceId);

  switch (message.type) {
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
          ctx.sensitivity = Math.max(0, Math.min(1, newSensitivity));
          updateSensitivity(sessionId, ctx.sensitivity);
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

  // Update context
  updateTranscript(ctx, chunk.text);

  // Broadcast transcript to all devices
  broadcastToSession(sessionId, {
    type: 'transcript',
    sessionId,
    timestamp: Date.now(),
    payload: chunk
  });

  // Check if this is a question requiring immediate response
  if (chunk.isFinal && chunk.text.trim().endsWith('?')) {
    // Track user question for history
    recordUserQuestion(sessionId, chunk.text);

    const session = getSession(sessionId);
    if (session) {
      const response = await generateQuestionResponse(
        session.mode,
        chunk.text,
        ctx.transcriptBuffer,
        ctx.visualContext
      );

      await speakResponse(sessionId, response);
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

  // Update visual context
  updateVisualContext(ctx, analysis.description);

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

  // If only one device, do simple analysis
  if (deviceFrames.size === 1) {
    const [frame] = deviceFrames.values();
    const analysis = await analyzeSnapshot(
      sessionId,
      frame.image,
      session.mode,
      ctx.transcriptBuffer.slice(-3).join(' ')
    );

    // Track snapshot analysis for history
    recordVisualAnalysis(sessionId, analysis.description);

    updateVisualContext(ctx, analysis.description);

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

  updateVisualContext(ctx, analysis.description);

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
 * Speak a response and broadcast to appropriate devices
 */
async function speakResponse(sessionId: string, text: string): Promise<void> {
  const ctx = contexts.get(sessionId);
  if (!ctx) return;

  // Acquire speaking lock - prevents concurrent/repeated responses
  if (!markSpeakingStart(ctx)) {
    console.log(`[Redi] Skipping speak - already speaking in session ${sessionId}`);
    return;
  }

  try {
    // Track AI response for history
    recordAIResponse(sessionId, text);

    // Broadcast text response to all devices
    broadcastToSession(sessionId, {
      type: 'ai_response',
      sessionId,
      timestamp: Date.now(),
      payload: {
        text,
        isStreaming: false,
        isFinal: true
      }
    });

    // Generate complete audio (non-streaming for better quality and no stuttering)
    const audioBuffer = await speak(sessionId, text);

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
  } finally {
    // Release lock and mark that we spoke
    markSpoke(ctx, text);
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

  const interval = setInterval(() => {
    aggregateAndAnalyzeFrames(sessionId);
  }, Math.max(modeConfig.snapshotIntervalMs, FRAME_AGGREGATION_INTERVAL_MS));

  // Store interval (reuse insight intervals map)
  // In production, use a separate map
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

  // If host disconnected, end the session
  if (isHost(sessionId, deviceId)) {
    handleSessionEnd(sessionId);
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

  // Stop services
  stopTranscription(sessionId);
  closeVoiceService(sessionId);
  clearVisualContext(sessionId);

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
