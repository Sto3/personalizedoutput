# Redi V3 - Optimization Review Request

## Current Status: Mostly Working, Vision Still Problematic

After several iterations:
- ✅ Echo cancellation working (iOS Voice Processing AEC + server-side guards)
- ✅ Barge-in working (user can interrupt Redi)
- ✅ Response guards tuned
- ⚠️ **Vision STILL not working properly** - see details below

## CRITICAL ISSUE: Vision Not Working

Despite multiple fixes, Redi is not seeing/using the visual context properly.

### What We've Tried:
1. **Timing fix**: Moved `maybeInjectVisualContext()` from `speech_stopped` to after transcript arrives
2. **Fresh frame requests**: Server requests fresh frame from iOS for visual questions
3. **System prompt**: Explicitly tells model it can only describe what it sees when image is provided
4. **Frame injection**: Sending base64 JPEG as `input_image` content type

### Latest Log Evidence:
```
[Redi V3] 📸 Injecting visual context - size: 77296 bytes, age: 1260ms, trigger: "..."
[Redi V3] ⏱️ Response started (wait: 1ms)
[Redi V3] 👤 USER: "What do you see instead of my screen?"
[Redi V3] 🤖 REDI: "I don't have a current view right now..."
```

The image IS being injected (77KB, fresh enough at 1260ms) but OpenAI's response indicates it's not seeing/processing the image.

### Current Image Injection Code:
```typescript
sendToOpenAI(session, {
  type: 'conversation.item.create',
  item: {
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'input_image',
        image_url: `data:image/jpeg;base64,${session.currentFrame}`
      }
    ]
  }
});
```

### Questions About Vision:
1. **Is this the correct format for OpenAI Realtime API images?**
2. **Should `image_url` be a string or an object with `url` and `detail` properties?**
3. **Is there a different content type we should use?**
4. **Does the model need to be configured differently for vision support?**
5. **Should we be using a different model endpoint for vision?**
6. **Is there a timing issue where the image arrives AFTER the response starts?**

## Architecture Overview

```
┌─────────────────┐     WebSocket      ┌──────────────────┐     WebSocket     ┌─────────────────┐
│   iOS App       │◄──────────────────►│  Node.js Server  │◄────────────────►│  OpenAI Realtime│
│                 │                    │  (rediV3Server)  │                   │  API            │
│ - V3AudioService│  audio (base64)    │                  │  audio (base64)   │  gpt-4o-realtime│
│ - V3CameraService│ frames (base64)   │  - Echo suppress │  images (base64)  │                 │
│ - V3WebSocketSvc│  mute_mic          │  - Barge-in      │                   │  - VAD          │
│                 │  stop_audio        │  - Frame mgmt    │                   │  - Transcription│
│                 │  request_frame     │  - Response guard│                   │  - Vision       │
└─────────────────┘                    └──────────────────┘                   └─────────────────┘
```

## Key Code Paths

### Audio Flow (Echo-Safe)
```
1. iOS captures mic audio (24kHz PCM16)
2. Voice Processing AEC removes speaker echo (hardware)
3. If !isMicMuted → send to server
4. Server checks grace period (2s after Redi spoke)
5. If passes → forward to OpenAI
6. OpenAI VAD detects speech → transcribes → responds
7. Response audio sent to iOS → plays on speaker
8. Server sends mute_mic:true when Redi starts speaking
9. Server clears OpenAI's input_audio_buffer
```

### Vision Flow (Timing-Safe)
```
1. iOS continuously sends frames (5s static, 250ms on motion)
2. Server stores currentFrame + frameTimestamp
3. When user transcript arrives:
   - Check if visual question (pattern matching)
   - If frame is stale (>2s), request fresh frame
   - Wait up to 500ms for fresh frame
   - Inject frame as conversation.item.create with input_image
4. OpenAI responds with visual context
```

