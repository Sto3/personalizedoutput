# Redi Architecture Issues - For Claude Chat Discussion

**Date**: January 14, 2026
**Purpose**: Identify fundamental architectural disconnections preventing reliable real-time AI assistance

---

## Executive Summary

The military-grade architecture EXISTS and IS CONNECTED, but there are **two parallel vision systems that don't synchronize**, and **questions take a separate path that bypasses the main pipeline**.

---

## The Two Vision Systems

### 1. iOS Vision Framework (On-Device ML)
- **Location**: iPhone app
- **Speed**: Fast (~10-50ms)
- **What it detects**: Pose, objects, text (OCR) via Apple Vision
- **Output**: `PerceptionPacket` with structured data
- **Flow**: `handlePerception` → `processPerception` → Military-Grade 4-Layer Pipeline

### 2. Server-Side visionService (Claude Vision API)
- **Location**: Render server
- **Speed**: Slow (~2-3 seconds)
- **What it does**: Sends raw frame to Claude for analysis
- **Output**: Text description stored in `ctx.visualContext`
- **Flow**: `handleSnapshot` → `aggregateFrames` → `analyzeSnapshot` → `ctx.visualContext`

---

## The Critical Disconnection

```
                    ┌─────────────────────────────────────────────┐
                    │              iOS App                         │
                    │                                             │
                    │  ┌─────────────────┐  ┌─────────────────┐  │
                    │  │ Microphone      │  │ Camera + Vision │  │
                    │  │                 │  │ Framework       │  │
                    │  └────────┬────────┘  └────────┬────────┘  │
                    └───────────┼─────────────────────┼───────────┘
                                │                     │
                    ┌───────────▼───────────┐ ┌──────▼──────────┐
                    │ Deepgram              │ │ PerceptionPacket│
                    │ (audio transcription) │ │ (pose, objects) │
                    └───────────┬───────────┘ └──────┬──────────┘
                                │                     │
                    ┌───────────▼───────────┐ ┌──────▼──────────┐
                    │ handleTranscript()    │ │ handlePerception│
                    │                       │ │                 │
                    │ Is it a question?     │ │ Military-Grade  │
                    │ (ends with ?)         │ │ 4-Layer Pipeline│
                    └───────────┬───────────┘ └──────┬──────────┘
                                │                     │
                    YES ────────┤                     │
                                │                     │
                    ┌───────────▼───────────┐         │
                    │ handleDirectQuestion  │◄────────┘ (NOT connected!)
                    │                       │
                    │ Uses ctx.visualContext│
                    │ (from server-side     │
                    │  visionService)       │
                    └───────────────────────┘
```

**PROBLEM**: When user asks a question:
1. It goes through `handleTranscript` → `handleDirectQuestion`
2. This uses `ctx.visualContext` from server-side analysis
3. Server-side analysis is 2-3 seconds BEHIND real-time
4. So Redi answers about what was on screen 3 seconds ago, not NOW

---

## Evidence from Logs

### The Stale Vision Problem
```
[Redi Vision] Snapshot analyzed: video editing software...  ← CACHED (old)
User: "Can you help me send an email?"
[Pipeline] APPROVED (sonnet): "I see video editing software, not email"
...
[Redi Vision] Snapshot analyzed: email application  ← ARRIVES TOO LATE
```

### The Two Paths Don't Share Data
- Military-grade pipeline processes: `PerceptionPacket.objects`, `PerceptionPacket.texts`
- Question handler uses: `ctx.visualContext` (different source!)
- These are NOT the same data

---

## Session Metrics Analysis

From the test session logs:
```
haikuResponses: 19
sonnetResponses: 1
silentDecisions: 232
needsReasoning: 0  ← Questions went through handleDirectQuestion, NOT triage
rejectedRateLimit: 2  ← Follow-up questions blocked
rejectedInterrupted: 1
```

**Key observation**: `needsReasoning: 0` because questions detected in `handleTranscript` bypass the triage system entirely. They go straight to `handleDirectQuestion`.

---

## The 5 Fundamental Issues

### Issue 1: Two Vision Systems, Not Synchronized
- iOS sends real-time ML detection (fast, limited)
- Server does Claude vision analysis (slow, smart)
- Question answering uses server-side (stale) instead of iOS (fresh)

### Issue 2: Questions Bypass Military-Grade Pipeline
- Questions detected in `handleTranscript` go to `handleDirectQuestion`
- This SKIPS the rule engine, haiku triage, and response pipeline
- The "military-grade" architecture only handles perception packets

### Issue 3: No "Wait for Fresh Vision" Mechanism
- When asked "what do you see?", should wait for fresh analysis
- Currently uses whatever is cached (could be 3+ seconds old)
- `getFreshVisualAnalysis` exists but still takes 2-3 seconds

### Issue 4: Rate Limiting Conflicts with Conversation
```
[Pipeline] Rejected by rate limit: 2995ms since last
[Pipeline] Rejected by rate limit: 1600ms since last
```
- Humans ask rapid follow-up questions
- Rate limiter blocks them as "too fast"
- This prevents natural conversation flow

### Issue 5: Staleness Threshold Discards Valid Responses
```
[Redi] Skipping speak - context is stale (>2sec old)
```
- Response takes 2+ seconds to generate
- By the time it's ready, context is "stale"
- Valid response gets thrown away

---

## Proposed Solutions (For Discussion)

### Option A: Unify Vision Systems
- Have iOS send raw frames to server
- Server does all analysis
- Single source of truth for visual context
- **Tradeoff**: Slower, but more consistent

### Option B: Trust iOS Vision More
- Use iOS ML detection as primary source
- Server vision as backup/enhancement only
- **Tradeoff**: Less intelligent analysis, but faster

### Option C: Wait-for-Fresh Mechanism
- For visual questions, pause and wait for fresh frame analysis
- Add 500ms-1s delay to ensure fresh context
- **Tradeoff**: Slightly slower responses, but accurate

### Option D: Route Questions Through Military-Grade
- When question detected, inject it into perception packet
- Let it flow through rule engine → triage → sonnet
- **Tradeoff**: More complex, but unified architecture

### Option E: Hybrid Timing
- Use iOS real-time data for immediate context
- Use server analysis for rich descriptions
- Blend both in responses
- **Tradeoff**: Most complex, but potentially best results

---

## Questions for Claude Chat

1. **Should questions go through the military-grade pipeline or stay separate?**

2. **Which vision system should be authoritative - iOS ML or Server Claude?**

3. **How do we solve the timing problem where vision analysis is always behind the conversation?**

4. **Should we add a "wait for fresh frame" mechanism for visual questions?**

5. **What's the right balance between response speed and visual accuracy?**

6. **Is the current rate limiting appropriate for conversational AI?**

---

## Current File Structure Reference

| File | Purpose | Connected? |
|------|---------|------------|
| `rediSocket.ts` | WebSocket routing | ✓ Entry point |
| `militaryGradeOrchestrator.ts` | 4-layer pipeline | ✓ For perception |
| `haikuTriage.ts` | Fast AI decisions | ✓ Layer 2 |
| `responsePipeline.ts` | Filtering/guards | ✓ Layer 4 |
| `ruleEngine.ts` | Instant rules | ✓ Layer 1 |
| `decisionEngine.ts` | Question responses | ⚠️ SEPARATE PATH |
| `visionService.ts` | Server-side Claude vision | ⚠️ NOT IN MAIN FLOW |

---

**Document created for Claude Chat architecture discussion**
**January 14, 2026**
