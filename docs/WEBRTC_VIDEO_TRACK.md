# WebRTC Video Track Implementation

## Overview

This document describes the WebRTC video track implementation for Redi, which enables real-time vision capabilities by streaming camera video directly to OpenAI's Realtime API.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          iOS App                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Camera     │  │  Microphone  │  │   Sentinel Timer     │  │
│  │  (1 FPS)     │  │   (WebRTC)   │  │    (3-10 sec)        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         ▼                 ▼                      │              │
│  ┌──────────────────────────────────────────────┴──────────┐   │
│  │              WebRTC Peer Connection                      │   │
│  │  • H.264 Video Track (hardware accelerated)              │   │
│  │  • Opus Audio Track (built-in AEC)                       │   │
│  │  • Data Channel (events only, NO images)                 │   │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              │ Direct WebRTC Connection
                              │ (no server relay!)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OpenAI Realtime API                          │
│  • Takes snapshots from video stream when needed                │
│  • Processes audio with VAD                                     │
│  • Responds via audio stream                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Key Technical Details

### Video Track

| Setting | Value | Reason |
|---------|-------|--------|
| Resolution | 1920x1080 | High quality for accurate vision |
| Frame Rate | 1 FPS | OpenAI takes snapshots, not continuous video |
| Codec | H.264 | Hardware acceleration (VideoToolbox on iOS) |
| Direction | sendonly | We send video, don't receive |

**Why 1 FPS?** Per [webrtcHacks research](https://webrtchacks.com/how-openai-does-webrtc-in-the-new-gpt-realtime/), OpenAI doesn't process the video stream continuously. Instead, when you ask the model to "look at something", it takes a snapshot from the stream. 1 FPS saves bandwidth while ensuring a recent frame is always available.

### Audio Track

| Setting | Value | Reason |
|---------|-------|--------|
| Codec | Opus | WebRTC default, excellent quality |
| Sample Rate | 24kHz | Match OpenAI's expected format |
| Echo Cancellation | Mandatory | Solves the echo problem |
| Auto Gain Control | Enabled | Better voice levels |
| Noise Suppression | Enabled | Cleaner input |

**Audio Session Mode:** `.videoChat` is CRITICAL for WebRTC AEC to work properly on iOS.

### Data Channel

The data channel is used ONLY for:
- Session events (created, updated)
- Transcripts (user and assistant)
- Response lifecycle (started, done)
- Sentinel prompts (text only)

**IMPORTANT:** We do NOT send images via data channel anymore. The video track handles all visual input.

## Sentinel Architecture

The Sentinel pattern enables proactive interjection - the key differentiator for Redi.

### How It Works

1. A timer fires every N seconds (mode-dependent)
2. If user hasn't spoken recently AND no response is in progress:
   - Send a text-only [SENTINEL] prompt via data channel
   - Model evaluates current video frame
   - If something noteworthy, speaks briefly
   - Otherwise, stays completely silent

### Mode-Specific Intervals

| Mode | Interval | Rationale |
|------|----------|-----------|
| Driving | 3 sec | Safety-critical, frequent checks |
| Cooking | 4 sec | Monitor food status |
| General | 5 sec | Balanced awareness |
| Studying | 6 sec | Less interruption while reading |
| Meeting | 10 sec | Minimal interruption |

### Sentinel Prompts

Each mode has tailored prompts:

- **Driving:** Focus on hazards, obstacles, landmarks
- **Cooking:** Focus on burning, overflowing, timing
- **General:** Focus on anything interesting or important

## Comparison: Old vs New

| Aspect | Old (Data Channel Images) | New (Video Track) |
|--------|--------------------------|-------------------|
| Vision Reliability | Poor (hallucinations) | Excellent |
| Latency | High (base64 encoding) | Low (hardware codec) |
| Echo Cancellation | None | Built-in AEC |
| Bandwidth | Spiky (per-frame) | Smooth (1 FPS stream) |
| Proactive Interjection | No | Yes (Sentinel) |

## Files Changed

### iOS

- `RediWebRTCService.swift` - Added video track and Sentinel timer

### Server

- `rediWebRTCApi.ts` - Updated instructions for Sentinel handling

## Testing

### Verify Video Track

1. Build and run on device
2. Check logs for:
   ```
   [RediWebRTC] 📹 Video track added (will start at 1 FPS)
   [RediWebRTC] 📄 SDP contains video: true
   [RediWebRTC] 📄 Answer contains video: true
   ```

### Verify Sentinel

1. Connect in general mode
2. Wait 5 seconds without speaking
3. Check logs for:
   ```
   [RediWebRTC] 🔍 Sentinel check...
   ```
4. If something visible is interesting, model should speak

### Verify AEC

1. Enable speaker output
2. Have model speak
3. Verify NO echo in response
4. If echo occurs, verify audio session mode is `.videoChat`

## Troubleshooting

### No Video in SDP

Check that `setupLocalVideo()` is called before creating offer.

### Video Not Capturing

Ensure camera permissions are granted in Info.plist:
```xml
<key>NSCameraUsageDescription</key>
<string>Redi needs camera access for vision assistance</string>
```

### Model Not Responding to Vision

1. Verify video track is enabled: `isVideoEnabled == true`
2. Check Render logs for token generation
3. Verify mode instructions include vision references

### Sentinel Not Firing

1. Check timer is started: logs should show `Starting sentinel timer`
2. Verify not blocked by `responseInProgress` or `userRecentlySpeaking`

## Next Steps

1. **Test on Device** - Simulator may not support all camera features
2. **Tune Sentinel Intervals** - May need adjustment based on user feedback
3. **Add Sentinel Toggle** - Let users enable/disable proactive mode
4. **Optimize Video Quality** - May reduce resolution if bandwidth issues

## References

- [webrtcHacks: How OpenAI does WebRTC](https://webrtchacks.com/how-openai-does-webrtc-in-the-new-gpt-realtime/)
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [OpenAI WebRTC Guide](https://platform.openai.com/docs/guides/realtime-webrtc)
- [VoiceModeWebRTCSwift Reference](https://github.com/PallavAg/VoiceModeWebRTCSwift)
