# STOP - READ THIS BEFORE ANY REDI WORK

## Claude Code: This file exists because architectural bugs have happened repeatedly

**Before writing ANY code for Redi, read `REDI_ARCHITECTURE.md`**

## The 6 Rules (Memorize These)

1. **Every `Map<sessionId, X>` needs cleanup** → Add to `handleSessionEnd()` in rediSocket.ts

2. **State changes propagate to ALL stores** → DecisionContext, OrchestratorState, PipelineState, SessionManager

3. **isSpeaking must sync** → Update BOTH `markSpeakingStart(ctx)` AND `onRediSpeaking(sessionId)`

4. **Mode changes reset state** → Call `cleanupRuleEngine()` + `initRuleEngine()`

5. **Bridge data at boundaries** → Inject transcript into perception packets before processing

6. **No global scope for state** → Use `Map<string, X>` not `(global as any)[key]`

## Quick Diagnostic Commands

If Redi isn't responding, check logs for:
```
[Haiku Triage] Session X metrics: { silentDecisions: Y, quickResponses: Z }
```

- If `quickResponses: 0` → Transcript not reaching triage (check bridge code)
- If `silentDecisions` very high → Check sensitivity and timing gaps

## Key Files

- `src/websocket/rediSocket.ts` - Message routing, bridges, cleanup
- `src/lib/redi/militaryGradeOrchestrator.ts` - Main AI pipeline
- `src/lib/redi/haikuTriage.ts` - Fast response generation

## Why This File Exists

In January 2026, we discovered that data was being stored in one system but checked in another (transcript in DecisionContext but triage checking PerceptionPacket.transcript which was always empty). This caused 410/410 perception packets to be marked silent.

Similar disconnections were found across the codebase. The rules above prevent these bugs.

**READ `REDI_ARCHITECTURE.md` FOR FULL CONTEXT**
