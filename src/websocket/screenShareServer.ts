/**
 * screenShareServer.ts
 *
 * REDI SCREEN SHARING - WebRTC Signaling Server
 * 
 * SECURITY FEATURES:
 * - 8-digit alphanumeric codes (2.8 billion combinations)
 * - Rate limiting (5 attempts per IP per minute)
 * - Phone must approve connection before video starts
 * - 5-minute code expiration
 * - Connection logging with IP/User-Agent
 * - Automatic lockout after failed attempts
 *
 * Flow:
 * 1. Phone connects, receives 8-character code
 * 2. Computer enters code at redialways.com/screen
 * 3. Phone receives approval request with device info
 * 4. Phone approves → WebRTC connection established
 * 5. Screen video streams P2P to phone
 *
 * Created: Jan 26, 2026
 * Updated: Feb 20, 2026 - Fixed TypeScript types (use `any` for browser-only WebRTC types),
 *                          added privacy_pause relay, production hardening
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage, Server } from 'http';
import { URL } from 'url';
import crypto from 'crypto';

// MARK: - Types
// WebRTC types (RTCSessionDescriptionInit, RTCIceCandidateInit) are browser-only APIs.
// The signaling server just relays these objects — it never inspects their contents.
// Using `any` is correct here since Node.js doesn't have these types.

interface PendingConnection {
    code: string;
    phoneWs: WebSocket | null;
    computerWs: WebSocket | null;
    createdAt: Date;
    expiresAt: Date;
    phoneName?: string;
    approved: boolean;
    computerInfo?: {
        ip: string;
        userAgent: string;
        timestamp: Date;
    };
}

interface RateLimitEntry {
    attempts: number;
    lastAttempt: Date;
    lockedUntil?: Date;
}

interface SignalingMessage {
    type: string;
    code?: string;
    offer?: any;
    answer?: any;
    candidate?: any;
    message?: string;
    paused?: boolean;
    computerInfo?: {
        ip: string;
        userAgent: string;
        browser: string;
        os: string;
    };
}

// MARK: - State

const pendingConnections = new Map<string, PendingConnection>();
const wsToCode = new Map<WebSocket, string>();
const rateLimits = new Map<string, RateLimitEntry>();
let wss: WebSocketServer | null = null;

// MARK: - Security Constants

const CODE_LENGTH = 8;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS_PER_MINUTE = 5;
const LOCKOUT_MINUTES = 15;

// MARK: - Code Generation (Cryptographically Secure)

function generateSecureCode(): string {
    let code: string;
    do {
        const bytes = crypto.randomBytes(CODE_LENGTH);
        code = Array.from(bytes)
            .map(b => CODE_CHARS[b % CODE_CHARS.length])
            .join('');
    } while (pendingConnections.has(code));
    return code;
}

// MARK: - Rate Limiting

function getClientIP(request: IncomingMessage): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return request.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; message?: string } {
    const now = new Date();
    let entry = rateLimits.get(ip);
    
    if (!entry) {
        entry = { attempts: 0, lastAttempt: now };
        rateLimits.set(ip, entry);
    }
    
    if (entry.lockedUntil && entry.lockedUntil > now) {
        const remainingMinutes = Math.ceil((entry.lockedUntil.getTime() - now.getTime()) / 60000);
        return { 
            allowed: false, 
            message: `Too many failed attempts. Try again in ${remainingMinutes} minutes.` 
        };
    }
    
    if (now.getTime() - entry.lastAttempt.getTime() > 60000) {
        entry.attempts = 0;
    }
    
    entry.attempts++;
    entry.lastAttempt = now;
    
    if (entry.attempts > MAX_ATTEMPTS_PER_MINUTE) {
        entry.lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60000);
        console.log(`[ScreenShare] \uD83D\uDD12 IP ${ip} locked out for ${LOCKOUT_MINUTES} minutes`);
        return { 
            allowed: false, 
            message: `Too many attempts. Locked out for ${LOCKOUT_MINUTES} minutes.` 
        };
    }
    
    return { allowed: true };
}

function recordFailedAttempt(ip: string): void {
    const entry = rateLimits.get(ip);
    if (entry) {
        entry.attempts++;
        if (entry.attempts > MAX_ATTEMPTS_PER_MINUTE * 2) {
            entry.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
            console.log(`[ScreenShare] \uD83D\uDD12 IP ${ip} locked out after repeated failures`);
        }
    }
}

// MARK: - User Agent Parsing

function parseUserAgent(ua: string): { browser: string; os: string } {
    let browser = 'Unknown';
    let os = 'Unknown';
    
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';
    
    if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    
    return { browser, os };
}

// MARK: - Initialize WebSocket Server

export function initScreenShare(server: Server) {
    wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket, head) => {
        const url = new URL(request.url || '', `http://${request.headers.host}`);
        
        if (url.pathname === '/ws/screen') {
            wss!.handleUpgrade(request, socket, head, (ws) => {
                wss!.emit('connection', ws, request);
            });
        }
    });

    wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
        handleScreenShareConnection(ws, request);
    });

    console.log('[ScreenShare] \uD83D\uDD10 Secure WebSocket server initialized on /ws/screen');
    console.log(`[ScreenShare] Security: ${CODE_LENGTH}-char codes, ${CODE_EXPIRY_MINUTES}min expiry, rate limiting enabled`);
}

// MARK: - Connection Handling

export function handleScreenShareConnection(ws: WebSocket, request: IncomingMessage) {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const role = url.searchParams.get('role');
    const code = url.searchParams.get('code')?.toUpperCase();
    const name = url.searchParams.get('name') || 'Phone';
    const ip = getClientIP(request);
    const userAgent = request.headers['user-agent'] || 'Unknown';

    console.log(`[ScreenShare] Connection attempt: role=${role}, ip=${ip}`);

    if (role === 'phone') {
        handlePhoneConnection(ws, name, ip);
    } else if (role === 'computer' && code) {
        const rateCheck = checkRateLimit(ip);
        if (!rateCheck.allowed) {
            ws.send(JSON.stringify({ type: 'error', message: rateCheck.message }));
            ws.close();
            console.log(`[ScreenShare] \u26D4 Rate limited: ${ip}`);
            return;
        }
        handleComputerConnection(ws, code, ip, userAgent);
    } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid connection parameters' }));
        ws.close();
    }

    ws.on('message', (data) => {
        try {
            const msg: SignalingMessage = JSON.parse(data.toString());
            handleSignalingMessage(ws, msg);
        } catch (e) {
            console.error('[ScreenShare] Invalid message:', e);
        }
    });

    ws.on('close', () => handleDisconnect(ws));
    ws.on('error', (err) => {
        console.error('[ScreenShare] WebSocket error:', err);
        handleDisconnect(ws);
    });
}

// MARK: - Phone Connection

function handlePhoneConnection(ws: WebSocket, name: string, ip: string) {
    const code = generateSecureCode();
    
    const connection: PendingConnection = {
        code,
        phoneWs: ws,
        computerWs: null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000),
        phoneName: name,
        approved: false
    };

    pendingConnections.set(code, connection);
    wsToCode.set(ws, code);

    ws.send(JSON.stringify({
        type: 'code',
        code,
        expiresIn: CODE_EXPIRY_MINUTES * 60
    }));

    console.log(`[ScreenShare] \uD83D\uDCF1 Phone connected from ${ip}, code: ${code}`);
}

// MARK: - Computer Connection

function handleComputerConnection(ws: WebSocket, code: string, ip: string, userAgent: string) {
    const connection = pendingConnections.get(code);

    if (!connection) {
        recordFailedAttempt(ip);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid code. Please check and try again.' }));
        ws.close();
        console.log(`[ScreenShare] \u274C Invalid code attempt from ${ip}: ${code}`);
        return;
    }

    if (connection.expiresAt < new Date()) {
        pendingConnections.delete(code);
        recordFailedAttempt(ip);
        ws.send(JSON.stringify({ type: 'error', message: 'Code has expired. Please get a new code from your phone.' }));
        ws.close();
        console.log(`[ScreenShare] \u23F0 Expired code attempt from ${ip}: ${code}`);
        return;
    }

    if (connection.computerWs) {
        ws.send(JSON.stringify({ type: 'error', message: 'Another device is already trying to connect.' }));
        ws.close();
        return;
    }

    const { browser, os } = parseUserAgent(userAgent);
    connection.computerInfo = { ip, userAgent, timestamp: new Date() };
    connection.computerWs = ws;
    wsToCode.set(ws, code);

    if (connection.phoneWs && connection.phoneWs.readyState === WebSocket.OPEN) {
        connection.phoneWs.send(JSON.stringify({
            type: 'approval_request',
            computerInfo: {
                ip: ip.substring(0, 3) + '.*.*.*',
                browser,
                os,
                userAgent: userAgent.substring(0, 50)
            },
            message: 'A computer wants to share its screen'
        }));
    }

    ws.send(JSON.stringify({ type: 'waiting_approval', message: 'Waiting for approval on phone...' }));
    console.log(`[ScreenShare] \uD83D\uDCBB Computer connected from ${ip} (${browser}/${os}), awaiting approval`);
}

// MARK: - Signaling Message Relay

function handleSignalingMessage(ws: WebSocket, msg: SignalingMessage) {
    const code = wsToCode.get(ws);
    if (!code) return;

    const connection = pendingConnections.get(code);
    if (!connection) return;

    if (msg.type === 'approve' && ws === connection.phoneWs) {
        connection.approved = true;
        
        if (connection.computerWs && connection.computerWs.readyState === WebSocket.OPEN) {
            connection.computerWs.send(JSON.stringify({
                type: 'approved',
                message: 'Connection approved! You can now share your screen.'
            }));
        }
        
        ws.send(JSON.stringify({ type: 'paired', message: 'Computer connected - screen sharing enabled' }));
        console.log(`[ScreenShare] \u2705 Connection approved for code ${code}`);
        return;
    }
    
    if (msg.type === 'reject' && ws === connection.phoneWs) {
        if (connection.computerWs && connection.computerWs.readyState === WebSocket.OPEN) {
            connection.computerWs.send(JSON.stringify({ type: 'rejected', message: 'Connection was rejected by the phone.' }));
            connection.computerWs.close();
        }
        connection.computerWs = null;
        connection.approved = false;
        console.log(`[ScreenShare] \u274C Connection rejected for code ${code}`);
        return;
    }

    if (!connection.approved) {
        console.log(`[ScreenShare] \u26A0\uFE0F Blocked ${msg.type} - not approved`);
        return;
    }

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

    switch (msg.type) {
        case 'offer':
        case 'answer':
        case 'ice-candidate':
        case 'privacy_pause':
            targetWs.send(JSON.stringify(msg));
            console.log(`[ScreenShare] \uD83D\uDCE1 Relayed ${msg.type}`);
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

    let otherWs: WebSocket | null = null;
    
    if (ws === connection.phoneWs) {
        otherWs = connection.computerWs;
        connection.phoneWs = null;
    } else if (ws === connection.computerWs) {
        otherWs = connection.phoneWs;
        connection.computerWs = null;
        connection.approved = false;
    }

    if (otherWs && otherWs.readyState === WebSocket.OPEN) {
        otherWs.send(JSON.stringify({ type: 'disconnected', message: 'Peer disconnected' }));
    }

    wsToCode.delete(ws);

    if (!connection.phoneWs && !connection.computerWs) {
        pendingConnections.delete(code);
        console.log(`[ScreenShare] \uD83E\uDDF9 Connection ${code} cleaned up`);
    }

    console.log(`[ScreenShare] \uD83D\uDC4B Peer disconnected from ${code}`);
}

// MARK: - Cleanup Timers

setInterval(() => {
    const now = new Date();
    let cleaned = 0;

    pendingConnections.forEach((connection, code) => {
        if (connection.expiresAt < now) {
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
        console.log(`[ScreenShare] \uD83E\uDDF9 Cleaned up ${cleaned} expired connection(s)`);
    }
}, 60000);

setInterval(() => {
    const now = new Date();
    let cleaned = 0;
    
    rateLimits.forEach((entry, ip) => {
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000);
        if (entry.lastAttempt < thirtyMinutesAgo && (!entry.lockedUntil || entry.lockedUntil < now)) {
            rateLimits.delete(ip);
            cleaned++;
        }
    });
    
    if (cleaned > 0) {
        console.log(`[ScreenShare] \uD83E\uDDF9 Cleaned up ${cleaned} rate limit entries`);
    }
}, 300000);

console.log('[ScreenShare] \uD83D\uDD10 Secure server module loaded');
