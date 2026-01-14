#!/bin/bash
# Auto-runs at Claude Code session start for PersonalizedOutput project

# Output the critical context as a system message
cat << 'CONTEXT'
{
  "continue": true,
  "systemMessage": "REDI PROJECT DETECTED - ARCHITECTURE RULES LOADED:\n\n1. Every Map<sessionId, X> needs cleanup in handleSessionEnd()\n2. State changes must propagate to ALL stores (DecisionContext, OrchestratorState, PipelineState)\n3. isSpeaking must sync BOTH DecisionContext AND PipelineState\n4. Mode changes must reset rule engine (cleanupRuleEngine + initRuleEngine)\n5. Bridge data at system boundaries (inject transcript into perception packets)\n6. Never use global scope for session state - use proper Maps\n\nKEY FILES: rediSocket.ts, militaryGradeOrchestrator.ts, haikuTriage.ts\n\nFor full context, read REDI_ARCHITECTURE.md"
}
CONTEXT
