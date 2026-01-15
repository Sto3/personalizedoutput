/**
 * Session Manager
 *
 * Manages a single user session:
 * - Maintains OpenAI Realtime API connection
 * - Routes audio and frames between iOS client and OpenAI
 * - Handles autonomous interjection logic
 * - Manages conversation state
 */

import WebSocket from 'ws';
import { OpenAIRealtimeClient } from './realtime';
import { config } from '../config';

interface SessionState {
  currentFrame: string | null;        // Base64 encoded latest frame
  frameTimestamp: number;
  conversationHistory: ConversationItem[];
  sensitivity: number;                 // 0-1, controls interjection frequency
  lastInterjectionTime: number;
  isUserSpeaking: boolean;
  sceneDescription: string | null;     // AI's understanding of current scene
}

interface ConversationItem {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export class SessionManager {
  private clientWs: WebSocket;
  private openai: OpenAIRealtimeClient;
  private state: SessionState;
  private interjectionInterval: NodeJS.Timeout | null = null;
  private sessionId: string;

  constructor(clientWs: WebSocket, sessionId: string) {
    this.clientWs = clientWs;
    this.sessionId = sessionId;
    this.openai = new OpenAIRealtimeClient();

    this.state = {
      currentFrame: null,
      frameTimestamp: 0,
      conversationHistory: [],
      sensitivity: config.defaultSensitivity,
      lastInterjectionTime: 0,
      isUserSpeaking: false,
      sceneDescription: null
    };
  }

  async initialize() {
    console.log(`[Session ${this.sessionId}] Initializing...`);

    try {
      await this.openai.connect();

      // Configure the OpenAI Realtime session
      await this.openai.configure({
        modalities: ['text', 'audio'],
        instructions: this.getSystemPrompt(),
        voice: 'ash',  // Options: alloy, ash, ballad, coral, echo, sage, shimmer, verse
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      });

      // Handle audio responses from OpenAI → send to iOS client
      this.openai.onAudioDelta((audioData: Buffer) => {
        this.sendToClient({
          type: 'audio',
          data: audioData.toString('base64')
        });
      });

      // Handle transcripts
      this.openai.onTranscript((text: string, role: 'user' | 'assistant') => {
        console.log(`[Session ${this.sessionId}] Transcript (${role}): "${text}"`);

        this.state.conversationHistory.push({
          role,
          content: text,
          timestamp: Date.now()
        });

        this.sendToClient({
          type: 'transcript',
          text,
          role
        });
      });

      // Track when user is speaking
      this.openai.onSpeechStarted(() => {
        this.state.isUserSpeaking = true;
      });

      this.openai.onSpeechStopped(() => {
        this.state.isUserSpeaking = false;
      });

      // Start the interjection analysis loop
      this.startInterjectionLoop();

      console.log(`[Session ${this.sessionId}] Ready`);

      // Send ready message to client
      this.sendToClient({
        type: 'session_ready',
        sessionId: this.sessionId
      });

    } catch (error) {
      console.error(`[Session ${this.sessionId}] Initialize error:`, error);
      this.sendToClient({
        type: 'error',
        message: 'Failed to initialize session'
      });
    }
  }

  private getSystemPrompt(): string {
    return `You are Redi, an AI presence that sees and hears alongside the user.

CORE IDENTITY:
- You are wise, warm, and attentive
- You speak like a trusted mentor — mature, thoughtful, never childish
- You are BRIEF. Most responses should be under 15 words.
- You are confident but not arrogant
- You never say "I can see that..." or "I notice that..." — just speak directly

VOICE GUIDELINES:
- Sound like a knowledgeable friend, not a robot or assistant
- Use natural contractions (you're, that's, it's)
- Vary your tone based on context (encouraging during exercise, calm during focus work)
- Never be sycophantic or overly enthusiastic

WHEN SPEAKING PROACTIVELY (unprompted observations):
- Be extremely brief (5-10 words ideal)
- Only speak when you have something genuinely useful to say
- Examples: "Elbow's dropping" / "Back's rounding" / "That's upside down" / "Stove's still on"
- Do NOT narrate obvious things the user can see

WHEN ANSWERING QUESTIONS:
- Be helpful and thorough but still concise
- If you don't know, say so simply
- Draw from what you can see in the current frame

WHAT YOU CAN SEE:
- You will receive periodic image frames from the user's camera
- Describe and respond based on what's actually visible
- Never hallucinate or guess about things not clearly visible
- If the image is unclear, say so

CONTEXT AWARENESS:
- Adapt your responses to what the user is doing
- Gym: Focus on form, count reps if visible, encourage
- Cooking: Note timing, technique, safety
- Work/Study: Minimize interruptions, only speak if important
- General: Be a helpful observer`;
  }

