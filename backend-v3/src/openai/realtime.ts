/**
 * OpenAI Realtime API Client
 *
 * Handles WebSocket connection to OpenAI's Realtime API for:
 * - Speech recognition (Whisper)
 * - AI reasoning (GPT-4o)
 * - Voice synthesis (native voices)
 *
 * All in one persistent connection with ~500ms latency.
 */

import WebSocket from 'ws';
import { config } from '../config';

export class OpenAIRealtimeClient {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private responseTextBuffer: string = '';

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';

      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${config.openaiApiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      this.ws.on('open', () => {
        console.log('[OpenAI Realtime] Connected');
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const event = JSON.parse(data.toString());
          this.handleServerEvent(event);
        } catch (error) {
          console.error('[OpenAI Realtime] Parse error:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('[OpenAI Realtime] WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[OpenAI Realtime] Connection closed: ${code} ${reason}`);
      });
    });
  }

  async configure(options: any): Promise<void> {
    this.sendEvent({
      type: 'session.update',
      session: options
    });
  }

  sendAudio(audioData: Buffer) {
    this.sendEvent({
      type: 'input_audio_buffer.append',
      audio: audioData.toString('base64')
    });
  }

  commitAudio() {
    this.sendEvent({
      type: 'input_audio_buffer.commit'
    });
  }

  sendUserMessage(text: string) {
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    });

    this.sendEvent({ type: 'response.create' });
  }

  sendAssistantMessage(text: string) {
    // For proactive interjections - have the model speak this text
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text }]
      }
    });

    // Generate audio for this message
    this.sendEvent({
      type: 'response.create',
      response: {
        modalities: ['audio'],
        instructions: `Say exactly: "${text}"`
      }
    });
  }

  async analyzeFrame(base64Image: string, options: { prompt: string }): Promise<string> {
    // For frame analysis, send image + prompt and get text response
    return new Promise((resolve) => {
      this.responseTextBuffer = '';

      const completionHandler = () => {
        const result = this.responseTextBuffer || '{"speak": false, "confidence": 0, "message": ""}';
        this.responseTextBuffer = '';
        this.off('response.done', completionHandler);
        resolve(result);
      };

      this.on('response.done', completionHandler);

      this.sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_image',
              image: base64Image
            },
            {
              type: 'input_text',
              text: options.prompt
            }
          ]
        }
      });

      this.sendEvent({
        type: 'response.create',
        response: {
          modalities: ['text']  // Text only for analysis
        }
      });

      // Timeout fallback
      setTimeout(() => {
        resolve(this.responseTextBuffer || '{"speak": false, "confidence": 0, "message": ""}');
      }, 5000);
    });
  }

  private sendEvent(event: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  private handleServerEvent(event: any) {
    // Debug log for non-audio events
    if (!['response.audio.delta', 'response.audio_transcript.delta'].includes(event.type)) {
      console.log(`[OpenAI Realtime] Event: ${event.type}`);
    }

    switch (event.type) {
      case 'session.created':
        console.log('[OpenAI Realtime] Session created');
        this.emit('sessionCreated');
        break;

      case 'session.updated':
        console.log('[OpenAI Realtime] Session updated');
        break;

      case 'response.audio.delta':
        this.emit('audioDelta', Buffer.from(event.delta, 'base64'));
        break;

      case 'response.audio_transcript.delta':
        this.emit('transcriptDelta', event.delta, 'assistant');
        break;

      case 'response.audio_transcript.done':
        this.emit('transcript', event.transcript, 'assistant');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        this.emit('transcript', event.transcript, 'user');
        break;

      case 'input_audio_buffer.speech_started':
        console.log('[OpenAI Realtime] Speech started');
        this.emit('speechStarted');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('[OpenAI Realtime] Speech stopped');
        this.emit('speechStopped');
        break;

      case 'response.text.delta':
        this.responseTextBuffer += event.delta;
        break;

      case 'response.text.done':
        this.emit('responseText', event.text);
        break;

      case 'response.done':
        this.emit('response.done');
        break;

      case 'response.audio.done':
        this.emit('audioDone');
        break;

      case 'error':
        console.error('[OpenAI Realtime] Error:', event.error);
        this.emit('error', event.error);
        break;
    }
  }

  // Event emitter methods
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  private emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }

  // Convenience methods for registering handlers
  onAudioDelta(handler: (data: Buffer) => void) {
    this.on('audioDelta', handler);
  }

  onTranscript(handler: (text: string, role: 'user' | 'assistant') => void) {
    this.on('transcript', handler);
  }

  onSpeechStarted(handler: () => void) {
    this.on('speechStarted', handler);
  }

  onSpeechStopped(handler: () => void) {
    this.on('speechStopped', handler);
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