### Barge-in Flow
```
1. User starts speaking while Redi is speaking
2. Server receives input_audio_buffer.speech_started
3. If isRediSpeaking && currentResponseId:
   - Send response.cancel to OpenAI
   - Send stop_audio to iOS
   - Reset speaking state
4. iOS stops playback immediately
```

## Current Session State

```typescript
interface V3Session {
  // Connection
  id: string;
  clientWs: WebSocket;
  openaiWs: WebSocket | null;

  // Audio/Echo
  isRediSpeaking: boolean;
  rediStoppedSpeakingAt: number;
  lastAudioSentToClientAt: number;
  isUserSpeaking: boolean;

  // Vision
  currentFrame: string | null;
  frameTimestamp: number;
  visualContextInjected: boolean;
  hasRecentVisual: boolean;
  pendingVisualQuestion: boolean;

  // Response management
  currentResponseId: string | null;
  lastResponses: string[];
  lastResponseTime: number;

  // Context
  currentMode: RediMode;
  lastTranscript: string;
  transcriptHistory: string[];
}
```

## Response Guards

```typescript
const RESPONSE_GUARDS = {
  bannedPatterns: [
    /^(exactly|absolutely|definitely|of course)[!,.\s]/i,
    /happy to help/i,
    /let me know if/i,
    /is there anything else/i,
    /great question/i,
    /that's a great/i,
  ],
  maxWords: 50,           // 100 for vision responses
  minResponseGapMs: 1000,
  similarityThreshold: 0.7,
};
```

## Questions for Optimization Review

### 1. Latency Optimization
- Current voice-to-voice latency appears to be ~5-10ms (based on logs)
- Is there anything we can do to reduce perceived latency further?
- Should we be pre-warming any connections?

### 2. Vision Injection Strategy
- Currently we wait for transcript, then inject frame
- This means vision adds latency to visual questions
- Would it be better to speculatively inject frames more often?
- Or use a streaming approach where frame is sent alongside audio?

### 3. Echo Cancellation Robustness
- We have 3 layers: iOS AEC, server grace period, buffer clearing
- Is this overkill? Or should we keep all layers as defense-in-depth?
- The 2000ms grace period might be too conservative - could we reduce it?

### 4. Memory/Resource Management
- Sessions store frame data (can be 50-100KB base64)
- transcriptHistory keeps last 10 entries
- lastResponses keeps last 5 entries
- Any concerns about memory with many concurrent sessions?

### 5. Error Recovery
- What happens if OpenAI connection drops mid-response?
- Should we have automatic reconnection with state preservation?
- How should we handle partial responses?

### 6. Response Quality
- The system prompt tells Redi not to hallucinate visual content
- But the model might still do it sometimes
- Any techniques to further reduce hallucination risk?

### 7. Frame Rate Strategy
- Static: 1 frame per 5 seconds
- Motion: 4 frames per second
- Is this optimal for visual assistance?
- Should we increase static rate for better responsiveness?

### 8. Audio Format
- Currently: PCM 16-bit, 24kHz, mono
- This is what OpenAI requires
- iOS Voice Processing might work better at different rates?

## Recent Logs (Working State)

```
[Redi V3] 🎤 User started speaking
[Redi V3] 🎤 User stopped speaking
[Redi V3] 👤 USER: "What do you see on my screen?"
[Redi V3] 📸 Injecting visual context - size: 77296 bytes, age: 1260ms
[Redi V3] ⏱️ Response started (wait: 5ms)
[Redi V3] 🤖 REDI: "I see a laptop screen with..." (latency: 5ms)
[Redi V3] ✅ Response complete
```

## Files for Reference

- `/src/websocket/rediV3Server.ts` - Main server logic (~950 lines)
- `/ios-app/Redi/V3/Services/V3AudioService.swift` - Audio with AEC
- `/ios-app/Redi/V3/Services/V3CameraService.swift` - Camera with motion detection
- `/ios-app/Redi/V3/Services/V3WebSocketService.swift` - Connection management
- `/ios-app/Redi/V3/Views/V3MainView.swift` - UI and callback wiring
