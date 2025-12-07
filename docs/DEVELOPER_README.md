# Developer Documentation

Deep Personalization Product Engine - API Reference & Developer Guide

## Overview

This system powers deeply personalized Etsy products:
- **Santa Messages**: Voice messages from Santa with emotional depth
- **Holiday Reset Planner**: Navigate family dynamics during holidays
- **New Year Reset Planner**: Reflect on the past year and set intentions

The core philosophy: **Every output should make the user feel truly seen and understood.**

### Two Modes of Operation

1. **Form-Based (Original)**: Users fill out a questionnaire, receive output
2. **Chat-Based (New)**: Conversational experience that guides users through reflection

The chat-based mode is the preferred experience for new products.

---

## Quick Start

### Prerequisites

```bash
# Required environment variables
export ANTHROPIC_API_KEY="your-api-key"
export ELEVENLABS_API_KEY="your-api-key"  # For audio generation

# Optional: Install Puppeteer for PDF generation
npm install puppeteer
```

### Running the Server

```bash
# Development
npm run dev

# Or start Express server directly
npx ts-node src/server.ts
```

Server runs on `http://localhost:3000` by default.

---

## API Endpoints

### Santa Message API

Base URL: `/api/santa`

#### POST /api/santa/generate

Generate a personalized Santa message.

**Request:**
```json
{
  "answers": {
    "childFirstName": "Emma",
    "childGender": "girl",
    "childAge": 7,
    "primaryScenario": "kindness_to_others",
    "proudMoment1": {
      "whatHappened": "A new girl started at school...",
      "howChildResponded": "Emma walked over and invited her...",
      "whyItMattered": "It showed her natural compassion..."
    },
    "proudMoment2": {
      "whatHappened": "...",
      "howChildResponded": "...",
      "whyItMattered": "..."
    },
    "characterTraits": ["kind", "brave", "caring"],
    "growthArea": "Being more confident speaking up...",
    "whatParentWantsReinforced": "That her kindness matters...",
    "tonePreference": "warm_gentle",
    "includeChristianMessage": false
  },
  "mode": "full"  // Options: "script_only", "audio_only", "full"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "full",
  "script": "Ho ho ho, Emma! This is Santa Claus...",
  "audioUrl": "/outputs/santa/santa-emma-1701234567890.mp3",
  "meta": {
    "childName": "Emma",
    "scenario": "kindness_to_others",
    "wordCount": 145,
    "estimatedDurationSeconds": 58,
    "audioFilename": "santa-emma-1701234567890.mp3",
    "generationTimeMs": 8523,
    "safetyCheckPassed": true,
    "spendStatus": {
      "totalSpentThisMonth": 12.50,
      "limit": 250,
      "audioAllowed": true
    }
  }
}
```

#### GET /api/santa/schema

Get the JSON form schema for rendering the questionnaire.

**Response:** Complete form schema with sections, questions, and validation rules.

#### GET /api/santa/stats

Get usage statistics and spend tracking.

#### GET /api/santa/health

Health check endpoint.

---

### Planner API

Base URL: `/api/planner`

#### POST /api/planner/holiday-reset

Generate a Holiday Relationship Reset planner.

**Request:**
```json
{
  "answers": {
    "primaryRelationship": "in_laws",
    "holidayContext": "navigating_divided_time",
    "coreTension.withWhom": "My mother-in-law",
    "coreTension.whatItLooksLike": "She makes passive-aggressive comments...",
    "coreTension.specificExample": "Last Thanksgiving she said...",
    "coreTension.whatYouUsuallyDo": "I go quiet and then vent to my spouse later...",
    "coreTension.howItMakesYouFeel": "Small. Frustrated. Like I'm never good enough...",
    "coreTension.whatYouWishYouCouldSay": "I wish I could tell her...",
    "pastHolidayPattern": "Every year we drive 4 hours...",
    "lastYearSpecific": "Last year she criticized my cooking...",
    "whatYouTriedBefore": "I've tried having a conversation...",
    "biggestFear": "That this year will be another disaster...",
    "secretHope": "That she'd actually appreciate me...",
    "whatPeaceLooksLike": "Being able to enjoy the holiday without walking on eggshells...",
    "whatYouNeedToHear": "That it's okay to set boundaries...",
    "constraints.time": "Only 3 days off work",
    "constraints.energy": "Exhausted from work stress",
    "nonNegotiables": "Christmas morning with just our family",
    "flexibleAreas": "How long we stay at her house",
    "tonePreference": "balanced",
    "spiritualLanguageOk": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "pdfUrl": "/outputs/planners/holiday-reset-1701234567890.pdf",
  "meta": {
    "productId": "holiday_relationship_reset",
    "title": "Your Holiday Game Plan",
    "generationTimeMs": 15234,
    "sectionCount": 8
  }
}
```

