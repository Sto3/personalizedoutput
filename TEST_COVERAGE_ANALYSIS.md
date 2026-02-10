# Test Coverage Analysis

**Date:** 2026-02-10
**Codebase:** personalizedoutput

---

## Current State

- **~290+ source files**, **26 test files** → roughly **10% coverage**
- **No formal test framework** (no Jest, Vitest, or Mocha)
- `npm test` is a placeholder: `echo "Error: no test specified" && exit 1`
- All 26 tests are **standalone integration scripts** run manually via `node`/`npx ts-node`
- Tests hit **real APIs** (Anthropic, ElevenLabs, Ideogram) — no mocking
- Only **happy-path** flows are tested

---

## What IS Tested

| Module | Test Files | Quality |
|---|---|---|
| Vision Board Engines (V7–V12) | 6 files | Good — layout + real generation modes |
| Premium/Hybrid/FlatLay Compositors | 4 files | Good — multiple aesthetics |
| Santa Deep Personalization | 4 files | Good — script gen + TTS + audio |
| Holiday Reset Planner | 1 file | Decent — full deep questionnaire flow |
| New Year Reset Planner | 1 file | Decent — full deep questionnaire flow |
| Ideogram Image Generation | 2 files | Decent — includes safety check retry |
| Thought Engine Chat | 1 file | Basic — session flow only |

---

## What Has ZERO Tests (Ranked by Risk)

### 1. Payment & Billing (CRITICAL — Revenue Impact)

| File | What It Does |
|---|---|
| `src/lib/stripe/stripeService.ts` | Checkout, webhooks, refunds |
| `src/billing/usageTracker.ts` | Usage metering |
| `src/api/checkoutApi.ts` | Purchase flow endpoint |
| `src/api/refundApi.ts` | Refund logic |
| `src/lib/orders/orderValidation.ts` | Order validation |

### 2. Authentication & Authorization (CRITICAL — Security Impact)

| File | What It Does |
|---|---|
| `src/auth/authService.ts` | Login/session management |
| `src/auth/privacyMiddleware.ts` | Privacy enforcement |
| `src/lib/adminAuth.ts` | Admin access control |

### 3. API Layer — 17 Endpoint Files (HIGH — All User-Facing)

All API route files in `src/api/` lack tests for:
- Request validation
- Error responses
- Auth guard enforcement

Key untested endpoints: `santaApi.ts`, `santaApiDeep.ts`, `thoughtEngineApi.ts`, `thoughtChatApi.ts`, `rediApi.ts`, `rediWebRTCApi.ts`, `checkoutApi.ts`, `analyticsApi.ts`, `usageApi.ts`, `referralApi.ts`, etc.

### 4. Redi Real-Time AI — 23 Files (HIGH — Complex Stateful System)

| File | What It Does |
|---|---|
| `militaryGradeOrchestrator.ts` | Main processing pipeline |
| `decisionEngine.ts` | Decision logic |
| `sessionManager.ts` | Session lifecycle |
| `costGuard.ts` | Spend limits |
| `haikuTriage.ts` | Fast response routing |
| `ruleEngine.ts` | Rule evaluation |
| `responsePipeline.ts` | Response construction |
| `responseTiming.ts` | Timing control |

Per `REDI_ARCHITECTURE.md`, these have complex multi-store state synchronization that caused hard-to-diagnose bugs — exactly the code that most needs tests.

### 5. Database Layer — 7 Supabase Services (HIGH — Data Integrity)

| File | What It Does |
|---|---|
| `src/lib/supabase/orderService.ts` | Order CRUD |
| `src/lib/supabase/sessionService.ts` | Session persistence |
| `src/lib/supabase/userService.ts` | User management |
| `src/lib/supabase/analyticsService.ts` | Analytics persistence |
| `src/lib/supabase/blogService.ts` | Blog content |
| `src/lib/supabase/emailListService.ts` | Email list management |

### 6. WebSocket Servers — 9 Files (MEDIUM-HIGH)

`rediServer.ts` through `rediV9Server.ts` — connection lifecycle, message routing, and session cleanup are all untested.

### 7. Integrations — 13 Files (MEDIUM)

Gmail, Outlook, Spotify, SmartThings, Yelp, PayPal, weather, translation, web search — all external service calls with no error handling tests.

