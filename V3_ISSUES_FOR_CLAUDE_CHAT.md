# Redi V3 Issues - Analysis Request for Claude Chat

## Date: January 17, 2026

## Summary of Problems

Three critical issues observed during testing:

### 1. Echo/Feedback Loop (CRITICAL)
Redi is STILL hearing and responding to its own voice. Evidence from logs:

```
USER: "Email let me know if you need help with that..."  ← This is Redi's previous response echoed back
USER: "Just move it toward that mail icon and click..."  ← Redi's words picked up by mic
USER: "Bicon is next to that. It's the one that looks like..."  ← Echo continues
USER: "and click it to open your mail..."  ← More echo
USER: "The mail icon should be right nearby..."  ← Pattern continues
USER: "compass symbol. So mail at between the notes app..."  ← Echo
```

**Current echo suppression measures (all implemented but not working):**
- Server: `isRediSpeaking` flag to discard audio while Redi speaks
- Server: 2000ms grace period after Redi stops speaking
- Server: `input_audio_buffer.clear` sent to OpenAI when response starts
- iOS: `mute_mic` WebSocket message sent to mute microphone
- iOS: `isMicMuted` flag in V3AudioService to stop audio capture

**Evidence mic muting is partially working:**
```
[Redi V3] 🔇 Discarding audio (830ms since last audio sent)
[Redi V3] 🔇 Discarding audio (1045ms since last audio sent)
```
But the grace period ends, and then echo audio gets through.

### 2. Vision Hallucination (HIGH)
Redi is describing things on screen that it CANNOT see because frames are too old:

```
[Redi V3] Frame too old (2075ms), skipping visual context
```

Then Redi says: "I can't see your cursor directly, but I can see where things are on your screen..."

**This is hallucination** - Redi claims to see the screen but the frame was rejected as too old. Redi is making up what's on screen based on conversation context, not actual vision.

