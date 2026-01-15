# Redi Clean Architecture Proposal

## Executive Summary

The current Redi system has grown organically with **multiple competing systems** that cause instability:
- Two response generation systems running in parallel
- 11+ state stores that can desynchronize
- Multiple vision analysis paths overwriting each other
- Race conditions in throttling and frame handling
- Memory leaks from uncleaned Maps

**This proposal outlines a clean rewrite with ONE clear path for everything.**

---

## Current Problems (Audit Findings)

### Problem 1: Two Competing Response Systems

```
CURRENT (BROKEN):
┌─────────────────────────────────────────────────────────────┐
│ MILITARY-GRADE SYSTEM                                        │
│ (processPerception → Rule Engine → Haiku → Sonnet)          │
│ Can decide to speak at any time                              │
└─────────────────────────────────────────────────────────────┘
        ↓ COMPETES WITH ↓
┌─────────────────────────────────────────────────────────────┐
│ LEGACY INSIGHT SYSTEM                                        │
│ (generateInsight every 5s + shouldSpeak every 1s)           │
│ Can ALSO decide to speak at any time                         │
└─────────────────────────────────────────────────────────────┘

Result: Both systems speaking simultaneously, conflicting locks
```

### Problem 2: 11+ State Stores

| Store | Location | Purpose |
|-------|----------|---------|
| contexts | rediSocket.ts | DecisionContext |
| sessionStates | orchestrator | OrchestratorState |
| sessionStates | pipeline | PipelineState |
| sessionStates | ruleEngine | RuleEngineState |
| serverVisualContexts | orchestrator | Vision results |
| metricsPerSession | haikuTriage | Metrics |
| contextBuffers | visionService | Vision history |
| frameBuffers | rediSocket | Raw frames |
| recentPerceptionData | rediSocket | iOS data |
| lastSonnetVisionRun | rediSocket | Throttling |
| recentThinkingPhrases | orchestrator | Dedup |

**Problem**: Same data (sensitivity, isSpeaking, lastSpokeAt) stored in multiple places, can desync.

### Problem 3: Multiple Vision Paths

1. **Haiku Fast Vision** (perception packet)
2. **Sonnet Background Vision** (perception packet, throttled)
3. **On-Demand Fresh Analysis** (user question)
4. **Frame Aggregation Loop** (15s timer)
5. **Motion Clip Analysis** (explicit upload)

All write to `serverVisualContexts` - race conditions possible.

### Problem 4: Unpredictable Speaking

- Rate limit was 3 seconds (now 30s)
- Frame aggregation was 2 seconds (now 15s)
- Multiple systems can trigger speech
- No single "should I speak?" decision point

---

## Proposed Clean Architecture

### Core Principle: ONE Path for Everything

```
CLEAN ARCHITECTURE:

iOS Device
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE ENTRY POINT                        │
│                    handleMessage()                           │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE STATE STORE                        │
│                    SessionState                              │
│                                                              │
│  - sensitivity: number                                       │
│  - mode: RediMode                                            │
│  - isSpeaking: boolean                                       │
│  - lastSpokeAt: number                                       │
│  - visualContext: string                                     │
│  - recentTranscripts: string[]                               │
│  - frameBuffer: Frame[]                                      │
│  - metrics: Metrics                                          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    PERCEPTION PROCESSOR                      │
│                                                              │
│  1. Update state with new perception data                    │
│  2. Run vision (if frame available)                          │
│  3. Determine: User asked something? Scene changed?          │
└─────────────────────────────────────────────────────────────┘
    │
    ├─── User Asked Question ──────────────────────────────────┐
    │                                                          │
    ├─── Unprompted (Scene Changed) ───────────────────────────┤
    │                                                          │
    └─── Nothing Notable ──────────────────────────► SILENT    │
                                                               │
                                                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE DECISION POINT                     │
│                    shouldSpeak()                             │
│                                                              │
│  Checks:                                                     │
│  - Already speaking? → NO                                    │
│  - User speaking? → NO                                       │
│  - Rate limit (unprompted only)? → NO                        │
│  - Duplicate response? → NO                                  │
│                                                              │
│  If all pass → YES, speak                                    │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESPONSE GENERATOR                        │
│                                                              │
│  Simple question → Haiku (~300ms)                            │
│  Complex question → Sonnet (~3s)                             │
│  Unprompted observation → Haiku with vision (~1s)            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    SPEAKER                                   │
│                                                              │
│  1. Set isSpeaking = true                                    │
│  2. Generate TTS                                             │
│  3. Broadcast audio                                          │
│  4. Set isSpeaking = false, lastSpokeAt = now                │
└─────────────────────────────────────────────────────────────┘
```