#### POST /api/planner/new-year-reset

Generate a New Year Reflection & Reset planner.

**Request:**
```json
{
  "answers": {
    "firstName": "Sarah",
    "yearOverview.threeWordsToDescribe": ["Transformative", "Challenging", "Hopeful"],
    "yearOverview.biggestAccomplishment": "I finally left a job that was draining me...",
    "yearOverview.biggestChallenge": "The uncertainty of starting over...",
    "yearOverview.unexpectedJoy": "Reconnecting with old friends...",
    "significantMoment1.whatHappened": "The day I handed in my resignation...",
    "significantMoment1.whyItMattered": "It was the first time I chose myself...",
    "significantMoment1.howItChangedYou": "I learned I can trust my gut...",
    "significantMoment1.whatYouWantToRemember": "That feeling of freedom...",
    "significantMoment2.whatHappened": "...",
    "significantMoment2.whyItMattered": "...",
    "significantMoment2.howItChangedYou": "...",
    "significantMoment2.whatYouWantToRemember": "...",
    "surprisedYou": "How resilient I actually am...",
    "strengthDiscovered": "I can adapt to change...",
    "patternNoticed": "I tend to put others' needs before my own...",
    "letGoOf": "The guilt about leaving...",
    "oneWordForNextYear": "Courage",
    "feelingYouWant": "Grounded. Present. At peace with uncertainty...",
    "nonNegotiableChange": "Setting better boundaries at work...",
    "whatMightGetInWay": "My perfectionism...",
    "supportNeeded": "Regular check-ins with friends...",
    "tonePreference": "reflective",
    "includeQuarterlyBreakdown": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "pdfUrl": "/outputs/planners/new-year-reset-1701234567890.pdf",
  "meta": {
    "productId": "new_year_reflection_reset",
    "title": "Sarah's 2025 Reflection & Reset",
    "generationTimeMs": 18456,
    "sectionCount": 10
  }
}
```

#### GET /api/planner/schema/:productId

Get form schema for a specific product.

- `/api/planner/schema/holiday-reset`
- `/api/planner/schema/new-year-reset`

#### GET /api/planner/schemas

Get all available product schemas.

#### GET /api/planner/health

Health check for planner endpoints.

---

## Form Schemas

The system uses JSON-serializable form schemas that can be rendered by any front-end framework.

### Schema Structure

```typescript
interface FormSchema {
  productId: string;
  productName: string;
  version: string;
  estimatedTime: string;
  intro: string;
  sections: SectionSchema[];
}

interface SectionSchema {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
  questions: QuestionSchema[];
}

interface QuestionSchema {
  id: string;
  type: QuestionType;  // 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean' | 'number' | 'multi_text' | 'multi_input'
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: SelectOption[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  conditionalOn?: ConditionalLogic;
}
```

### Available Schemas

```typescript
import { getSantaFormSchema } from './schemas/santaFormSchema';
import { getHolidayResetFormSchema } from './schemas/holidayResetFormSchema';
import { getNewYearResetFormSchema } from './schemas/newYearResetFormSchema';

const santaSchema = getSantaFormSchema();
const holidaySchema = getHolidayResetFormSchema();
const newYearSchema = getNewYearResetFormSchema();
```

---

## Developer Test Client

A full-featured test client is available at:

```
/dev/test-santa-client.html
```

Open in browser to:
- Test Santa message generation
- View form schemas
- Check usage stats and spend limits
- Generate with different modes (script_only, audio_only, full)

---

## Scripts

### Generate Etsy Preview Audio

Creates 3 sample audio files for Etsy listing:

```bash
node scripts/generateEtsyPreview.js
```

Output: `outputs/etsy-previews/` directory with sample MP3s.

### Test Individual Generations

```bash
# Test Santa message
node test-santa-deep.js

# Test Holiday Reset planner
node test-holiday-reset.js

# Test New Year Reset planner
node test-new-year-reset.js
```

---

## Architecture

### Directory Structure

