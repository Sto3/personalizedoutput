/**
 * Redi V2 Server - Clean WebSocket endpoint
 *
 * This creates a SEPARATE WebSocket server on a different path.
 * It has ZERO connection to the old rediSocket.ts.
 *
 * Usage:
 *   iOS connects to: wss://your-server.com/ws/redi-v2?sessionId=xxx&deviceId=yyy
 *   (Old system remains at: wss://your-server.com/ws/redi)
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import { handleConnection } from './rediSocketClean';

let wss: WebSocketServer | null = null;

export function initRediV2(server: HTTPServer): void {
  // Create WebSocket server on /ws/redi-v2 path
  wss = new WebSocketServer({
    server,
    path: '/ws/redi-v2'
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // Parse sessionId and deviceId from URL query string
    const urlParts = parseUrl(req.url || '', true);
    const sessionId = urlParts.query.sessionId as string;
    const deviceId = urlParts.query.deviceId as string;

    if (!sessionId) {
      console.error('[Redi V2] Connection rejected: no sessionId');
      ws.close(1008, 'sessionId required');
      return;
    }

    console.log(`[Redi V2] New connection: session=${sessionId}, device=${deviceId}`);
    handleConnection(ws, sessionId, deviceId);
  });

  wss.on('error', (error) => {
    console.error('[Redi V2] WebSocket server error:', error);
  });

  console.log('[Redi V2] WebSocket server initialized on /ws/redi-v2');
}

export function closeRediV2(): void {
  if (wss) {
    wss.close();
    wss = null;
    console.log('[Redi V2] WebSocket server closed');
  }
}