### Key Changes

#### 1. Remove Legacy Insight System

**DELETE:**
- `startInsightLoop()` - 5 second insight generation timer
- `startSilenceCheckLoop()` - 1 second shouldSpeak timer
- `generateInsight()` calls from rediSocket
- `DecisionContext` - replace with single SessionState

**KEEP:**
- Military-grade orchestrator (simplified)
- Response pipeline guards (merged into single shouldSpeak)

#### 2. Single State Store

```typescript
interface SessionState {
  // Identity
  sessionId: string;
  mode: RediMode;

  // Speaking state (ONE source of truth)
  isSpeaking: boolean;
  lastSpokeAt: number;
  userSpeaking: boolean;

  // Sensitivity
  sensitivity: number;

  // Context
  visualContext: string;
  visualContextTimestamp: number;
  recentTranscripts: string[];

  // Frames (for on-demand analysis)
  frameBuffer: Frame[];

  // Metrics
  metrics: SessionMetrics;
}

// ONE Map for all state
const sessions = new Map<string, SessionState>();
```

#### 3. Single Vision Path

```typescript
async function updateVision(sessionId: string, frame: string): Promise<void> {
  const state = sessions.get(sessionId);
  if (!state) return;

  // Always use Haiku vision (fast, ~1s)
  const visionResult = await analyzeSnapshotFast(sessionId, frame, state.mode);

  if (visionResult) {
    state.visualContext = visionResult;
    state.visualContextTimestamp = Date.now();
  }
}
```

- **Remove**: Frame aggregation loop (causes constant talking)
- **Remove**: Multiple analyzeSnapshot variants for different paths
- **Keep**: One fast vision function (Haiku)
- **Keep**: One deep vision function (Sonnet) for complex questions only

#### 4. Single Decision Point

```typescript
function shouldSpeak(sessionId: string, isPrompted: boolean): boolean {
  const state = sessions.get(sessionId);
  if (!state) return false;

  // Already speaking?
  if (state.isSpeaking) return false;

  // User speaking?
  if (state.userSpeaking) return false;

  // Rate limit (unprompted only)
  if (!isPrompted) {
    const timeSinceLastSpoke = Date.now() - state.lastSpokeAt;
    if (timeSinceLastSpoke < 30000) return false;  // 30 seconds
  }

  return true;
}
```

#### 5. Simplified Response Generation

```typescript
async function generateResponse(
  sessionId: string,
  input: { transcript?: string; visualContext?: string },
  isPrompted: boolean
): Promise<string | null> {
  const state = sessions.get(sessionId);
  if (!state) return null;

  // User asked a question?
  if (input.transcript && isPrompted) {
    const isComplex = isComplexQuestion(input.transcript);

    if (isComplex) {
      return await generateSonnetResponse(state, input.transcript);
    } else {
      return await generateHaikuResponse(state, input.transcript);
    }
  }

  // Unprompted observation (only if visual context exists)
  if (!isPrompted && state.visualContext) {
    return await generateHaikuObservation(state);
  }

  return null;
}
```

---

## Implementation Plan

### Phase 1: Disable Legacy System (Immediate)

