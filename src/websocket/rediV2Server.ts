/**
 * Redi V2 Server - Clean WebSocket endpoint
 *
 * Uses noServer mode with manual upgrade handling.
 * Now uses /ws/redi path (same as V1) since Cloudflare has WebSocket enabled for that path.
 *
 * Usage:
 *   iOS connects to: wss://your-server.com/ws/redi?sessionId=xxx&deviceId=yyy
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import { handleConnection } from './rediSocketClean';

let wss: WebSocketServer | null = null;

export function initRediV2(server: HTTPServer): void {
  // Create WebSocket server WITHOUT attaching to HTTP server
  // We'll handle upgrades manually
  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log(`[Redi V2] Connection established from ${req.url}`);

    try {
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
    } catch (error) {
      console.error('[Redi V2] Connection handler error:', error);
      ws.close(1011, 'Server error');
    }
  });

  wss.on('error', (error) => {
    console.error('[Redi V2] WebSocket server error:', error);
  });

  // Handle upgrade requests for /ws/redi path (but NOT v=3 which goes to V3 server)
  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const parsedUrl = parseUrl(request.url || '', true);
    const pathname = parsedUrl.pathname;
    const isV3 = parsedUrl.query.v === '3';

    console.log(`[Redi V2] Upgrade request for path: ${pathname}, v=${parsedUrl.query.v}`);

    // Skip V3 requests - those are handled by rediV3Server
    if (pathname === '/ws/redi' && !isV3) {
      console.log(`[Redi V2] Handling upgrade for V2 connection`);
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    }
  });

  console.log('[Redi V2] WebSocket server initialized on /ws/redi (noServer mode)');
}

export function closeRediV2(): void {
  if (wss) {
    wss.close();
    wss = null;
    console.log('[Redi V2] WebSocket server closed');
  }
}
