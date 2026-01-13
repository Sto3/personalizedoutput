# REDI ARCHITECTURE - CRITICAL ENGINEERING RULES

**READ THIS FILE AT EVERY SESSION START AND AFTER EVERY COMPACT**

This document captures hard-won lessons from architectural bugs that took significant effort to diagnose and fix. Following these rules prevents regression.

---

## CRITICAL: Data Flow Disconnection Prevention

### The Pattern That Caused Major Bugs

**Problem**: Data stored in one system but expected/checked in another.

**Example that broke the system**:
```
Audio → Deepgram → handleTranscript() → DecisionContext.transcriptBuffer ✓
Camera → PerceptionPacket → handlePerception() → packet.transcript = EMPTY ✗

Triage checked packet.transcript (always empty) instead of DecisionContext.
Result: 410/410 perception packets marked "no_context" → ALL SILENT
```

**Solution**: Always bridge data at system boundaries.

---

## STATE STORES - Know What Exists

Redi has MULTIPLE state stores. Changes often need to propagate to ALL of them:

| Store | Location | Purpose |
|-------|----------|---------|
| `DecisionContext` | decisionEngine.ts | Legacy decision making, interruption detection |
| `OrchestratorState` | militaryGradeOrchestrator.ts | Military-grade processing state |
| `PipelineState` | responsePipeline.ts | Response filtering and rate limiting |
| `SessionManager` | sessionManager.ts | Session lifecycle, costs, participants |
| `RuleEngineState` | ruleEngine.ts | Rep counting, form rules |
| `TriageMetrics` | haikuTriage.ts | Performance tracking |

### When Updating State, Ask:
1. Does this state exist in multiple stores?
2. Do ALL stores need to be updated?
3. Is there a single source of truth, or do I need to sync?

---

## DATA FLOW MAP

```
┌─────────────────────────────────────────────────────────────────────┐
│                         iOS APP                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   Audio     │  │   Camera    │  │   Sensors   │                  │
│  │ (Microphone)│  │  (Frames)   │  │ (Pose/Motion)│                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                          │
│         ▼                ▼                ▼                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    WebSocket                                 │    │
│  │  audio_chunk | snapshot | perception | mode_change | ...    │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND                                      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   rediSocket.ts                              │    │
│  │  handleMessage() routes to:                                  │    │
│  │    - handleAudioChunk() → Deepgram                          │    │
│  │    - handleSnapshot() → frameBuffers                        │    │
│  │    - handlePerception() → Military-grade orchestrator       │    │
│  │    - handleTranscript() → DecisionContext                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  CRITICAL BRIDGE (added after bug fix):                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  In handlePerception(), BEFORE processing:                   │    │
│  │  - Check DecisionContext for recent transcript               │    │
│  │  - If fresh (<3s), inject into PerceptionPacket              │    │
│  │  - This bridges the audio path to the visual path            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Military-Grade Orchestrator                     │    │
│  │                                                              │    │
│  │  PerceptionPacket                                            │    │
│  │        │                                                     │    │
│  │        ▼                                                     │    │
│  │  ┌──────────────┐                                           │    │
│  │  │ Rule Engine  │ → Instant responses (rep count, form)     │    │
│  │  └──────┬───────┘                                           │    │
│  │         │ (if no rule triggered)                            │    │
│  │         ▼                                                    │    │
│  │  ┌──────────────┐                                           │    │
│  │  │ Haiku Triage │ → Quick responses (2-8 words)             │    │
│  │  └──────┬───────┘                                           │    │
│  │         │ (if needs reasoning)                              │    │
│  │         ▼                                                    │    │
│  │  ┌──────────────┐                                           │    │
│  │  │    Sonnet    │ → Complex reasoning                       │    │
│  │  └──────┬───────┘                                           │    │
│  │         │                                                    │    │
│  │         ▼                                                    │    │
│  │  ┌──────────────┐                                           │    │
│  │  │   Pipeline   │ → Filters, dedup, rate limit              │    │
│  │  └──────────────┘                                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│                            │                                         │
│                            ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Voice Service                             │    │
│  │  Text → ElevenLabs → Audio buffer → WebSocket → iOS         │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ENGINEERING RULES (MUST FOLLOW)

### Rule 1: Every Map Needs Cleanup
```typescript
// WRONG - Memory leak
const myMap = new Map<string, NodeJS.Timeout>();
setInterval(() => { ... }, 5000);  // Never stored, never cleared

// RIGHT
const myIntervals = new Map<string, NodeJS.Timeout>();
const interval = setInterval(() => { ... }, 5000);
myIntervals.set(sessionId, interval);