Redi confidently described:
- Mail icon location (incorrect - user said Mail wasn't where Redi said)
- Safari icon in dock (incorrect - user said Safari wasn't in dock at all)
- Notes app position (guessing)

### 3. Not Stopping When User Speaks (MEDIUM)
Redi should pause/stop when user starts talking (like a human would), then continue or respond when user finishes. Currently:
- Redi keeps talking even when user starts speaking
- Creates overlapping speech
- Feels unnatural and "talking over" the user

**OpenAI Realtime API should support this** via server VAD, but it's not interrupting properly.

---

## Architecture Overview

### Current Flow:
```
iOS App                    Backend Server              OpenAI Realtime API
─────────                  ──────────────              ───────────────────
V3AudioService             rediV3Server.ts            gpt-4o-realtime
  - Captures mic audio       - Receives audio           - VAD (voice activity)
  - isMicMuted flag          - Echo suppression         - Transcription
  - 24kHz PCM16              - Forwards to OpenAI       - Response generation
                             - Sends mute_mic to iOS    - Audio output

V3CameraService
  - Captures frames          - Stores currentFrame
  - Sends base64             - Injects when visual Q
```

### Echo Suppression Timeline:
```
T=0:     Redi starts speaking (response.created)
         → isRediSpeaking = true
         → Send mute_mic:true to iOS
         → Clear OpenAI's input_audio_buffer

T=0-3s:  Redi speaks, audio sent to iOS speaker
         → iOS should have mic muted
         → Server discards any incoming audio

T=3s:    Redi finishes (response.done)
         → isRediSpeaking = false
         → rediStoppedSpeakingAt = now

T=3.5s:  Send mute_mic:false to iOS (500ms delay)

T=3-5s:  Grace period - discard audio within 2000ms of last audio sent

T=5s+:   Accept audio again
         → BUT: Echo from speaker is still being picked up!
```

**The Problem:** The 500ms unmute delay + 2000ms grace period = 2.5s total
But the speaker audio is still in the room, and OpenAI may have buffered audio from BEFORE we cleared the buffer.

---

## Code Snippets

### Server Echo Suppression (rediV3Server.ts):
```typescript
case 'audio':
  const ECHO_GRACE_PERIOD_MS = 2000;  // 2 seconds after Redi stops
  const now = Date.now();
  const timeSinceLastAudioSent = now - session.lastAudioSentToClientAt;

  if (session.isRediSpeaking) {
    return;  // Discard while speaking
  }

  if (session.lastAudioSentToClientAt > 0 && timeSinceLastAudioSent < ECHO_GRACE_PERIOD_MS) {
    return;  // Grace period
  }

  // Forward to OpenAI
  sendToOpenAI(session, { type: 'input_audio_buffer.append', audio: audioData });
```

### iOS Mic Muting (V3AudioService.swift):
```swift
@Published var isMicMuted = false

private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
    // ... processing ...

    // Echo suppression: don't send audio while mic is muted
    guard !isMicMuted else { return }

    onAudioCaptured?(data)
}
```

### Frame Freshness Check (rediV3Server.ts):
```typescript
function injectVisualContext(session: V3Session): void {
  const frameAge = Date.now() - session.frameTimestamp;
  if (frameAge > 2000) {
    console.log(`[Redi V3] Frame too old (${frameAge}ms), skipping visual context`);
    return;  // DON'T inject stale frames
  }
  // ... inject frame ...
}
```

---

## Questions for Claude Chat

1. **Echo Suppression**: What's the best approach to completely eliminate echo in a full-duplex audio system where:
   - User's phone speaker plays Redi's voice
   - User's phone microphone picks up that same voice
   - OpenAI's VAD detects it as "user speech"
   - Options considered: AEC (Acoustic Echo Cancellation), longer grace periods, audio fingerprinting

2. **Vision Hallucination**: How do we prevent Redi from claiming to see things when no frame was actually analyzed? Options:
   - Track `lastFrameAnalyzedAt` and refuse to answer visual questions if too old
   - Update system prompt to say "I don't have a recent view of your screen"
   - Force Redi to admit when it can't see

3. **Barge-in/Interruption**: How do we make Redi stop talking when the user starts speaking?
   - OpenAI Realtime API has `input_audio_buffer.speech_started` event
   - Should we cancel the current response when this fires?
   - Use `response.cancel` API?

4. **Frame Freshness**: The 2000ms limit means frames are often too old by the time user finishes speaking. Should we:
   - Increase to 3000-5000ms (risk stale visual context)
   - Continuously update frames even during speech
   - Send frame immediately when visual question detected (before speech ends)

---

## Relevant Files

- `/src/websocket/rediV3Server.ts` - Main V3 server with echo suppression
- `/ios-app/Redi/V3/Services/V3AudioService.swift` - iOS audio with isMicMuted
- `/ios-app/Redi/V3/Services/V3WebSocketService.swift` - WebSocket with mute_mic handler
- `/ios-app/Redi/V3/Views/V3MainView.swift` - Main view wiring callbacks

---

## Logs From Test Session

```
[Redi V3] ✅ Response complete
[Redi V3] 🔇 Discarding audio (830ms since last audio sent)
[Redi V3] 🔇 Discarding audio (1045ms since last audio sent)
[Redi V3] 🎤 User started speaking
[Redi V3] 🎤 User stopped speaking
[Redi V3] ⏱️ Response started (wait: 4ms)
[Redi V3] 👤 USER: "Email let me know if you need help with that. Do you see my cursor now?"
[Redi V3] 🤖 REDI: "I can't see your cursor directly, but I can see where things are on your screen..."
[Redi V3] ✅ Response complete
[Redi V3] 🔇 Discarding audio (1708ms since last audio sent)
[Redi V3] 🎤 User started speaking
[Redi V3] 🎤 User stopped speaking
[Redi V3] Frame too old (2075ms), skipping visual context
[Redi V3] ⏱️ Response started (wait: 5ms)
[Redi V3] 👤 USER: "Just move it toward that mail icon and click this is the the music note..."
[Redi V3] 🤖 REDI: "You're right. The Apple TV icon is there too. The Mail app icon is next to that..."
... [continues with echo pattern]
```