### 8. Thought Engine Core — Indirectly Tested Only (MEDIUM)

| File | What It Does |
|---|---|
| `engines/normalizeAnswersToUserInput.ts` | Data transformation |
| `engines/buildMeaningModel.ts` | Meaning extraction |
| `engines/generateSections.ts` | Section generation |
| `engines/renderPdf.ts` | PDF output |
| `chat/chatOrchestrator.ts` | Multi-turn chat flow |
| `pdf/renderPlannerPDF.ts` | PDF rendering |

These are exercised by integration tests but have no isolated unit tests.

### 9. Homework System — 8 Files (MEDIUM)

Entire product vertical with zero tests: `generateHomeworkScript.ts`, `homeworkPDFGenerator.ts`, `homeworkQA.ts`, `lessonVideoComposer.ts`, etc.

### 10. Server Entry Point (MEDIUM)

`src/server.ts` — 55KB monolithic Express server. Route registration, middleware chain, and error handling are all untested.

---

## Qualitative Gaps in Existing Tests

Even for tested modules:

1. **No error/edge case testing** — Only happy paths. No tests for empty input, API timeouts, rate limits, or null responses.

2. **No input validation testing** — Rich user input enters the system without sanitization tests. `safetyLayer.ts` blocking logic is not directly tested.

3. **No assertion library** — Tests use `console.log` for output inspection. Nothing fails programmatically in CI.

4. **No mocking** — Every test hits real APIs. Slow, expensive, flaky. A single ElevenLabs outage breaks the suite.

5. **No concurrency testing** — Redi handles multiple simultaneous sessions with shared state Maps. No race condition or cleanup tests.

---

## Recommended Improvements

### Phase 1: Foundation — Install a Test Framework

- Install **Vitest** (fast, TypeScript-native, minimal config)
- Create `vitest.config.ts` with proper path aliases
- Replace the placeholder `npm test` script
- Adopt `__tests__/` or `*.test.ts` file convention

### Phase 2: High-Impact Unit Tests

**Safety & Input Validation:**
- `safetyLayer.ts` — verify it blocks magic language, gift promises, pressure; allows Christian content only when opted in
- `lengthControl.ts` — verify word count enforcement (120–160 words)
- `normalizeAnswersToUserInput.ts` — test data transformation with edge cases (empty fields, special characters)
- `orderValidation.ts` — test order validation rules

**Payment Flow (mock Stripe SDK):**
- `stripeService.ts` — checkout session creation, webhook signature verification, refund processing
- `checkoutApi.ts` — request validation, error responses

**Authentication:**
- `authService.ts` — token validation, session expiry
- `privacyMiddleware.ts` — unauthenticated request rejection
- `adminAuth.ts` — admin access rules

### Phase 3: Redi State Management Tests

Given the documented complexity:
- Every `Map<sessionId, X>` is cleaned up in `handleSessionEnd()`
- State changes propagate across DecisionContext, OrchestratorState, PipelineState
- `costGuard.ts` enforces spending limits
- `sessionManager.ts` lifecycle: create → active → cleanup

### Phase 4: API Endpoint Tests

Use **supertest** to test Express routes without starting the server:
- Request validation (missing fields, wrong types)
- Auth guard enforcement
- Correct HTTP status codes
- Response shape contracts

### Phase 5: Mock External Services

Create mock implementations for:
- **Anthropic Claude API** — return canned personalized scripts
- **ElevenLabs TTS** — return a test audio buffer
- **Ideogram** — return placeholder images
- **Supabase** — in-memory store

This lets the full suite run in seconds, offline, and for free.

---

## Summary

| Area | Current Coverage | Priority | Effort |
|---|---|---|---|
| Test framework setup | None | P0 | Low |
| Payment/billing tests | 0% | P1 | Medium |
| Auth/security tests | 0% | P1 | Medium |
| Safety layer unit tests | 0% (indirect only) | P1 | Low |
| API endpoint tests | 0% | P2 | Medium |
| Redi state management | 0% | P2 | High |
| Database service tests | 0% | P2 | Medium |
| Thought engine unit tests | Indirect only | P3 | Medium |
| WebSocket tests | 0% | P3 | High |
| Integration service tests | 0% | P3 | Medium |
| Homework product tests | 0% | P4 | Medium |
| Existing test hardening | Happy-path only | P4 | Low |