```
src/
├── api/
│   ├── santaApiDeep.ts       # Santa message endpoints (form-based)
│   ├── plannerApi.ts         # Planner endpoints (form-based)
│   ├── thoughtChatApi.ts     # Chat-based API (all products)
│   └── thoughtEngineApi.ts   # Legacy/shared endpoints
├── lib/
│   └── thoughtEngine/
│       ├── santa/
│       │   ├── buildSantaScriptDeep.ts    # Script generation
│       │   ├── scenarioPacks.ts           # Scenario templates
│       │   ├── safetyLayer.ts             # Content safety checks
│       │   ├── lengthControl.ts           # Word count targeting
│       │   ├── analyticsLogger.ts         # Usage tracking
│       │   ├── spendLimiter.ts            # TTS spend tracking
│       │   └── ttsErrorHandler.ts         # ElevenLabs retry logic
│       ├── planners/
│       │   ├── generateHolidayResetDeep.ts
│       │   └── generateNewYearResetDeep.ts
│       ├── schemas/
│       │   ├── formSchemaTypes.ts         # Shared types
│       │   ├── santaFormSchema.ts         # Santa questionnaire
│       │   ├── holidayResetFormSchema.ts  # Holiday planner questionnaire
│       │   └── newYearResetFormSchema.ts  # New Year planner questionnaire
│       ├── chat/
│       │   ├── thoughtSession.ts          # Session model & persistence
│       │   ├── productChatConfig.ts       # Product chat configurations
│       │   ├── chatOrchestrator.ts        # Conversation flow management
│       │   ├── chatToGenerationAdapter.ts # Convert chat to generation input
│       │   └── index.ts                   # Module exports
│       ├── pdf/
│       │   └── renderPlannerPDF.ts        # PDF generation
│       └── prompts/
│           ├── santa_script_deep.txt
│           ├── holiday_relationship_reset_deep.txt
│           ├── new_year_reflection_reset_deep.txt
│           ├── chat_santa_guide.txt       # Chat system prompt for Santa
│           ├── chat_holiday_reset_guide.txt
│           └── chat_new_year_reset_guide.txt
```

### Key Modules

#### Safety Layer (`safetyLayer.ts`)

Validates generated content against safety rules:
- Blocks magic/fairy content
- Blocks religious language (unless Christian option enabled)
- Prevents gift promises
- Filters pressure language

```typescript
import { runSafetyCheck, DEFAULT_SAFETY_RULES } from './safetyLayer';

const result = runSafetyCheck(script, childName, {
  ...DEFAULT_SAFETY_RULES,
  allowChristianLanguage: true
});

if (!result.passed) {
  console.log('Issues:', result.issues);
}
```

#### Length Control (`lengthControl.ts`)

Ensures scripts target 120-160 words (45-60 seconds):

```typescript
import { validateAndAdjust, LENGTH_TARGETS } from './lengthControl';

const result = validateAndAdjust(script);
console.log(`Words: ${result.wordCount}, Est: ${result.seconds}s`);
```

#### Spend Limiter (`spendLimiter.ts`)

Tracks ElevenLabs TTS spending:

```typescript
import { canGenerateAudio, recordAudioGeneration, getSpendStatus } from './spendLimiter';

if (canGenerateAudio()) {
  // Generate audio...
  recordAudioGeneration(scriptLength);
}

const status = getSpendStatus();
console.log(`Spent: $${status.totalSpentThisMonth} of $${status.limit}`);
```

#### Analytics Logger (`analyticsLogger.ts`)

Tracks generation metrics:

```typescript
import { logGeneration, logScriptComplete, getUsageStats } from './analyticsLogger';

const logId = logGeneration(childName, age, scenario);
logScriptComplete(logId, script, childName, timeMs);

const stats = getUsageStats();
```

---

## Cost Estimates

### Santa Messages

- **Script generation**: ~$0.01-0.02 per message (Anthropic Claude)
- **Audio synthesis**: ~$0.04-0.05 per message (ElevenLabs, ~400 chars)
- **Total**: ~$0.05-0.07 per message

### Planners

- **PDF generation**: ~$0.02-0.04 per planner (Anthropic Claude)
- **No audio costs**

### Spend Limits

The system tracks monthly TTS spend with a configurable limit (default: $250/month).

---

## Best Practices

### Deep Personalization Philosophy

1. **Every detail matters** - Use specific names, scenarios, and moments
2. **Mirror their language** - Reference exact phrases from their input
3. **Emotional accuracy** - Match the tone they need, not generic positivity
4. **No generic filler** - Every sentence should feel written just for them

### Form Design

1. **Ask for specifics** - "What happened?" not "Describe your year"
2. **Invite honesty** - "No one's judging" reduces filter
3. **Make optional fields powerful** - They reveal what matters most
4. **Progressive depth** - Start easy, go deep

### Safety

1. Always run safety checks on generated content
2. Never promise specific gifts or outcomes
3. Respect religious preferences
4. Validate all user input before processing

---

## Troubleshooting

### Common Issues

**"ANTHROPIC_API_KEY not set"**
- Ensure environment variable is exported
- Check `.env` file is loaded

