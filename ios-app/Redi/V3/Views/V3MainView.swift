/**
 * Redi V3 MainView
 *
 * Primary UI for Redi V3 (OpenAI Realtime API):
 * - Full screen camera preview
 * - Start/Stop session button
 * - Sensitivity slider
 * - Transcript display
 * - ~500ms voice-to-voice latency
 */

import SwiftUI

struct V3MainView: View {
    @StateObject private var cameraService = V3CameraService()
    @StateObject private var audioService = V3AudioService()
    @StateObject private var webSocketService = V3WebSocketService()

    @State private var isSessionActive = false
    @State private var lastTranscript = ""
    @State private var lastRole = ""
    @State private var sensitivity: Double = 0.5
    @State private var isConnecting = false
    @State private var errorMessage: String?
    @State private var isSessionReady = false

    var body: some View {
        ZStack {
            // Camera preview (full screen background)
            V3CameraPreview(cameraService: cameraService)
                .ignoresSafeArea()

            // Dark overlay when not active
            if !isSessionActive {
                Color.black.opacity(0.6)
                    .ignoresSafeArea()

                VStack(spacing: 20) {
                    Image(systemName: "waveform.circle.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.green.opacity(0.8))

                    Text("Redi V3")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Text("OpenAI Realtime API")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
            }

            // Main UI overlay
            VStack {
                // Status bar
                HStack {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 12, height: 12)

                    Text(statusText)
                        .font(.caption)
                        .foregroundColor(.white)

                    Spacer()

                    if isSessionActive && isSessionReady {
                        Text("V3 Active")
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.green.opacity(0.3))
                            .cornerRadius(8)
                            .foregroundColor(.green)
                    }
                }
                .padding()

                Spacer()

                // Transcript display
                if !lastTranscript.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Image(systemName: lastRole == "user" ? "person.fill" : "waveform")
                                .foregroundColor(lastRole == "user" ? .blue : .green)

                            Text(lastRole == "user" ? "You" : "Redi")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }

                        Text(lastTranscript)
                            .font(.body)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.black.opacity(0.8))
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .padding(.horizontal)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                // Error message
                if let error = errorMessage {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.yellow)
                        Text(error)
                            .font(.caption)
                    }
                    .padding()
                    .background(Color.red.opacity(0.2))
                    .cornerRadius(8)
                    .foregroundColor(.white)
                    .padding(.horizontal)
                }

                // Controls
                VStack(spacing: 20) {
                    // Sensitivity slider (only shown when active)
                    if isSessionActive {
                        VStack(spacing: 8) {
                            Text("Interjection Sensitivity")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))

                            HStack {
                                Image(systemName: "speaker.fill")
                                    .foregroundColor(.white.opacity(0.5))
                                    .font(.caption)

                                Slider(value: $sensitivity, in: 0...1)
                                    .accentColor(.green)

                                Image(systemName: "speaker.wave.3.fill")
                                    .foregroundColor(.white.opacity(0.5))
                                    .font(.caption)
                            }
                        }
                        .padding(.horizontal, 40)
                    }

                    // Start/Stop button
                    Button(action: toggleSession) {
                        ZStack {
                            Circle()
                                .fill(isSessionActive ? Color.red : Color.green)
                                .frame(width: 80, height: 80)
                                .shadow(color: (isSessionActive ? Color.red : Color.green).opacity(0.5), radius: 10)

                            if isConnecting {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: isSessionActive ? "stop.fill" : "play.fill")
                                    .foregroundColor(.white)
                                    .font(.title)
                            }
                        }
                    }
                    .disabled(isConnecting)

                    Text(isSessionActive ? "Tap to stop" : "Tap to start")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.bottom, 50)
            }
        }
        .onAppear {
            setupCallbacks()
        }
        .onChange(of: sensitivity) { newValue in
            if isSessionActive {
                webSocketService.sendSensitivity(newValue)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: lastTranscript)
    }

    private var statusColor: Color {
        switch webSocketService.connectionState {
        case .connected:
            return isSessionReady ? .green : .yellow
        case .connecting:
            return .yellow
        case .disconnected:
            return .gray
        case .error:
            return .red
        }
    }

    private var statusText: String {
        switch webSocketService.connectionState {
        case .connected:
            return isSessionReady ? "Ready" : "Initializing..."
        case .connecting:
            return "Connecting..."
        case .disconnected:
            return "Not connected"
        case .error(let msg):
            return "Error: \(msg)"
        }
    }

    private func toggleSession() {
        if isSessionActive {
            stopSession()
        } else {
            startSession()
        }
    }

    private func startSession() {
        isConnecting = true
        errorMessage = nil
        isSessionReady = false

        // Connect to server
        webSocketService.connect()

        // Start camera and audio
        cameraService.startCapture()
        audioService.startRecording()

        isSessionActive = true
        isConnecting = false
    }

    private func stopSession() {
        cameraService.stopCapture()
        audioService.stopRecording()
        webSocketService.disconnect()
        audioService.cleanup()

        isSessionActive = false
        isSessionReady = false
        lastTranscript = ""
    }

    private func setupCallbacks() {
        // Camera frames → Server
        cameraService.onFrameCaptured = { [weak webSocketService] frameData in
            webSocketService?.sendFrame(frameData)
        }

        // Audio → Server
        audioService.onAudioCaptured = { [weak webSocketService] audioData in
            webSocketService?.sendAudio(audioData)
        }

        // Server audio → Speaker
        webSocketService.onAudioReceived = { [weak audioService] audioData in
            audioService?.playAudio(audioData)
        }

        // Server transcripts → UI
        webSocketService.onTranscriptReceived = { text, role in
            withAnimation {
                lastTranscript = text
                lastRole = role
            }

            // Clear transcript after 5 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                if lastTranscript == text {
                    withAnimation {
                        lastTranscript = ""
                    }
                }
            }
        }

        // Session ready
        webSocketService.onSessionReady = {
            isSessionReady = true
            print("[V3MainView] Session ready - OpenAI connected!")
        }

        // Errors
        webSocketService.onError = { error in
            errorMessage = error.localizedDescription

            // Clear error after 5 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                errorMessage = nil
            }
        }
    }
}

#Preview {
    V3MainView()
}
