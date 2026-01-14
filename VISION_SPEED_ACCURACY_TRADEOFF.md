# Redi Vision: Speed vs Accuracy Tradeoff - Claude Chat Discussion

**Date**: January 14, 2026
**Problem**: Need both fast AND accurate vision analysis for real-time AI assistant

---

## Current Situation

### The Problem We Just Discovered

Our vision service was using **Claude 3.5 Haiku** for speed (~500-800ms), but it was **hallucinating objects**:

**Actual scene**: Q-tips box + orange-tinted glasses

**Haiku's answers** (all wrong):
- "Crest toothpaste box"
- "Oral-B toothbrush box"
- "Oral-B dental floss"
- "Microsoft Surface laptop"

This is unacceptable - users lose trust immediately when the AI describes things that aren't there.

### The Tradeoff

| Model | Latency | Accuracy | Cost/image |
|-------|---------|----------|------------|
| Claude 3.5 Haiku | ~500-800ms | **Poor** (hallucinating) | ~$0.0025 |
| Claude Sonnet 4 | ~1.5-3s | High | ~$0.01 |
| GPT-4o | ~1-2s | High | ~$0.01 |
| GPT-4o-mini | ~400-600ms | Good | ~$0.002 |

We switched to Sonnet for accuracy, but now responses will be 2-3x slower.

---

## The User's Requirement

> "I think we need both speed and accuracy. Delays make the product seem low quality, and inaccuracies do as well. If we have to prioritize one then accuracy is the priority, but if there is a way to get both--even if more expensive and more complex, we need to take that approach."

---

## Architecture Context

### How Vision Is Used

1. **Periodic Snapshots**: Every 3-5 seconds, a frame is analyzed
2. **Question Answering**: When user asks "what do you see?", fresh analysis is triggered
3. **Motion Clips**: When movement detected, multiple frames analyzed

### Current Flow

```
iPhone Camera → Base64 Frame → Server → Claude Vision API → Description
                                              ↓
                                    Stored in visualContext
                                              ↓
                              Used by Haiku/Sonnet for responses
```

### Timing Requirements

- **Periodic analysis**: 1-3 seconds acceptable (runs in background)
- **Question answering**: <2 seconds ideal (user is waiting)
- **Motion feedback**: <1.5 seconds ideal (feels responsive)

---

## Options to Consider

### Option 1: Parallel Dual-Model (Race)

Send frame to both Claude Sonnet AND GPT-4o simultaneously, use first response.

```typescript
const [claudeResult, openaiResult] = await Promise.race([
  Promise.all([analyzeWithClaude(frame), 'claude']),
  Promise.all([analyzeWithOpenAI(frame), 'openai'])
]);
```

**Pros**: Gets speed of faster model
**Cons**: 2x cost always, might use less accurate response

### Option 2: Parallel Dual-Model (Consensus)

Send to both, wait for both, only speak if they substantially agree.

```typescript
const [claude, openai] = await Promise.all([
  analyzeWithClaude(frame),
  analyzeWithOpenAI(frame)
]);
if (agreementScore(claude, openai) > 0.7) {
  return mergeResponses(claude, openai);
}
```

**Pros**: High confidence, catches hallucinations
**Cons**: 2x cost, slower (waits for both)

### Option 3: Fast Primary + Accuracy Check

Use GPT-4o-mini (fast) as primary. If confidence is low or response seems generic, escalate to Sonnet.

```typescript
const fastResult = await analyzeWithGPT4oMini(frame);
if (fastResult.confidence < 0.8 || isGeneric(fastResult)) {
  return await analyzeWithSonnet(frame);
}
return fastResult;
```

**Pros**: Fast most of the time, accurate when needed
**Cons**: Complexity, sometimes slow

### Option 4: Speculative Execution

Start both models, but cancel the slower one if fast model returns high-confidence result.

```typescript
const fastPromise = analyzeWithGPT4oMini(frame);
const accuratePromise = analyzeWithSonnet(frame);

const fastResult = await fastPromise;
if (fastResult.confidence > 0.9) {
  // Cancel Sonnet call if possible, use fast result
  return fastResult;
}
// Otherwise wait for Sonnet
return await accuratePromise;
```

**Pros**: Fast when confident, accurate when uncertain
**Cons**: Still pays for both calls if uncertain

### Option 5: Ensemble with Weighted Voting

Run multiple fast models (Haiku + GPT-4o-mini), if they agree use that answer. If they disagree, escalate to Sonnet.

```typescript
const [haiku, gpt4mini] = await Promise.all([
  analyzeWithHaiku(frame),
  analyzeWithGPT4oMini(frame)
]);

if (objectsMatch(haiku, gpt4mini)) {
  return haiku; // Fast agreement = confident
}
// Disagreement = uncertainty, use accurate model
return await analyzeWithSonnet(frame);
```