**Goal**: Stop the competing systems from causing conflicts.

**Changes**:
1. Comment out `startInsightLoop()` call in session initialization
2. Comment out `startSilenceCheckLoop()` call
3. Remove insight interval cleanup (no longer needed)

**Risk**: Low - just disabling code, not deleting

### Phase 2: Consolidate State (1-2 hours)

**Goal**: Single source of truth for session state.

**Changes**:
1. Create new `SessionState` interface
2. Create single `sessions` Map
3. Update all state reads/writes to use new Map
4. Remove old Maps one by one (with fallback)

### Phase 3: Simplify Vision (1 hour)

**Goal**: One vision path, predictable timing.

**Changes**:
1. Remove frame aggregation loop entirely
2. Keep only `analyzeSnapshotFast()` for normal use
3. Keep `analyzeSnapshotWithGrounding()` only for complex questions
4. Vision runs ONLY when:
   - Perception packet with frame arrives (Haiku fast)
   - User asks "what do you see" (Sonnet deep)

### Phase 4: Single Decision Point (1 hour)

**Goal**: One place decides if Redi speaks.

**Changes**:
1. Merge response pipeline guards into single `shouldSpeak()`
2. Remove separate staleness, interruption, rate limit checks
3. All response generation goes through one decision point

### Phase 5: Clean Up (30 min)

**Goal**: Remove dead code, fix memory leaks.

**Changes**:
1. Delete unused functions
2. Add proper cleanup for all Maps
3. Add cleanup for `recentThinkingPhrases` (memory leak)
4. Test session lifecycle

---

## Expected Behavior After Rewrite

### When User Starts Session
1. Session state created
2. Initial greeting: "I'm ready." (after 1 second)
3. Redi is SILENT until user speaks or asks something

### When User Asks Question
1. Transcript received
2. `shouldSpeak()` → YES (prompted bypasses rate limit)
3. Generate response (Haiku for simple, Sonnet for complex)
4. Speak response
5. Update `lastSpokeAt`

### When User Just Points Camera (No Question)
1. Perception packet received
2. Vision analysis runs (Haiku fast, ~1s)
3. Visual context updated
4. `shouldSpeak()` → Check rate limit (30s)
5. If 30s passed → Maybe speak observation
6. If not → SILENT

### When Scene Changes Significantly
1. Vision detects change (new objects, different scene)
2. `shouldSpeak()` → Check rate limit
3. If significant + 30s passed → Speak about change
4. Otherwise → SILENT

---

## Files to Modify

| File | Changes |
|------|---------|
| rediSocket.ts | Remove legacy loops, consolidate state |
| militaryGradeOrchestrator.ts | Simplify to use single state store |
| haikuTriage.ts | Keep, but simplify inputs |
| responsePipeline.ts | Merge into single shouldSpeak() |
| visionService.ts | Keep only two functions |
| ruleEngine.ts | Keep for sports mode form corrections |
| decisionEngine.ts | Remove most, keep question generation |

---

## Risk Mitigation

1. **Feature Flag**: Add `USE_CLEAN_ARCHITECTURE` flag to enable/disable
2. **Gradual Rollout**: Disable legacy system first, then consolidate
3. **Logging**: Add detailed logging at each step
4. **Rollback Plan**: Keep old code commented, not deleted

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Unprompted responses per minute | ~20 | 0-2 |
| Response latency (prompted) | Variable | <2s |
| State stores | 11+ | 1 |
| Decision points | Multiple | 1 |
| Vision analysis paths | 5 | 2 |

---

## Summary

The current Redi architecture is **fundamentally unstable** because it has two competing response systems, multiple state stores, and no single decision point. The fix is not more patches - it's a clean rewrite with:

1. **ONE state store** per session
2. **ONE decision point** for speaking
3. **ONE vision path** for normal use
4. **NO background timers** generating unsolicited responses

This will make Redi **predictable, controllable, and stable**.
