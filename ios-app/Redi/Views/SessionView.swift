/**
 * SessionView.swift
 *
 * The main active session screen showing camera preview, transcripts,
 * AI responses, and session controls.
 */

import SwiftUI
import AVFoundation

struct SessionView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel: SessionViewModel
    @State private var showingParticipants = false

    init(session: RediSession) {
        _viewModel = StateObject(wrappedValue: SessionViewModel(session: session))
    }

    var body: some View {
        ZStack {
            // Camera Preview (full screen background)
            CameraPreviewView(previewLayer: viewModel.cameraService.previewLayer)
                .ignoresSafeArea()

            // Overlay content
            VStack {
                // Top bar
                topBar

                // Join code display (host only)
                if viewModel.session.isHost, let joinCode = viewModel.session.joinCode {
                    joinCodeDisplay(code: joinCode)
                }

                Spacer()

                // Transcript and AI response area
                responseArea

                // Bottom controls
                bottomControls
            }
            .padding()

            // Sensitivity slider overlay
            if viewModel.showingSensitivitySlider {
                sensitivityOverlay
            }

            // Audio output mode overlay (host only)
            if viewModel.showingAudioSettings {
                audioOutputOverlay
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            viewModel.startSession()
        }
        .onDisappear {
            viewModel.endSession()
        }
        .alert("Session Ending", isPresented: $viewModel.showingEndAlert) {
            Button("Continue", role: .cancel) {}
            Button("End Session", role: .destructive) {
                viewModel.endSession()
                appState.currentSession = nil
            }
        } message: {
            Text("Are you sure you want to end your session early?")
        }
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            // Timer
            HStack(spacing: 4) {
                Image(systemName: "clock.fill")
                Text(viewModel.formattedTime)
                    .font(.system(.title3, design: .monospaced))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.black.opacity(0.6))
            .cornerRadius(20)

            Spacer()

            // Participant count (if multi-phone)
            if viewModel.session.participantCount > 1 || viewModel.session.isHost {
                Button(action: {
                    if viewModel.session.isHost {
                        withAnimation {
                            viewModel.showingAudioSettings.toggle()
                        }
                    }
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "person.2.fill")
                        Text("\(viewModel.session.participantCount)/\(viewModel.session.maxParticipants)")
                            .font(.caption)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.cyan.opacity(0.3))
                    .cornerRadius(20)
                }
                .disabled(!viewModel.session.isHost)
            }

            // Mode indicator
            HStack(spacing: 4) {
                Image(systemName: viewModel.session.mode.icon)
                Text(viewModel.session.mode.displayName)
                    .font(.caption)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.black.opacity(0.6))
            .cornerRadius(20)

            Spacer()

            // End button
            Button(action: {
                viewModel.showingEndAlert = true
            }) {
                Image(systemName: "xmark.circle.fill")
                    .font(.title2)
                    .foregroundColor(.red.opacity(0.8))
            }
        }
        .foregroundColor(.white)
    }

    // MARK: - Join Code Display

    @State private var showingInviteSheet = false

    private func joinCodeDisplay(code: String) -> some View {
        Button(action: {
            showingInviteSheet = true
        }) {
            HStack(spacing: 6) {
                Image(systemName: "person.badge.plus")
                Text("Invite Others")
                    .font(.subheadline)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color.cyan.opacity(0.3))
            .cornerRadius(20)
            .foregroundColor(.cyan)
        }
        .sheet(isPresented: $showingInviteSheet) {
            inviteSheet(code: code)
        }
    }

    private func inviteSheet(code: String) -> some View {
        NavigationView {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Image(systemName: "person.3.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.cyan, Color.purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )

                    Text("Invite Others")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Share this code with others to join your session")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 40)

                // Code display
                VStack(spacing: 8) {
                    Text(code)
                        .font(.system(size: 42, weight: .bold, design: .monospaced))
                        .foregroundColor(.cyan)
                        .tracking(6)

                    Button(action: {
                        UIPasteboard.general.string = code
                    }) {
                        HStack {
                            Image(systemName: "doc.on.doc")
                            Text("Copy Code")
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                        .background(Color.cyan.opacity(0.2))
                        .cornerRadius(8)
                        .foregroundColor(.cyan)
                    }
                }
                .padding()
                .background(Color.white.opacity(0.05))
                .cornerRadius(16)

                Text("They can join from the Redi home screen by tapping 'Join Existing Session'")
                    .font(.caption)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                Spacer()
            }
            .padding()
            .background(Color.black.ignoresSafeArea())
            .navigationBarItems(
                trailing: Button("Done") {
                    showingInviteSheet = false
                }
                .foregroundColor(.cyan)
            )
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Audio Output Overlay (Host Only)

    private var audioOutputOverlay: some View {
        VStack {
            Spacer()

            VStack(spacing: 16) {
                HStack {
                    Text("Audio Settings")
                        .font(.headline)
                    Spacer()
                    Button(action: {
                        withAnimation {
                            viewModel.showingAudioSettings = false
                        }
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                }

                Divider()
                    .background(Color.gray)

                Text("Who hears Redi's voice?")
                    .font(.subheadline)
                    .foregroundColor(.gray)

                VStack(spacing: 12) {
                    audioModeButton(
                        mode: .hostOnly,
                        icon: "person.fill",
                        title: "Host Only",
                        description: "Only your device plays audio"
                    )

                    audioModeButton(
                        mode: .allDevices,
                        icon: "person.3.fill",
                        title: "All Devices",
                        description: "Everyone hears Redi"
                    )
                }

                Divider()
                    .background(Color.gray)

                // Participant list
                VStack(alignment: .leading, spacing: 8) {
                    Text("Connected Devices: \(viewModel.session.participantCount)")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            .padding()
            .background(Color.black.opacity(0.95))
            .cornerRadius(16)
            .padding()

            Spacer()
        }
        .background(Color.black.opacity(0.5))
        .onTapGesture {
            withAnimation {
                viewModel.showingAudioSettings = false
            }
        }
    }

    private func audioModeButton(mode: AudioOutputMode, icon: String, title: String, description: String) -> some View {
        Button(action: {
            viewModel.updateAudioOutputMode(mode)
        }) {
            HStack {
                Image(systemName: icon)
                    .frame(width: 30)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Spacer()

                if viewModel.session.audioOutputMode == mode {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.cyan)
                }
            }
            .padding()
            .background(viewModel.session.audioOutputMode == mode ? Color.cyan.opacity(0.2) : Color.white.opacity(0.1))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(viewModel.session.audioOutputMode == mode ? Color.cyan : Color.clear, lineWidth: 1)
            )
        }
        .foregroundColor(.white)
    }

    // MARK: - Response Area

    private var responseArea: some View {
        VStack(spacing: 12) {
            // Transcript (what user is saying)
            if let transcript = viewModel.currentTranscript, !transcript.isEmpty {
                HStack {
                    Image(systemName: "person.wave.2.fill")
                        .foregroundColor(.gray)
                    Text(transcript)
                        .font(.callout)
                        .foregroundColor(.white.opacity(0.8))
                    Spacer()
                }
                .padding()
                .background(Color.black.opacity(0.6))
                .cornerRadius(12)
            }

            // AI Response (what Redi is saying)
            if let response = viewModel.currentAIResponse, !response.isEmpty {
                HStack {
                    Image(systemName: "sparkles")
                        .foregroundColor(.cyan)
                    Text(response)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                    Spacer()
                }
                .padding()
                .background(
                    LinearGradient(
                        colors: [Color.cyan.opacity(0.3), Color.purple.opacity(0.3)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(12)
            }

            // Visual analysis (what Redi sees)
            if let visual = viewModel.currentVisualContext, !visual.isEmpty {
                HStack {
                    Image(systemName: "eye.fill")
                        .foregroundColor(.purple.opacity(0.8))
                    Text(visual)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                    Spacer()
                }
                .padding(.horizontal)
            }
        }
        .frame(maxHeight: 200)
    }

    // MARK: - Bottom Controls

    private var bottomControls: some View {
        HStack(spacing: 20) {
            // Mute toggle
            Button(action: {
                viewModel.toggleMute()
            }) {
                Image(systemName: viewModel.isMuted ? "mic.slash.fill" : "mic.fill")
                    .font(.title2)
                    .frame(width: 50, height: 50)
                    .background(viewModel.isMuted ? Color.red.opacity(0.8) : Color.white.opacity(0.2))
                    .cornerRadius(25)
            }

            // Sensitivity button
            Button(action: {
                withAnimation {
                    viewModel.showingSensitivitySlider.toggle()
                }
            }) {
                VStack(spacing: 2) {
                    Image(systemName: "slider.horizontal.3")
                    Text(viewModel.sensitivityLabel)
                        .font(.caption2)
                }
                .font(.title3)
                .frame(width: 60, height: 50)
                .background(Color.white.opacity(0.2))
                .cornerRadius(12)
            }

            // Camera switch
            Button(action: {
                viewModel.switchCamera()
            }) {
                Image(systemName: "camera.rotate.fill")
                    .font(.title2)
                    .frame(width: 50, height: 50)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(25)
            }

            // Pause/Resume
            Button(action: {
                viewModel.togglePause()
            }) {
                Image(systemName: viewModel.isPaused ? "play.fill" : "pause.fill")
                    .font(.title2)
                    .frame(width: 50, height: 50)
                    .background(viewModel.isPaused ? Color.green.opacity(0.8) : Color.white.opacity(0.2))
                    .cornerRadius(25)
            }
        }
        .foregroundColor(.white)
        .padding(.bottom, 20)
    }

    // MARK: - Sensitivity Overlay

    private var sensitivityOverlay: some View {
        VStack {
            Spacer()

            VStack(spacing: 16) {
                Text("Redi Sensitivity")
                    .font(.headline)

                HStack {
                    Image(systemName: "speaker.slash.fill")
                    Slider(value: $viewModel.sensitivity, in: 0...1) { editing in
                        if !editing {
                            viewModel.updateSensitivity()
                        }
                    }
                    .accentColor(.cyan)
                    Image(systemName: "speaker.wave.3.fill")
                }

                Text(viewModel.sensitivityDescription)
                    .font(.caption)
                    .foregroundColor(.gray)

                Button("Done") {
                    withAnimation {
                        viewModel.showingSensitivitySlider = false
                    }
                }
                .padding(.horizontal, 40)
                .padding(.vertical, 10)
                .background(Color.cyan)
                .cornerRadius(8)
            }
            .padding()
            .background(Color.black.opacity(0.9))
            .cornerRadius(16)
            .padding()

            Spacer()
        }
        .background(Color.black.opacity(0.5))
        .onTapGesture {
            withAnimation {
                viewModel.showingSensitivitySlider = false
            }
        }
    }
}

// MARK: - Camera Preview View

struct CameraPreviewView: UIViewRepresentable {
    let previewLayer: AVCaptureVideoPreviewLayer?

    func makeUIView(context: Context) -> CameraPreviewUIView {
        let view = CameraPreviewUIView()
        view.backgroundColor = .black
        return view
    }

    func updateUIView(_ uiView: CameraPreviewUIView, context: Context) {
        uiView.previewLayer = previewLayer
    }
}

class CameraPreviewUIView: UIView {
    var previewLayer: AVCaptureVideoPreviewLayer? {
        didSet {
            setupPreviewLayer()
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        previewLayer?.frame = bounds
    }

    private func setupPreviewLayer() {
        // Remove old layers
        layer.sublayers?.forEach { $0.removeFromSuperlayer() }

        // Add preview layer
        if let previewLayer = previewLayer {
            previewLayer.videoGravity = .resizeAspectFill
            previewLayer.frame = bounds
            layer.addSublayer(previewLayer)
        }
    }
}

// MARK: - Preview

struct SessionView_Previews: PreviewProvider {
    static var previews: some View {
        SessionView(session: RediSession(
            id: "test",
            mode: .studying,
            sensitivity: 0.5,
            voiceGender: .female,
            durationMinutes: 30,
            expiresAt: Date().addingTimeInterval(1800),
            status: .active,
            websocketUrl: "/ws/redi?sessionId=test",
            joinCode: "ABC123",
            isHost: true,
            participantCount: 2,
            maxParticipants: 5,
            audioOutputMode: .hostOnly
        ))
        .environmentObject(AppState())
    }
}