**Pros**: Fast when clear, accurate when ambiguous
**Cons**: 3 API calls in worst case

### Option 6: Pre-filtering with iOS Vision

Use iOS on-device Vision Framework to pre-identify objects, send those hints to cloud model.

```typescript
// iOS already detects: objects, text (OCR), poses
// Send these as hints to cloud model
const cloudResult = await analyzeWithModel(frame, {
  hints: {
    detectedObjects: iosPerception.objects,
    detectedText: iosPerception.texts,
    detectedPose: iosPerception.pose
  }
});
```

**Pros**: Leverages free on-device ML, grounds cloud model
**Cons**: iOS detection is also limited

---

## Questions for Claude Chat

1. **Which approach gives the best speed/accuracy tradeoff for real-time use?**

2. **Is consensus (requiring agreement) worth the latency cost?**

3. **Should we use different strategies for different situations?**
   - Periodic background analysis: Can be slower, prioritize accuracy
   - Direct questions: Need speed, user is waiting
   - Motion clips: Need speed for responsiveness

4. **How do we detect when a model is hallucinating vs. genuinely uncertain?**

5. **Is there value in using iOS on-device detection to "ground" cloud models?**

6. **What's the optimal cost/quality balance for a consumer product?**
   - Current: ~$0.02 vision cost per session
   - Willing to go higher for quality

---

## Current Code Reference

**Vision Service**: `/src/lib/redi/visionService.ts`
- `analyzeSnapshot()` - Single frame analysis
- `analyzeMotionClip()` - Multi-frame movement analysis
- Currently using `claude-sonnet-4-20250514`

**Integration Point**: `/src/websocket/rediSocket.ts`
- `getFreshVisualAnalysis()` - Triggered for questions
- `aggregateAndAnalyzeFrames()` - Periodic analysis
- `handleMotionClip()` - Motion-triggered analysis

---

## Additional Issues: Vision Focus + Voice Quality

### Problem: Redi Reads UI Elements Instead of Scene

From the logs, Redi said "System error showing" and "Check system logs and restart device" - she was reading the **app's own interface** (error states, buttons) instead of what the camera was pointed at.

The vision model needs to:
1. **Ignore app UI overlays** (buttons, status indicators, timestamps)
2. **Focus on the actual scene** the camera is capturing
3. **Understand the difference** between "what's on screen" and "what's being filmed"

### Problem: Voice Quality

Current voice sounds:
- Choppy and unnatural
- "Like a kid" - not authoritative
- Lacks presence and gravitas

**What Redi's voice SHOULD convey:**
- **Strong** - Confident delivery, not hesitant
- **Wise** - Like speaking to a trusted advisor
- **Profound** - Thoughtful, not superficial
- **Adult** - Mature, professional presence
- **Invested** - Genuinely cares about what you're doing
- **Capable** - You trust this voice knows what it's talking about

Think: A wise mentor who is genuinely interested in helping you succeed. Not a chatbot, not a kid, not a generic assistant.

**Current TTS**: Deepgram Aura
- Female voice: "asteria" - sounds young/childish
- Male voice: "orion" - likely has same issues

**BOTH voices need to be changed** - they both sound immature and lack authority.

**Voice Options to Consider:**
- **ElevenLabs**: High quality, customizable, ~$0.30/1000 chars - best for natural, emotional delivery
  - Has mature, professional voices with gravitas
  - Can fine-tune speaking style and emotion
- **OpenAI TTS**: Good quality, fast, ~$0.015/1000 chars
  - "onyx" (male) - deeper, more authoritative
  - "nova" (female) - warmer, more mature than current
- **Play.ht**: High quality, many voice options, emotion control
- **Custom voice clone**: Could create specific "Redi" voices with exact qualities needed
  - Female Redi: Wise, warm, confident mentor
  - Male Redi: Strong, thoughtful, experienced advisor

---

## Revised Questions for Claude Chat

### Vision Questions:
1. **How do we get both speed AND accuracy?** (see options above)
2. **How do we make the model ignore app UI and focus on the actual scene?**
3. **Is dual-model consensus worth the complexity and cost?**

### Voice Questions:
4. **What TTS service/voice would convey wisdom, confidence, and genuine investment?**
5. **Should we consider a custom voice clone for Redi's specific personality?**
6. **How do we eliminate choppiness and make speech flow naturally?**

### Overall Experience:
7. **How do we make Redi feel like a wise, capable adult advisor rather than a chatbot?**
8. **What makes an AI assistant feel "real" and trustworthy vs. artificial?**

---

**Vision Goal**: <1.5s latency with >95% object identification accuracy

**Voice Goal**: Sound like a wise, confident adult advisor who genuinely cares

**Personality Goal**: Redi should feel like a trusted mentor, not a chatbot or kid

**Constraint**: User experience is paramount - both delays and errors hurt trust

**Budget**: Willing to pay more for quality (current ~$0.10/session, can go higher)
