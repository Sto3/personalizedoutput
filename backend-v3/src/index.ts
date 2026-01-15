/**
 * Redi V3 Server
 *
 * Clean implementation using OpenAI Realtime API for:
 * - Speech recognition (Whisper)
 * - AI reasoning (GPT-4o)
 * - Voice synthesis (native voices)
 *
 * Single WebSocket connection per user session.
 */

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { SessionManager } from './openai/session';
import { config } from './config';
import { randomUUID } from 'crypto';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Redi V3',
    status: 'running',
    websocket: 'Connect via WebSocket to start a session'
  });
});

// Track active sessions
const activeSessions = new Map<string, SessionManager>();

// WebSocket connections
wss.on('connection', (ws: WebSocket, req) => {
  const sessionId = randomUUID();
  console.log(`[Server] New connection: ${sessionId}`);

  const session = new SessionManager(ws, sessionId);
  activeSessions.set(sessionId, session);

  // Initialize the session (connects to OpenAI)
  session.initialize();

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      session.handleMessage(message);
    } catch (error) {
      console.error(`[Server] Message parse error:`, error);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[Server] Connection closed: ${sessionId} (code: ${code})`);
    session.cleanup();
    activeSessions.delete(sessionId);
  });

  ws.on('error', (error) => {
    console.error(`[Server] WebSocket error for ${sessionId}:`, error);
    session.cleanup();
    activeSessions.delete(sessionId);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  activeSessions.forEach((session, id) => {
    session.cleanup();
  });
  server.close(() => {
    console.log('[Server] Shutdown complete');
    process.exit(0);
  });
});

server.listen(config.port, () => {
  console.log(`[Server] Redi V3 running on port ${config.port}`);
  console.log(`[Server] WebSocket endpoint: ws://localhost:${config.port}`);
});
