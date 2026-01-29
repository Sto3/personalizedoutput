/**
 * screenShareServer.ts
 *
 * REDI SCREEN SHARING - WebRTC Signaling Server
 * 
 * Enables users to share their computer screen to Redi on their phone.
 * Uses WebRTC for peer-to-peer video streaming.
 *
 * Flow:
 * 1. Phone connects, receives 6-digit code
 * 2. Computer enters code at redialways.com/screen
 * 3. Server pairs them and relays WebRTC signaling
 * 4. Screen video streams P2P to phone
 *
 * Created: Jan 26, 2026
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage, Server } from 'http';
import { URL } from 'url';

// MARK: - Types

interface PendingConnection {
    code: string;
    phoneWs: WebSocket | null;
    computerWs: WebSocket | null;
    createdAt: Date;
    expiresAt: Date;
    phoneName?: string;
}

interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'paired' | 'code' | 'error' | 'disconnected';
    code?: string;
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
    message?: string;
}

// MARK: - State

const pendingConnections = new Map<string, PendingConnection>();
const wsToCode = new Map<WebSocket, string>();
let wss: WebSocketServer | null = null;

// MARK: - Code Generation

function generateCode(): string {
    // Generate 6-digit code, ensure uniqueness
    let code: string;
    do {
        code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (pendingConnections.has(code));
    return code;
}

// MARK: - Initialize WebSocket Server

export function initScreenShare(server: Server) {
    wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket, head) => {
        const url = new URL(request.url || '', `http://${request.headers.host}`);
        
        // Handle /ws/screen endpoint
        if (url.pathname === '/ws/screen') {
            wss!.handleUpgrade(request, socket, head, (ws) => {
                wss!.emit('connection', ws, request);
            });
        }
        // Other WebSocket endpoints are handled by their respective servers
    });

    wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
        handleScreenShareConnection(ws, request);
    });

    console.log('[ScreenShare] WebSocket server initialized on /ws/screen');
}

// MARK: - Connection Handling

export function handleScreenShareConnection(ws: WebSocket, request: IncomingMessage) {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const role = url.searchParams.get('role'); // 'phone' or 'computer'
    const code = url.searchParams.get('code');
    const name = url.searchParams.get('name') || 'Phone';

    console.log(`[ScreenShare] Connection: role=${role}, code=${code || 'new'}`);

    if (role === 'phone') {
        handlePhoneConnection(ws, name);
    } else if (role === 'computer' && code) {
        handleComputerConnection(ws, code);
    } else {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid connection parameters. Need role=phone or role=computer&code=XXXXXX'
        }));
        ws.close();
    }

    // Handle messages
    ws.on('message', (data) => {
        try {
            const msg: SignalingMessage = JSON.parse(data.toString());
            handleSignalingMessage(ws, msg);
        } catch (e) {
            console.error('[ScreenShare] Invalid message:', e);
        }
    });

    // Handle disconnect
    ws.on('close', () => {
        handleDisconnect(ws);
    });

    ws.on('error', (err) => {
        console.error('[ScreenShare] WebSocket error:', err);
        handleDisconnect(ws);
    });
}

// MARK: - Phone Connection

function handlePhoneConnection(ws: WebSocket, name: string) {
    const code = generateCode();
    
    const connection: PendingConnection = {
        code,
        phoneWs: ws,
        computerWs: null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        phoneName: name
    };

    pendingConnections.set(code, connection);
    wsToCode.set(ws, code);

    // Send code to phone
    ws.send(JSON.stringify({
        type: 'code',
        code
    }));

    console.log(`[ScreenShare] Phone connected, code: ${code}`);
}

// MARK: - Computer Connection

function handleComputerConnection(ws: WebSocket, code: string) {
    const connection = pendingConnections.get(code);

    if (!connection) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid or expired code'
        }));
        ws.close();
        return;
    }

    if (connection.expiresAt < new Date()) {
        pendingConnections.delete(code);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Code has expired'
        }));
        ws.close();
        return;
    }

    if (connection.computerWs) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Another computer is already connected'
        }));
        ws.close();
        return;
    }

    // Pair the connections
    connection.computerWs = ws;
    wsToCode.set(ws, code);

    // Notify both sides
    if (connection.phoneWs && connection.phoneWs.readyState === WebSocket.OPEN) {
        connection.phoneWs.send(JSON.stringify({
            type: 'paired',
            message: 'Computer connected'
        }));
    }

    ws.send(JSON.stringify({
        type: 'paired',
        message: `Connected to ${connection.phoneName}`
    }));

    console.log(`[ScreenShare] Computer connected to code: ${code}`);
}

// MARK: - Signaling Message Relay

function handleSignalingMessage(ws: WebSocket, msg: SignalingMessage) {
    const code = wsToCode.get(ws);
    if (!code) return;

    const connection = pendingConnections.get(code);
    if (!connection) return;

    // Determine which peer to relay to
    let targetWs: WebSocket | null = null;
    
    if (ws === connection.phoneWs) {
        targetWs = connection.computerWs;
    } else if (ws === connection.computerWs) {
        targetWs = connection.phoneWs;
    }

    if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
        console.log(`[ScreenShare] Target not connected for ${msg.type}`);
        return;
    }

    // Relay the message
    switch (msg.type) {
        case 'offer':
        case 'answer':
        case 'ice-candidate':
            targetWs.send(JSON.stringify(msg));
            console.log(`[ScreenShare] Relayed ${msg.type}`);
            break;
        default:
            console.log(`[ScreenShare] Unknown message type: ${msg.type}`);
    }
}

// MARK: - Disconnect Handling

function handleDisconnect(ws: WebSocket) {
    const code = wsToCode.get(ws);
    if (!code) return;

    const connection = pendingConnections.get(code);
    if (!connection) {
        wsToCode.delete(ws);
        return;
    }

    // Notify the other peer
    let otherWs: WebSocket | null = null;
    
    if (ws === connection.phoneWs) {
        otherWs = connection.computerWs;
        connection.phoneWs = null;
    } else if (ws === connection.computerWs) {
        otherWs = connection.phoneWs;
        connection.computerWs = null;
    }

    if (otherWs && otherWs.readyState === WebSocket.OPEN) {
        otherWs.send(JSON.stringify({
            type: 'disconnected',
            message: 'Peer disconnected'
        }));
    }

    wsToCode.delete(ws);

    // Clean up if both disconnected
    if (!connection.phoneWs && !connection.computerWs) {
        pendingConnections.delete(code);
        console.log(`[ScreenShare] Connection ${code} cleaned up`);
    }

    console.log(`[ScreenShare] Peer disconnected from ${code}`);
}

// MARK: - Cleanup Timer

setInterval(() => {
    const now = new Date();
    let cleaned = 0;

    pendingConnections.forEach((connection, code) => {
        if (connection.expiresAt < now) {
            // Close any remaining connections
            if (connection.phoneWs) {
                connection.phoneWs.close();
                wsToCode.delete(connection.phoneWs);
            }
            if (connection.computerWs) {
                connection.computerWs.close();
                wsToCode.delete(connection.computerWs);
            }
            pendingConnections.delete(code);
            cleaned++;
        }
    });

    if (cleaned > 0) {
        console.log(`[ScreenShare] Cleaned up ${cleaned} expired connection(s)`);
    }
}, 60000); // Run every minute

console.log('[ScreenShare] Server module loaded');
