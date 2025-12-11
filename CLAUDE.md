# CLAUDE CODE INSTRUCTIONS - EtsyInnovations / Personalized Output

This file contains critical instructions for Claude Code. Read this FIRST at the start of every session.

---

## THE SINGLE MOST IMPORTANT THING

### DEEP PERSONALIZATION IS THE ENTIRE POINT OF THIS BUSINESS

Every single product we create must be **deeply, richly personalized**. This is not optional. This is not a "nice to have." This is the **core value proposition** that makes people say "wow."

**What deep personalization means:**
- Go DEEP with questions - don't accept surface-level inputs
- Extract REAL STORIES - specific moments, vivid details, exact quotes
- Capture what the user MOST wants to convey
- Create outputs that make people EMOTIONAL
- Make both the buyer AND recipient say "this really knows me"

**The Thought Organizer's purpose:**
The Thought Organizer is NOT just a form. It's an immersive ~20 minute experience that:
1. Helps users organize their own thoughts
2. Extracts rich, specific, personal details
3. Reveals patterns they hadn't seen
4. Creates outputs that feel impossibly personal

**Example - Santa Message:**
- BAD: "Tell us about your child" -> Generic message
- GOOD:
  - "Describe a specific moment this year when you felt truly proud"
  - "What did they say or do? What were their exact words?"
  - "Why did this moment matter to you?"
  - "What do you most want Santa to tell them?"
  -> Output includes the child's exact quote, specific details, parent's message woven in naturally

**This applies to EVERY product:**
- Santa Messages (IMPLEMENTED & TESTED)
- Holiday Relationship Reset Planner (IMPLEMENTED)
- New Year Reflection Planner (IMPLEMENTED)
- Vision Boards (V12 LOCKED)
- ANY future product

---

## THINGS WE NEVER DO

1. **Never ask for pronouns** - Infer from name + gender selection
2. **Never use "magic" language** - Respects all beliefs
3. **Never make religious references** - Christmas meaning differs by family
4. **Never be generic** - If output could apply to anyone, it's wrong
5. **Never accept shallow input** - Push for specifics, details, stories

---

## PROJECT STRUCTURE

```
/src/lib/
  visionBoardEngineV12.js          # Vision board generation (LOCKED)

  thoughtEngine/
    models/
      userInput.ts                  # User input types
      meaningModel.ts               # Internal representation
      productConfig.ts              # Product configurations

    configs/
      santa_questionnaire.ts        # Deep Santa questionnaire (2 proud moments)
      holiday_reset_questionnaire.ts  # Deep Holiday Reset questionnaire
      new_year_reset_questionnaire.ts # Deep New Year Reset questionnaire

    engines/
      normalizeAnswersToUserInput.ts
      buildMeaningModel.ts
      generateSections.ts
      renderPdf.ts

    planners/
      generateHolidayResetDeep.ts   # Holiday Reset deep generation
      generateNewYearResetDeep.ts   # New Year Reset deep generation

    santa/
      buildSantaScript.ts           # Original (simple)
      buildSantaScriptDeep.ts       # Deep personalization version
      elevenLabsClient.ts           # ElevenLabs TTS
      scenarioPacks.ts              # Narrative templates & emotional arcs
      safetyLayer.ts                # Content safety rules
      lengthControl.ts              # 45-60 second length control
      analyticsLogger.ts            # Usage analytics & logging
      ttsErrorHandler.ts            # Retry logic for ElevenLabs

    prompts/
      holiday_relationship_reset.txt      # Original prompt
      holiday_relationship_reset_deep.txt # Deep personalization prompt
      new_year_reflection_reset.txt       # Original prompt
      new_year_reflection_reset_deep.txt  # Deep personalization prompt
      santa_message.txt
      santa_message_deep.txt

/src/api/
  thoughtEngineApi.ts               # Planner endpoints
  santaApi.ts                       # Santa endpoints

Test Files:
  test-santa-deep.js                # Santa message test
  test-holiday-reset-deep.js        # Holiday planner test
  test-new-year-reset-deep.js       # New Year planner test

/scripts/
  generateEtsyPreview.js            # Generate Etsy preview MP3s

/outputs/
  santa/                            # Generated Santa messages
  etsy-previews/                    # Preview samples for Etsy listing
  logs/                             # Analytics logs
```

