# Voice Fine-Tuning Guide

## Overview

This document captures the exact settings that created our perfected Santa voice and provides a reusable checklist for fine-tuning all future voices to sound human, not robotic.

---

## PERFECTED SANTA VOICE SETTINGS

### The Golden Reference File
**File:** `/outputs/santa/santa-emma-deep-1764934040825.mp3`
**Created:** December 5, 2024
**Duration:** 60.13 seconds
**Script:** Deeply personalized Emma message (kindness theme)

### Exact ElevenLabs Settings Used

```javascript
const SANTA_VOICE_SETTINGS = {
  stability: 0.68,          // KEY: Lower = more natural variation
  similarity_boost: 0.82,   // Higher for character consistency
  style: 0.32               // Moderate for warmth without theatrics
};

// Model used
model_id: 'eleven_monolingual_v1'

// Voice ID (from .env)
voice_id: process.env.ELEVENLABS_SANTA_VOICE_ID  // 1wg2wOjdEWKA7yQD8Kca
```

### What Made It Sound Perfect

1. **Stability at 0.68** (not the 0.85 in other scripts)
   - Creates natural speech rhythm variation
   - Avoids the "reading from a teleprompter" sound
   - Sounds like Santa is actually thinking and speaking

2. **Similarity Boost at 0.82** (higher than typical)
   - Maintains Santa's warm, deep character
   - Keeps the voice consistent throughout
   - Prevents drifting into different tones

3. **Style at 0.32** (low, not theatrical)
   - Avoids over-the-top "HO HO HO" cheese
   - Keeps warmth without forced emotion
   - Sounds genuine, not performative

4. **Model: eleven_monolingual_v1** (not multilingual_v2)
   - More natural English pronunciation
   - Better pacing control
   - More consistent delivery

---

## BEFORE vs AFTER COMPARISON

### WRONG Settings (Generated 65-70 sec videos that sound robotic):
```javascript
// voiceSettings.ts - TOO HIGH stability
const WARM_SANTA_SETTINGS = {
  stability: 0.85,           // TOO HIGH - sounds robotic
  similarity_boost: 0.72,    // OK but could be higher
  style: 0.20,               // OK
  use_speaker_boost: true
};
model_id: 'eleven_multilingual_v2'  // Wrong model
```

**Result:** Stilted, predictable, sounds like AI reading a script

### CORRECT Settings (The perfected 60-sec Emma file):
```javascript
const SANTA_VOICE_SETTINGS = {
  stability: 0.68,           // LOWER = natural variation
  similarity_boost: 0.82,    // HIGHER = character consistency
  style: 0.32                // MODERATE = warm without cheese
};
model_id: 'eleven_monolingual_v1'  // Better for English
```

**Result:** Warm, grandfatherly, sounds like real Santa speaking naturally

---

## VOICE FINE-TUNING CHECKLIST

Use this checklist for EVERY new voice we create:

### Step 1: Initial Test
- [ ] Generate 30-second test clip with default settings
- [ ] Listen for: Does it sound like AI reading a script?
- [ ] Rate naturalness 1-10 (target: 8+)

### Step 2: Adjust Stability (Most Important)
- [ ] If robotic/predictable → LOWER stability (try 0.65-0.72)
- [ ] If too chaotic/inconsistent → RAISE stability (try 0.75-0.80)
- [ ] TARGET: Natural speech variation like real person talking

### Step 3: Adjust Similarity Boost
- [ ] If voice character drifts → RAISE similarity (0.80-0.85)
- [ ] If too monotone/same → LOWER similarity (0.70-0.75)
- [ ] TARGET: Consistent character with natural variation

### Step 4: Adjust Style
- [ ] If boring/flat → RAISE style (0.40-0.60)
- [ ] If theatrical/cheesy → LOWER style (0.20-0.35)
- [ ] TARGET: Genuine emotion, not performative

### Step 5: Model Selection
- [ ] English-only content → `eleven_monolingual_v1`
- [ ] Multi-language or accents → `eleven_multilingual_v2`
- [ ] Fast/lower cost → `eleven_turbo_v2_5`

### Step 6: Final Validation
- [ ] Generate full-length sample (60+ seconds)
- [ ] Play for someone unfamiliar with the project
- [ ] Ask: "Does this sound like AI or a real person?"
- [ ] If they hesitate or say AI → go back to Step 2