// In handleSessionEnd():
const interval = myIntervals.get(sessionId);
if (interval) {
  clearInterval(interval);
  myIntervals.delete(sessionId);
}
```

### Rule 2: State Changes Must Propagate
```typescript
// WRONG - Only updates one store
case 'sensitivity_update':
  ctx.sensitivity = newValue;  // DecisionContext only
  break;

// RIGHT - Updates ALL relevant stores
case 'sensitivity_update':
  ctx.sensitivity = newValue;                    // DecisionContext
  updateSensitivity(sessionId, newValue);        // SessionManager
  updateOrchestratorSensitivity(sessionId, newValue);  // Orchestrator
  break;
```

### Rule 3: Speaking State Must Sync
```typescript
// When Redi STARTS speaking:
onRediSpeaking(sessionId);     // Pipeline state
markSpeakingStart(ctx);        // DecisionContext state

// When Redi FINISHES speaking:
onRediFinished(sessionId);     // Pipeline state
markSpoke(ctx, text);          // DecisionContext state
```

### Rule 4: Mode Changes Reset State
```typescript
// In updateMode():
cleanupRuleEngine(sessionId);  // Clear old mode's rules
initRuleEngine(sessionId);     // Fresh start for new mode
state.recentContext = [];      // Old context isn't relevant
```

### Rule 5: Bridge Data at Boundaries
```typescript
// Before processing perception packet, inject transcript:
const ctx = contexts.get(sessionId);
if (ctx && ctx.transcriptBuffer.length > 0) {
  const recentTranscript = ctx.transcriptBuffer[ctx.transcriptBuffer.length - 1];
  const transcriptAge = Date.now() - ctx.lastTranscriptAt;

  if (transcriptAge < 3000 && !packet.transcript) {
    packet.transcript = recentTranscript;
  }
}
```

### Rule 6: Never Use Global Scope for Session State
```typescript
// WRONG - Unreliable, no cleanup
(global as any)[`${sessionId}_lastTranscript`] = value;

// RIGHT - Proper Map with cleanup
const lastProcessedTranscripts = new Map<string, string>();
lastProcessedTranscripts.set(sessionId, value);
// Clean up in handleSessionEnd()
```

---

## CHECKLIST FOR NEW FEATURES

Before implementing ANY new Redi feature, answer these questions:

- [ ] What state does this feature need?
- [ ] Does similar state already exist? (Check all 6 stores above)
- [ ] If creating new state:
  - [ ] Is it in a Map keyed by sessionId?
  - [ ] Is cleanup added to handleSessionEnd()?
  - [ ] Is it documented in this file?
- [ ] Does this feature need data from another path?
  - [ ] Audio path (transcripts)?
  - [ ] Visual path (frames, perception)?
  - [ ] If yes, is the bridge code in place?
- [ ] Does this feature change state that exists in multiple stores?
  - [ ] Are ALL stores updated?
- [ ] Is there an integration test that crosses component boundaries?

---

## COMMON BUGS AND FIXES

### Bug: "Redi doesn't respond" (all silent decisions)
**Check**: Is transcript being bridged to perception packets?
**Check**: Is timeSinceLastSpoke being calculated correctly?
**Check**: Is sensitivity too low (causing long gaps)?

### Bug: "Redi responds to old things"
**Check**: Is there deduplication preventing same transcript from being processed twice?
**Check**: Is context freshness check working (lastTranscriptAt, lastVisualAt)?

### Bug: "Interruption doesn't work"
**Check**: Is ctx.isSpeaking being set AND cleared correctly?
**Check**: Are BOTH PipelineState and DecisionContext updated?

### Bug: "Memory grows over time"
**Check**: Are all Maps cleaned up in handleSessionEnd()?
**Check**: Are all setIntervals stored and cleared?

---

## FILE REFERENCE

| File | Purpose | Key Functions |
|------|---------|---------------|
| `rediSocket.ts` | WebSocket handling, message routing | handleMessage, handlePerception, handleTranscript |
| `militaryGradeOrchestrator.ts` | Main processing pipeline | processPerception, handleDirectQuestion |
| `decisionEngine.ts` | Legacy decisions, context management | shouldSpeak, markSpeakingStart, markSpoke |
| `haikuTriage.ts` | Fast AI decisions | triage, checkSilenceConditions |
| `responsePipeline.ts` | Response filtering | processResponse |
| `ruleEngine.ts` | Instant rule-based responses | evaluateRules |
| `visionService.ts` | Visual analysis | analyzeSnapshot |
| `voiceService.ts` | TTS generation | speak |
| `sessionManager.ts` | Session lifecycle | createSession, endSession |

---

**Last Updated**: January 2026 (Post architectural audit)
**Maintainer**: Claude Code sessions