---

## SANTA MESSAGE ENGINE

**Status:** WORKING & TESTED

**Voice Settings (ElevenLabs):**
- stability: 0.68
- similarity_boost: 0.82
- style: 0.32
- model: eleven_monolingual_v1

**Deep Questionnaire Flow:**
1. Basic info (first name, gender -> infer pronouns, age)
2. This year's focus (scenario selection)
3. Proud Moment #1 (what happened, how child responded, why it mattered, vivid detail)
4. Proud Moment #2 (same depth)
5. Character traits (multi-select 2-4)
6. Growth area + challenge overcome
7. What parent wants reinforced (THE KEY)
8. Anything to avoid
9. Tone preference
10. Christian message option (optional - includes faith-based language when requested)

**Scenario Packs (10 scenarios with emotional arcs):**
- academic_effort, kindness_to_others, overcoming_challenge
- big_life_change, building_confidence, being_brave
- helping_family, friendship_growth, personal_achievement
- general_celebration

**Safety Layer:**
- Blocks: magic language, inappropriate content, gift promises, pressure/shame language
- Allows Christian language ONLY when includeChristianMessage=true
- Length validation: 120-160 words (45-60 seconds)
- Name frequency: 2-4 mentions

**Error Handling:**
- Automatic retry with exponential backoff (3 attempts)
- Rate limit handling (60s backoff)
- Quota monitoring
- Voice validation

**Test:** `node test-santa-deep.js`
**Generate Etsy Preview:** `node scripts/generateEtsyPreview.js`

---

## HOLIDAY RELATIONSHIP RESET PLANNER

**Status:** IMPLEMENTED & TESTED

**Target:** ~20 minute immersive session

**Deep Questionnaire Sections:**
1. The Landscape (primary relationship, holiday context)
2. Core Tension Deep Dive:
   - Who is this with?
   - What does it look like in practice?
   - Specific recent example (100+ chars)
   - How you typically respond
   - How it makes you feel
   - What you wish you could say
   - Underlying need (optional)
3. The History:
   - Usual holiday pattern
   - What happened LAST YEAR specifically
   - What you've tried before
   - Why it didn't work
4. Inner World:
   - Biggest fear
   - Secret hope
   - What peace looks like
   - What you feel guilty about
5. Practical Reality:
   - Constraints (time, money, energy, logistics)
   - Non-negotiables
   - Where you have flexibility
6. What You Need:
   - What you need to hear (WE GIVE THIS TO THEM)
   - Permission needed
   - Boundary to set
7. Preferences (tone, spiritual language)

**Output Sections:**
- Where You Are Right Now (their words organized)
- The Tensions You're Holding (named, specific)
- Perspectives to Consider (options, not instructions)
- Your Holiday Game Plan (before/during/after)
- The Words You Needed to Hear (personal, permission-giving)

**Test:** `node test-holiday-reset-deep.js`

---

## NEW YEAR REFLECTION PLANNER

**Status:** IMPLEMENTED & TESTED

**Target:** ~20 minute reflective session

**Deep Questionnaire Sections:**
1. First Name (for personalization)
2. Year Overview:
   - Three words to describe the year
   - Biggest accomplishment
   - Biggest challenge
   - Unexpected joy
   - Unexpected loss (optional)
3. Significant Moment #1:
   - What happened
   - Why it mattered
   - How it changed you
   - What to carry forward
4. Significant Moment #2 (same depth)
5. Difficult Moment (optional):
   - What happened
   - How you got through
   - What you learned
   - Still processing
6. What You Learned:
   - What surprised you about yourself
   - Strength discovered
   - Pattern noticed
   - Relationship insight
7. Unfinished Business:
   - What to let go of
   - Forgive yourself for
   - Conversation needed
   - Unfinished project
8. Looking Forward:
   - One word for next year
   - How you want to FEEL
   - What MUST change
   - Secret dream
