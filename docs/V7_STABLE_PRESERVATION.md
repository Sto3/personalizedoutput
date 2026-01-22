# Redi V7 - WORKING STABLE VERSION
## Preserved: January 22, 2026

---

## ⚠️ CRITICAL: DO NOT MODIFY WITHOUT READING THIS

This document preserves the **working V7 configuration** that was restored after V8 experiments broke it.

**Backup Branch:** `v7-stable-jan22-2026`
**Commit SHA:** `0ad96b47149e08360a1424ef8a4c986420e549bd`

To restore if broken:
```bash
git checkout v7-stable-jan22-2026 -- src/websocket/rediV7Server.ts
git commit -m "Restore V7 from stable backup"
git push
```

---

## 🔑 CRITICAL CONFIGURATION

### Model URL (MOST IMPORTANT)
```typescript
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';
```

**⚠️ WARNING:** Do NOT use `gpt-4o-realtime-preview-2024-12-17` - it does NOT support vision!

| Model | Vision Support | Notes |
|-------|---------------|-------|
| `gpt-realtime` | ✅ YES | GA model, released Aug 2025 |
| `gpt-4o-realtime-preview-2024-12-17` | ❌ NO | Preview, no vision |
| `gpt-4o-realtime-preview` | ❌ NO | Preview, no vision |

### Session Configuration
```typescript
{
  instructions: SYSTEM_PROMPT,
  voice: 'alloy',
  input_audio_format: 'pcm16',
  output_audio_format: 'pcm16',
  input_audio_transcription: { model: 'whisper-1' },
  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 200,
    silence_duration_ms: 400
  }
}
```

### Image Injection Format
```typescript
{
  type: 'conversation.item.create',
  item: {
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'input_text',
        text: '[User just asked about this - describe what you see:]'
      },
      {
        type: 'input_image',
        image_url: `data:image/jpeg;base64,${cleanBase64}`
      }
    ]
  }
}
```

---

## 📊 CURRENT PERFORMANCE

From logs on Jan 22, 2026:

| Metric | Value |
|--------|-------|
| Simple response (no vision) | ~800-1200ms |
| Vision response | ~1500-2500ms |
| Q-tips identification | ✅ WORKING |
| Audio quality | ✅ Clear, no chipmunk |

---

## 🏗️ ARCHITECTURE

```
iOS App
  ├── Captures audio (PCM16 @ 24kHz)
  ├── Captures frames (JPEG ~25KB)
  └── WebSocket to server (?v=7)
         ↓
Render Server (rediV7Server.ts)
  ├── Receives audio/frames from iOS
  ├── Bridges to OpenAI Realtime API
  ├── Triggers response at speech_stopped
  └── Streams audio back to iOS
         ↓
OpenAI Realtime API (gpt-realtime)
  ├── Processes audio + image
  └── Returns speech response
```

---

## 🚫 WHAT BROKE IT BEFORE

1. **V8 experiments** changed model URL to preview version
2. **Preview model** (`gpt-4o-realtime-preview-2024-12-17`) doesn't support images
3. **Error message:** `Image input is not supported for model gpt-4o-realtime-preview-2024-12-17`

---

## ✅ HOW TO VERIFY IT'S WORKING

1. Check Render logs for: `Model: gpt-realtime (GA with VISION)`
2. Test vision: Ask "What do you see?" pointing at something
3. Logs should show: `🚀 INSTANT RESPONSE (skipped Whisper wait!)`
4. Should NOT see: `❌ Image input is not supported`

---

## 📁 FILES THAT MATTER

| File | Purpose |
|------|---------|
| `src/websocket/rediV7Server.ts` | V7 server (THIS IS THE CRITICAL ONE) |
| `ios-app/Redi/Services/V5/V5WebSocketService.swift` | iOS WebSocket client |
| `ios-app/Redi/Services/V5/V5AudioService.swift` | iOS audio handling |

---

## 🔄 OPTIMIZATION ROADMAP (AFTER STABLE)

Current latency: ~2-3 seconds
Target: Sub-500ms

### Week 1 - Highest Impact
1. Semantic VAD with high eagerness (-200-400ms)
2. Streaming audio playback (-300-500ms)
3. Opus output format (-50-100ms)

### Week 2 - Infrastructure
4. Move server to AWS us-east-1 (-100-200ms)
5. WebRTC direct connection (-200-300ms)
6. Pre-establish connections (-100-200ms)

---

## 📞 RESTORE COMMANDS

If V7 breaks again:

```bash
# Option 1: Restore from backup branch
git checkout v7-stable-jan22-2026 -- src/websocket/rediV7Server.ts
git commit -m "Restore V7 from stable backup"
git push

# Option 2: Restore from specific commit
git checkout 0ad96b47 -- src/websocket/rediV7Server.ts
git commit -m "Restore V7 from commit 0ad96b47"
git push
```

---

## 📝 CHANGE LOG

| Date | Change | Result |
|------|--------|--------|
| Jan 22, 2026 06:27 | Restored gpt-realtime model | ✅ Vision working |
| Jan 22, 2026 02:00 | V8 experiments started | ❌ Broke V7 |
| Jan 20, 2026 | V7 confirmed working | ✅ Baseline |

