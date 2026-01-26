# Redi Latency Optimizations

## Target: Sub-800ms Voice-to-Voice

Based on research, 800ms is the best achievable latency with OpenAI's Realtime API:
- ~500ms model inference (OpenAI controls this)
- ~200ms network roundtrip
- ~100ms audio processing

## Implemented Optimizations

### 1. Server Location ✅
- **Render server in Virginia (us-east)**
- Closest region to OpenAI's primary infrastructure
- Verified via `render:get_service` - region: "virginia"

### 2. WebRTC Direct Connection ✅
- Audio/video goes directly from iOS → OpenAI
- No server relay for media (only token endpoint)
- Built-in AEC (echo cancellation)

### 3. Audio Buffer Optimization ✅
- Reduced from 10ms to **5ms** buffer
- `audioSession.setPreferredIOBufferDuration(0.005)`
- Minimum latency for iOS audio

### 4. VAD (Voice Activity Detection) Tuning ✅
- Reduced silence_duration from 500ms to **300ms**
- Faster turn detection = faster response
- `prefix_padding_ms: 200` (was 300)

### 5. Shorter Instructions ✅
- Minimal system prompt = faster processing
- Under 200 tokens for base instructions
- Mode-specific additions are brief

### 6. ICE Optimization ✅
- `continualGatheringPolicy: .gatherContinually`
- `bundlePolicy: .maxBundle`
- `rtcpMuxPolicy: .require`
- Faster connection establishment

### 7. Request Timeouts ✅
- Token fetch: 5s timeout
- SDP exchange: 10s timeout
- Fail fast if slow

### 8. Latency Measurement ✅
- Track time from `speech_stopped` to `response.created`
- Log actual latency for monitoring
- `onLatencyMeasured` callback for UI display

## What We CAN'T Control

1. **Model inference time** (~500ms) - OpenAI's servers
2. **Network distance to OpenAI** - We're as close as possible
3. **OpenAI's internal processing** - Blackbox

## ChatGPT's Advantages

1. **Edge servers globally** - Users hit nearest datacenter
2. **Possibly optimized models** - Internal quantization
3. **Same-company integration** - No API overhead
4. **Massive infrastructure** - Can throw resources at latency

## Measuring Latency

In Xcode console, look for:
```
[RediWebRTC] ⚡ LATENCY: XXXms
```

This measures from `input_audio_buffer.speech_stopped` to `response.created`.

## Future Optimizations

1. **Client-side VAD** - Detect speech locally before server
2. **Predictive audio streaming** - Start playing before complete
3. **Regional token servers** - If expanding globally
4. **Model selection** - Use gpt-realtime-mini for faster responses

## Comparison

| Metric | ChatGPT | Redi (Optimized) |
|--------|---------|------------------|
| Server location | Edge (global) | Virginia (us-east) |
| Connection | WebRTC | WebRTC |
| Audio buffer | Unknown | 5ms |
| VAD silence | Unknown | 300ms |
| Expected latency | ~500-600ms | ~700-900ms |

The ~200ms gap is primarily due to:
- Single server vs edge network
- Possible internal optimizations at OpenAI