9. Practical Intentions:
   - Health, Relationships, Career, Personal
   - What might get in the way
   - Support needed
10. Preferences (tone, quarterly breakdown)

**Output Sections:**
- Your 2024 (their year, organized and honored)
- What You Discovered (patterns, strengths, realizations)
- 2025 - The Year of [Their Word] (intentions, not resolutions)
- Quarterly Focus (optional, realistic breakdown)
- A Year From Now (closing, permission, secret dream honored)

**Test:** `node test-new-year-reset-deep.js`

---

## VISION BOARDS

**Status:** V12 LOCKED

**Layouts:**
- 12 photos, 3x4 polaroid grid
- Fixed rotations/positions (no randomization)
- Feminine style: pastel, bokeh, Snell Roundhand
- Masculine style: dark, no decorations, Bodoni 72

**Engine:** `visionBoardEngineV12.js`

---

## API KEYS (in .env)

- `ANTHROPIC_API_KEY` - Claude API for script/content generation
- `ELEVENLABS_API_KEY` - Text-to-speech for Santa
- `ELEVENLABS_SANTA_VOICE_ID` - Santa voice ID
- `IDEOGRAM_API_KEY` - AI image generation for vision boards
- `OPENAI_API_KEY` - Backup/alternative

---

## DEEP PERSONALIZATION PATTERN

When creating ANY new product, follow this pattern:

### 1. Design the Deep Questionnaire
- Target ~20 minutes of immersive reflection
- Ask for SPECIFIC moments, not general impressions
- Include "why did this matter?" follow-ups
- Ask for exact quotes or vivid details
- Include optional vulnerable questions (guilt, fears, secret hopes)
- Always ask what they need to hear / need permission for

### 2. Create the Deep Prompt Template
- Reference user's EXACT WORDS throughout
- Use their name naturally (2-3 times)
- Include specific details from their answers
- Give them what they said they needed
- Never be generic - if it could apply to anyone, rewrite it

### 3. Generate Output That Feels Personal
- Mirror their language back to them
- Reference specific moments they shared
- Honor their secret hopes/dreams
- Give explicit permission when they asked for it
- Leave them feeling seen, not analyzed

### 4. Validate With Real Examples
- Create test files with realistic, emotionally rich input
- Verify output references specific details
- Ensure nothing feels generic
- Test that vulnerable sections are handled with care

---

## REMEMBER

The goal is to create products that make people cry (happy tears).

When a parent hears Santa mention their child's exact quote about "nobody should feel invisible" - that's the moment. That's the business.

When someone reads their reflection planner and sees their secret dream acknowledged - that's the moment.

When a person navigating holiday stress reads "The Words You Needed to Hear" and feels permission to protect their peace - that's the moment.

Every product should have that moment.

**Deep personalization is not a feature. It IS the product.**

---

## 🚀 DEPLOYMENT - ALWAYS PUSH AFTER CHANGES

**CRITICAL RULE: Every time you make updates, fine-tunings, or changes to the codebase, you MUST commit and push to GitHub to deploy to production.**

**Render Deployment:**
- **Hosting:** Render.com (auto-deploys from GitHub main branch)
- **Live URL:** https://personalizedoutput.com
- **Config:** render.yaml in project root

**After ANY code changes:**
```bash
# 1. Stage all changes
git add -A

# 2. Commit with descriptive message
git commit -m "Description of changes"

# 3. Push to trigger auto-deploy
git push origin main
```

**Deploy takes ~2-5 minutes.** Check Render dashboard for build status.

**Live Product URLs:**
- https://personalizedoutput.com/santa
- https://personalizedoutput.com/holiday-reset
- https://personalizedoutput.com/new-year-reset
- https://personalizedoutput.com/vision-board
- https://personalizedoutput.com/clarity-planner
- https://personalizedoutput.com/flash-cards

**Environment Variables (set in Render dashboard):**
- ANTHROPIC_API_KEY
- ELEVENLABS_API_KEY
- ELEVENLABS_SANTA_VOICE_ID

**DO NOT FORGET:** Local changes don't go live until you push!
