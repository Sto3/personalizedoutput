# WebRTC Implementation Guide

**Last Updated:** January 25, 2026

## Overview

Redi now supports WebRTC for direct connection to OpenAI's Realtime API. This solves the echo problem and reduces latency by 200-300ms.

## Why WebRTC?

### The Echo Problem
With WebSocket (V7), the flow was:
```
iPhone Mic → Server → OpenAI → Server → iPhone Speaker
                                            ↓
                              iPhone Mic picks up speaker audio
                                            ↓
                              Server receives echo as "user speech"
                                            ↓
                              Redi responds to itself forever
```

Software-based echo blocking had race conditions and never fully worked.

### WebRTC Solution
WebRTC has **built-in echo cancellation** (Google's AEC - Acoustic Echo Cancellation):
```
iPhone Mic → WebRTC AEC → OpenAI → WebRTC AEC → iPhone Speaker
                 ↓                       ↓
           Echo removed             No echo sent
```

Additionally:
- **Lower latency**: Direct connection, no server relay for audio
- **Better audio quality**: Opus codec support
- **More reliable**: WebRTC is designed for real-time communication

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  iOS App                                                     │
│  ├── RediWebRTCService.swift                                │
│  │   ├── Fetches ephemeral token from server                │
│  │   ├── Establishes WebRTC peer connection                 │
│  │   ├── Audio: Direct to OpenAI via WebRTC                 │
│  │   └── Events: Data channel for transcripts, etc.         │
│  └── Uses GoogleWebRTC pod for WebRTC stack                 │
├─────────────────────────────────────────────────────────────┤
│  Your Server (Render - redialways.com)                       │
│  └── POST /api/redi/webrtc/token                            │
│      └── Returns ephemeral token for WebRTC connection      │
├─────────────────────────────────────────────────────────────┤
│  OpenAI Realtime API (WebRTC)                               │
│  ├── POST /v1/realtime/client_secrets (token generation)    │
│  └── POST /v1/realtime/calls (WebRTC SDP exchange)          │
└─────────────────────────────────────────────────────────────┘
```

## Connection Flow

1. **iOS requests token**: `POST https://redialways.com/api/redi/webrtc/token`
2. **Server calls OpenAI**: `POST https://api.openai.com/v1/realtime/client_secrets`
3. **Server returns token**: Ephemeral token valid ~10 minutes
4. **iOS creates WebRTC offer**: Using GoogleWebRTC framework
5. **iOS sends offer to OpenAI**: `POST https://api.openai.com/v1/realtime/calls` with SDP
6. **OpenAI returns answer**: SDP answer to complete handshake
7. **Connection established**: Audio flows directly between iOS and OpenAI

## Files

### Server (Node.js)
- `src/api/rediWebRTCApi.ts` - Token generation endpoint
- Already registered in `server.ts` at `/api/redi/webrtc`

### iOS (Swift)
- `ios-app/Redi/Services/RediWebRTCService.swift` - WebRTC connection service
- `ios-app/Redi/Services/RediConfig.swift` - Configuration with V9 (WebRTC) option

### Dependencies
- **GoogleWebRTC** pod - Already in Podfile

## Configuration

In `RediConfig.swift`:
```swift
enum RediServerVersion: String, CaseIterable {
    case v9 = "webrtc"  // WebRTC direct to OpenAI (RECOMMENDED)
    case v7 = "7"       // WebSocket via server (fallback)
    case v8 = "8"       // Experimental (broken)
}

// Default is V9 (WebRTC)
static var serverVersion: RediServerVersion = .v9
```

## Usage in iOS

```swift
// Check if WebRTC mode
if RediConfig.isWebRTCEnabled {
    // Use RediWebRTCService
    let webrtcService = RediWebRTCService()
    try await webrtcService.connect(mode: "general")
} else {
    // Use RediWebSocketService (V7 fallback)
    let wsService = RediWebSocketService()
    wsService.connect()
}
```

## Testing

1. **Pull latest code**: `git pull`
2. **Clean build**: Xcode → Product → Clean Build Folder
3. **Build and run**: Ensure GoogleWebRTC imports correctly
4. **Check logs**: Look for `[RediWebRTC]` prefixed messages
5. **Test echo**: Speak and verify Redi doesn't respond to itself

## Fallback to V7

If WebRTC has issues:
1. Open Settings in Redi app
2. Change Server Version to "V7 - WebSocket (Fallback)"
3. Restart session

Or programmatically:
```swift
RediConfig.serverVersion = .v7
```

## Troubleshooting

### "Failed to get ephemeral token"
- Check server is running
- Verify OPENAI_API_KEY is set in Render environment

### "SDP exchange failed"
- Token may have expired (10 minute TTL)
- Request new token and retry

### "Data channel not ready"
- ICE connection may still be establishing
- Wait for `onSessionReady` callback

### WebRTC audio not working
- Ensure microphone permission granted
- Check AVAudioSession configuration
- Verify GoogleWebRTC pod is properly installed

## Key Learnings

1. **Don't rely on software echo blocking** - Hardware/WebRTC AEC is essential
2. **Context loss breaks progress** - Document everything in repo
3. **Test echo explicitly** - Record what Redi says, check if it responds to itself
4. **Keep V7 as fallback** - Always have a working alternative