---

## VOICE PROFILES

### Santa Voice (Perfected)
```javascript
{
  voice_id: '1wg2wOjdEWKA7yQD8Kca',
  stability: 0.68,
  similarity_boost: 0.82,
  style: 0.32,
  model_id: 'eleven_monolingual_v1'
}
```
**Character:** Warm, deep, grandfatherly American. Gentle pacing. Comforting.

### Lesson Narrator (PERFECTED - December 15, 2024)
```javascript
// PERFECTED settings for warm female educational narrator
{
  voice_id: 'EXAVITQu4vr4xnSDxMaL',  // Sarah voice
  stability: 0.68,           // PERFECTED: Same as Santa - natural variation
  similarity_boost: 0.82,    // PERFECTED: Same as Santa - character consistency
  style: 0.32,               // PERFECTED: Same as Santa - warm but genuine
  model_id: 'eleven_monolingual_v1'
}
```
**Character:** Warm, caring tutor. Natural teaching pace. Like a real person explaining to a child/adult.
**Reference Files:**
- `/outputs/audio/demo-lesson-joe-3min_*.mp3` (162.6s - fractions lesson)
- `/outputs/audio/demo-lesson-maya-3min_*.mp3` (204.3s - solar system lesson)
- `/outputs/audio/demo-lesson-sarah-3min_*.mp3` (199.3s - mortgage lesson)

### Marketing Narrator (Needs Fine-Tuning)
```javascript
// Current settings - NEED ADJUSTMENT
{
  stability: 0.30,
  similarity_boost: 0.75,
  style: 0.65,
  use_speaker_boost: true
}
```
**Target Character:** Confident, friendly. Like a trusted friend recommending something.

---

## SANTA SCRIPT REQUIREMENTS

The perfected Emma script included these elements that the current demos are MISSING:

### Must Include:
1. **"Ho ho ho!"** - Classic Santa greeting
2. **Child's name** - Said 2-3 times naturally
3. **Specific personal details** - From parent questionnaire
4. **Natural pauses** - Using "..." for breathing/thinking
5. **Warm sign-off** - "Merry Christmas, [Name]"

### Current Demo Scripts Are Missing:
- No "Ho ho ho" or Santa identity
- Reading like a generic narrator
- No North Pole or workshop references
- Too scripted, not conversational

### Script Template for Santa Demos:
```
Ho ho ho! Hello [Child Name]!

[Pause]

It's Santa... calling all the way from the North Pole...

[Pause - sounds like thinking]

I've been watching you this year, and I have to tell you something...

[Insert hyper-personal content here]

[Pause]

You know what, [Child Name]? That's exactly why you're on the Nice List.

[Warm close]

Merry Christmas, [Child Name]. I'll see you very soon.
```

---

## TECHNICAL NOTES

### File Naming Convention
```
[product]-[variant]-[descriptor]-[timestamp].mp3
```
Examples:
- `santa-emma-deep-1764934040825.mp3` (perfected reference)
- `lesson-joe-dinosaurs-1765xxx.mp3`
- `marketing-vision-board-intro-1765xxx.mp3`

### Rate Limiting
- ElevenLabs: 2-3 seconds between calls
- Batch processing: Wait 2s between generations
- Monitor character usage to avoid hitting limits

### Cost Estimation
- ~$0.30 per 1000 characters
- 60-second Santa message ≈ 800-1000 characters ≈ $0.25-0.30
- 10-minute lesson ≈ 8000-10000 characters ≈ $2.50-3.00

---

## ACTION ITEMS

### Immediate:
1. [ ] Update `scripts/generateSantaDemoClips.ts` to use perfected settings
2. [ ] Regenerate all 8 Santa demo clips with correct voice
3. [ ] Add Santa identity to all demo scripts

### Lesson Voices:
4. [ ] Test current lesson voice settings with 30-sec sample
5. [ ] Adjust based on fine-tuning checklist
6. [ ] Document perfected lesson voice settings
7. [ ] Generate full 10-minute demo lessons

### Future:
8. [ ] Apply checklist to every new voice we add
9. [ ] Create voice sample library for A/B testing
10. [ ] Monitor user feedback on voice quality

---

*Last Updated: December 15, 2024*
*Reference File: /outputs/santa/santa-emma-deep-1764934040825.mp3*