**"Spend limit reached"**
- Monthly TTS budget exhausted
- Check `getSpendStatus()` for details
- Limit resets on 1st of month

**"Puppeteer not available"**
- Install: `npm install puppeteer`
- PDFs will fall back to HTML without it

**Audio generation failing**
- Check ElevenLabs API key
- Verify rate limits not exceeded
- System will retry 3 times automatically

---

## Chat-Based API (Thought Chat)

The chat-based experience is the preferred mode for new products. It creates a conversational flow that guides users through reflection.

### Endpoints

Base URL: `/api/thought-chat`

#### POST /api/thought-chat/start

Start a new chat session.

**Request:**
```json
{
  "productId": "santa_message"  // or "holiday_reset", "new_year_reset"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "productId": "santa_message",
  "firstAssistantMessage": "Hi there! I'm here to help you create...",
  "meta": {
    "productName": "Personalized Santa Message",
    "estimatedTurns": 12
  }
}
```

#### POST /api/thought-chat/continue

Continue an existing session with a user message.

**Request:**
```json
{
  "sessionId": "uuid-here",
  "userMessage": "My daughter Emma is 7 years old..."
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "assistantMessage": "Emma sounds wonderful...",
  "status": "in_progress",
  "turnCount": 4,
  "shouldWrapUp": false,
  "canGenerate": false
}
```

#### POST /api/thought-chat/generate

Generate the final output from a session.

**Request:**
```json
{
  "sessionId": "uuid-here",
  "forceGenerate": false
}
```

**Response (Santa):**
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "productId": "santa_message",
  "script": "Ho ho ho, Emma!...",
  "audioUrl": "/outputs/santa/santa-chat-emma-123.mp3",
  "meta": {
    "generationTimeMs": 8500,
    "turnCount": 10
  }
}
```

**Response (Planners):**
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "productId": "holiday_reset",
  "pdfUrl": "/outputs/planners/holiday-reset-chat-123.pdf",
  "meta": {
    "generationTimeMs": 15000,
    "turnCount": 14
  }
}
```

### Chat Flow

1. **Start**: Create session, get opening message
2. **Continue**: Exchange messages (typically 5-8 exchanges)
3. **Wrap-up**: System suggests generation when enough info gathered
4. **Generate**: Create final output from conversation

### Dev Tools

Open the chat test client in browser:
```
http://localhost:3000/dev/thought-chat-client.html
```

### Example curl Commands

```bash
# Start a Santa session
curl -X POST http://localhost:3000/api/thought-chat/start \
  -H "Content-Type: application/json" \
  -d '{"productId": "santa_message"}'

# Continue the conversation
curl -X POST http://localhost:3000/api/thought-chat/continue \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "YOUR_SESSION_ID", "userMessage": "My daughter Emma is 7."}'

# Generate the output
curl -X POST http://localhost:3000/api/thought-chat/generate \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "YOUR_SESSION_ID", "forceGenerate": true}'

# Get session details
curl http://localhost:3000/api/thought-chat/session/YOUR_SESSION_ID

# List available products
curl http://localhost:3000/api/thought-chat/products

# Health check
curl http://localhost:3000/api/thought-chat/health
```

---

---

## Email List Management

The system includes a simple email capture system for marketing.

### Email List Location

```
data/email_list.csv
```

The file is created automatically on server startup with headers:
```
timestamp,name,email,source
```

### Viewing the Email List

```bash
# View all signups
cat data/email_list.csv

# Count signups (excluding header)
tail -n +2 data/email_list.csv | wc -l

# View recent signups
tail -20 data/email_list.csv
```

### Exporting the Email List

The file is standard CSV format, compatible with:
- Excel / Google Sheets (open directly)
- Mailchimp (import as CSV)
- ConvertKit (import as CSV)
- Any email marketing platform

```bash
# Copy to Downloads for export
cp data/email_list.csv ~/Downloads/email_export_$(date +%Y%m%d).csv
```

### Signup Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/signup` | GET | Email signup page |
| `/api/signup` | POST | Process signup form |

### CSV Format

Each signup creates a row:
```csv
"2024-12-06T10:30:00.000Z","John","john@example.com","signup_page"
```

Fields:
- `timestamp`: ISO 8601 timestamp
- `name`: Optional, user-provided
- `email`: Required, validated
- `source`: Currently always "signup_page"

### Notes

- Duplicate emails are allowed (tracked as separate signups)
- Data persists in the `data/` directory
- On Render.com free tier, data may be lost on redeploy (consider external storage for production)

---

## Support

For issues or questions:
- Check existing test files for usage examples
- Review the form schemas for field requirements
- Use the developer test client for debugging