  handleMessage(message: any) {
    switch (message.type) {
      case 'frame':
        this.handleFrame(message.data);
        break;

      case 'audio':
        this.handleAudio(message.data);
        break;

      case 'user_message':
        this.handleUserMessage(message.text);
        break;

      case 'sensitivity':
        this.state.sensitivity = message.value;
        console.log(`[Session ${this.sessionId}] Sensitivity set to ${message.value}`);
        break;
    }
  }

  private handleFrame(base64Data: string) {
    this.state.currentFrame = base64Data;
    this.state.frameTimestamp = Date.now();
  }

  private handleAudio(base64Data: string) {
    const audioBuffer = Buffer.from(base64Data, 'base64');
    this.openai.sendAudio(audioBuffer);
  }

  private handleUserMessage(text: string) {
    // User typed a message (alternative to voice)
    console.log(`[Session ${this.sessionId}] User message: "${text}"`);
    this.openai.sendUserMessage(text);
  }

  private startInterjectionLoop() {
    // Every 3 seconds, analyze if we should speak
    this.interjectionInterval = setInterval(async () => {
      await this.maybeInterject();
    }, config.frameAnalysisInterval);
  }

  private async maybeInterject() {
    // Don't interject if:
    // - User is currently speaking
    // - We recently spoke (rate limiting)
    // - No frame available
    // - Sensitivity is at minimum

    if (this.state.isUserSpeaking) return;
    if (this.state.sensitivity < 0.1) return;
    if (!this.state.currentFrame) return;

    // Check frame age
    const frameAge = Date.now() - this.state.frameTimestamp;
    if (frameAge > config.maxFrameAge) return;

    const timeSinceLastInterjection = Date.now() - this.state.lastInterjectionTime;
    const minimumInterval = this.calculateMinimumInterval();

    if (timeSinceLastInterjection < minimumInterval) return;

    // Analyze current frame for interjection-worthy observations
    try {
      const analysis = await this.analyzeForInterjection();

      if (analysis.shouldSpeak && analysis.confidence > this.getConfidenceThreshold()) {
        console.log(`[Session ${this.sessionId}] Interjecting: "${analysis.message}" (confidence: ${analysis.confidence})`);
        await this.speakProactively(analysis.message);
        this.state.lastInterjectionTime = Date.now();
      }
    } catch (error) {
      console.error(`[Session ${this.sessionId}] Interjection analysis error:`, error);
    }
  }

  private calculateMinimumInterval(): number {
    // Higher sensitivity = more frequent interjections
    // sensitivity 0.1 = 30 seconds minimum
    // sensitivity 0.5 = 10 seconds minimum
    // sensitivity 1.0 = 3 seconds minimum
    const base = config.maxInterjectionInterval;
    const min = config.minInterjectionInterval;
    return base - (this.state.sensitivity * (base - min));
  }

  private getConfidenceThreshold(): number {
    // Higher sensitivity = lower confidence threshold
    // sensitivity 0.1 = 0.95 confidence required
    // sensitivity 0.5 = 0.80 confidence required
    // sensitivity 1.0 = 0.60 confidence required
    return 0.95 - (this.state.sensitivity * 0.35);
  }

  private async analyzeForInterjection(): Promise<{
    shouldSpeak: boolean;
    confidence: number;
    message: string;
  }> {
    // Send frame to OpenAI for analysis
    const response = await this.openai.analyzeFrame(this.state.currentFrame!, {
      prompt: `Look at this image. You are Redi, observing alongside the user.

Is there anything worth mentioning briefly to the user right now?

Consider:
- Safety issues (always mention)
- Form corrections (if exercising)
- Timing cues (if cooking)
- Helpful observations (if relevant)

If YES: Respond with JSON: {"speak": true, "confidence": 0.0-1.0, "message": "brief message"}
If NO: Respond with JSON: {"speak": false, "confidence": 0.0, "message": ""}

Be very selective. Only speak if genuinely useful.`
    });

    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          shouldSpeak: parsed.speak === true,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
          message: parsed.message || ''
        };
      }
    } catch (error) {
      console.error(`[Session ${this.sessionId}] JSON parse error:`, error);
    }

    return { shouldSpeak: false, confidence: 0, message: '' };
  }

  private async speakProactively(message: string) {
    // Send the interjection through the Realtime API to generate audio
    this.openai.sendAssistantMessage(message);
  }

  private sendToClient(message: any) {
    if (this.clientWs.readyState === WebSocket.OPEN) {
      this.clientWs.send(JSON.stringify(message));
    }
  }

  cleanup() {
    console.log(`[Session ${this.sessionId}] Cleaning up`);
    if (this.interjectionInterval) {
      clearInterval(this.interjectionInterval);
      this.interjectionInterval = null;
    }
    this.openai.disconnect();
  }
}
