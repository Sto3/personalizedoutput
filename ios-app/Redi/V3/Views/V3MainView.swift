/**
 * V3MainView.swift
 *
 * REDI FOR ANYTHING - Production UI
 * 
 * Updated: Jan 26, 2026 - Fixed camera preview rendering
 */

import SwiftUI
import AVFoundation

struct V3MainView: View {
    @StateObject private var webrtcService = RediWebRTCService()
    @State private var isActive = false
    @State private var sensitivity: Double = 5
    @State private var memoryEnabled = true
    @State private var statusText = "Ready"
    @State private var transcriptLines: [(String, String)] = []
    @State private var latency: Int = 0
    @State private var previewReady = false
    
    var body: some View {
        ZStack {
            // Camera Preview
            if isActive, let layer = webrtcService.previewLayer {
                RediPreviewView(previewLayer: layer)
                    .ignoresSafeArea()
            } else {
                Color.black
                    .ignoresSafeArea()
            }
            
            // Dark overlay when not active
            if !isActive {
                Color.black.opacity(0.6)
                    .ignoresSafeArea()
            }
            
            // UI
            VStack {
                topBar
                
                Spacer()
                
                if isActive && !webrtcService.isActivated {
                    waitingForActivation
                }
                
                Spacer()
                
                if !transcriptLines.isEmpty {
                    transcriptView
                }
                
                if !isActive {
                    controlsPanel
                }
                
                mainButton
                branding
            }
        }
        .onAppear { setupCallbacks() }
        .onChange(of: webrtcService.isConnected) { connected in
            if connected {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    previewReady = webrtcService.previewLayer != nil
                }
            }
        }
    }
    
    // MARK: - Top Bar
    
    private var topBar: some View {
        HStack {
            HStack(spacing: 8) {
                Circle()
                    .fill(isActive ? (webrtcService.isActivated ? Color.green : Color.yellow) : Color.gray)
                    .frame(width: 10, height: 10)
                Text(statusText)
                    .font(.caption)
                    .foregroundColor(.white)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color.black.opacity(0.5))
            .cornerRadius(20)
            
            Spacer()
            
            if isActive && webrtcService.previewLayer != nil {
                HStack(spacing: 4) {
                    Image(systemName: "video.fill")
                        .foregroundColor(.green)
                    Text("Live")
                        .font(.caption2)
                        .foregroundColor(.green)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.green.opacity(0.2))
                .cornerRadius(10)
            }
            
            if memoryEnabled {
                HStack(spacing: 4) {
                    Image(systemName: "brain")
                        .foregroundColor(.purple)
                    Text("Memory")
                        .font(.caption2)
                        .foregroundColor(.purple)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.purple.opacity(0.2))
                .cornerRadius(10)
            }
            
            Spacer()
            
            if isActive && latency > 0 {
                Text("\(latency)ms")
                    .font(.caption)
                    .foregroundColor(latency < 500 ? .green : (latency < 1000 ? .yellow : .red))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.black.opacity(0.3))
                    .cornerRadius(10)
            }
        }
        .padding(.horizontal)
        .padding(.top, 60)
    }
    
    private var waitingForActivation: some View {
        VStack(spacing: 16) {
            Image(systemName: "waveform.circle")
                .font(.system(size: 60))
                .foregroundColor(.cyan.opacity(0.7))
            
            Text("Say \"Hey Redi\" to start")
                .font(.headline)
                .foregroundColor(.white)
        }
        .padding(30)
        .background(Color.black.opacity(0.5))
        .cornerRadius(20)
    }
    
    private var transcriptView: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(transcriptLines.suffix(3), id: \.0) { line in
                HStack {
                    if line.1 == "assistant" {
                        Image(systemName: "sparkles")
                            .foregroundColor(.cyan)
                            .font(.caption)
                    }
                    Text(line.0)
                        .font(.subheadline)
                        .foregroundColor(line.1 == "assistant" ? .white : .white.opacity(0.7))
                        .lineLimit(2)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.black.opacity(0.6))
        .cornerRadius(12)
        .padding(.horizontal)
    }
    
    private var controlsPanel: some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "brain")
                    .foregroundColor(.purple)
                Text("Remember me across sessions")
                    .font(.subheadline)
                    .foregroundColor(.white)
                Spacer()
                Toggle("", isOn: $memoryEnabled)
                    .labelsHidden()
                    .onChange(of: memoryEnabled) { newValue in
                        webrtcService.setMemoryEnabled(newValue)
                    }
            }
            .padding(.horizontal)
            
            Divider().background(Color.white.opacity(0.3))
            
            VStack(spacing: 8) {
                HStack {
                    Text("How often should Redi speak up?")
                        .font(.subheadline)
                        .foregroundColor(.white)
                    Spacer()
                    Text("\(Int(sensitivity))/10")
                        .font(.caption)
                        .foregroundColor(.cyan)
                }
                
                HStack {
                    Text("🤐")
                    Slider(value: $sensitivity, in: 1...10, step: 1)
                        .accentColor(.cyan)
                        .onChange(of: sensitivity) { newValue in
                            webrtcService.setSensitivity(Int(newValue))
                        }
                    Text("💬")
                }
                
                Text(sensitivityLabel)
                    .font(.caption2)
                    .foregroundColor(.cyan)
            }
            .padding(.horizontal)
        }
        .padding(.vertical)
        .background(Color.black.opacity(0.7))
        .cornerRadius(16)
        .padding(.horizontal, 20)
    }
    
    private var sensitivityLabel: String {
        switch Int(sensitivity) {
        case 1...2: return "Quiet - Only speaks when important"
        case 3...4: return "Selective - Shares occasionally"
        case 5...6: return "Balanced - Active partner"
        case 7...8: return "Engaged - Frequently participating"
        case 9...10: return "Full - Constant companion"
        default: return "Balanced"
        }
    }
    
    private var mainButton: some View {
        Button(action: toggleSession) {
            ZStack {
                Circle()
                    .fill(isActive ? Color.red : Color.cyan)
                    .frame(width: 80, height: 80)
                
                if webrtcService.isConnecting {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Image(systemName: isActive ? "stop.fill" : "play.fill")
                        .font(.system(size: 30))
                        .foregroundColor(.white)
                }
            }
        }
        .disabled(webrtcService.isConnecting)
        .padding(.bottom, 20)
    }
    
    private var branding: some View {
        VStack(spacing: 4) {
            Text("Redi for Anything")
                .font(.headline)
                .foregroundColor(.white)
            
            if isActive {
                Text(webrtcService.isActivated ? "Active" : "Waiting for 'Hey Redi'")
                    .font(.caption2)
                    .foregroundColor(webrtcService.isActivated ? .green : .yellow)
            }
        }
        .padding(.bottom, 40)
    }
    
    private func toggleSession() {
        if isActive {
            webrtcService.disconnect()
            isActive = false
            statusText = "Ready"
            transcriptLines = []
            previewReady = false
        } else {
            Task {
                do {
                    try await webrtcService.connect()
                    isActive = true
                    statusText = "Say 'Hey Redi'"
                } catch {
                    statusText = "Failed"
                }
            }
        }
    }
    
    private func setupCallbacks() {
        webrtcService.onTranscriptReceived = { text, role in
            transcriptLines.append((text, role))
            if transcriptLines.count > 10 { transcriptLines.removeFirst() }
        }
        
        webrtcService.onLatencyMeasured = { ms in latency = ms }
        webrtcService.onPlaybackStarted = { statusText = "Speaking..." }
        webrtcService.onPlaybackEnded = {
            statusText = webrtcService.isActivated ? "Listening..." : "Say 'Hey Redi'"
        }
    }
}

// MARK: - Redi Preview View (unique name to avoid conflict with SessionView)

struct RediPreviewView: UIViewRepresentable {
    let previewLayer: AVCaptureVideoPreviewLayer
    
    func makeUIView(context: Context) -> RediPreviewUIView {
        let view = RediPreviewUIView()
        view.backgroundColor = .black
        view.previewLayer = previewLayer
        return view
    }
    
    func updateUIView(_ uiView: RediPreviewUIView, context: Context) {
        uiView.previewLayer = previewLayer
    }
}

class RediPreviewUIView: UIView {
    var previewLayer: AVCaptureVideoPreviewLayer? {
        didSet {
            setupPreview()
        }
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        previewLayer?.frame = bounds
    }
    
    private func setupPreview() {
        layer.sublayers?.filter { $0 is AVCaptureVideoPreviewLayer }.forEach { $0.removeFromSuperlayer() }
        
        guard let previewLayer = previewLayer else { return }
        
        previewLayer.videoGravity = .resizeAspectFill
        previewLayer.frame = bounds
        layer.insertSublayer(previewLayer, at: 0)
    }
}

#Preview {
    V3MainView()
}
