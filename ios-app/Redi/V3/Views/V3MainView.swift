/**
 * V3MainView.swift
 *
 * REDI FOR ANYTHING - Premium UI
 * 
 * Design inspired by: Cyan-to-magenta gradient waveform with glowing bracket frame
 * Features: Particle effects, gradient animations, sophisticated dark aesthetic
 *
 * Updated: Jan 29, 2026
 */

import SwiftUI
import AVFoundation
import WebRTC

struct V3MainView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var webrtcService = RediWebRTCService()
    @StateObject private var v9Service = V9WebSocketService()
    @State private var isActive = false
    @State private var sensitivity: Double = 5
    @State private var memoryEnabled = true
    @State private var statusText = "Ready"
    @State private var transcriptLines: [(String, String)] = []
    @State private var latency: Int = 0
    @State private var showSettings = false
    @State private var showSessionModeSelector = false
    @State private var waveformPhase: CGFloat = 0
    @State private var glowPulse: CGFloat = 0
    @State private var particleSystem = ParticleSystem()
    @State private var logoTapCount = 0
    @State private var logoTapTimer: Timer? = nil
    @State private var activeBrain: String = ""  // "fast", "voice", "deep", or ""

    // Brand colors
    private let cyanGlow = Color(hex: "00D4FF")
    private let magentaGlow = Color(hex: "FF00AA")
    
    var body: some View {
        ZStack {
            // Deep black background
            Color.black
                .ignoresSafeArea()
            
            // Ambient glow effect at bottom
            ambientGlow
            
            // Particle effects
            ParticleView(system: particleSystem)
                .ignoresSafeArea()
            
            // Camera Preview (subtle, behind UI)
            if isActive && webrtcService.hasVideoPreview, let view = webrtcService.previewView {
                RTCVideoViewWrapper(rtcView: view)
                    .opacity(0.3)
                    .blur(radius: 2)
                    .ignoresSafeArea()
            }
            
            // Main content
            VStack(spacing: 0) {
                topBar
                    .padding(.top, 60)
                
                Spacer()
                
                // Central waveform visualization
                waveformSection
                
                Spacer()
                
                // Transcript
                if !transcriptLines.isEmpty {
                    transcriptView
                        .padding(.bottom, 20)
                }
                
                // Bottom controls
                bottomControls
                    .padding(.bottom, 40)
            }
            
            // Settings sheet
            if showSettings {
                settingsOverlay
            }
        }
        .onAppear {
            setupCallbacks()
            startAnimations()
        }
        .sheet(isPresented: $showSessionModeSelector) {
            SessionModeSelector(isPresented: $showSessionModeSelector) { mode in
                // Mode selected - start session
                showSessionModeSelector = false
            }
        }
    }
    
    // MARK: - Ambient Glow
    
    private var ambientGlow: some View {
        VStack {
            Spacer()
            ZStack {
                // Cyan glow - left
                Ellipse()
                    .fill(cyanGlow.opacity(0.15))
                    .frame(width: 300, height: 100)
                    .blur(radius: 60)
                    .offset(x: -50, y: 50)
                
                // Magenta glow - right
                Ellipse()
                    .fill(magentaGlow.opacity(0.15))
                    .frame(width: 300, height: 100)
                    .blur(radius: 60)
                    .offset(x: 50, y: 50)
                
                // Center blend
                Ellipse()
                    .fill(
                        LinearGradient(
                            colors: [cyanGlow.opacity(0.1), magentaGlow.opacity(0.1)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: 400, height: 80)
                    .blur(radius: 40)
            }
        }
        .ignoresSafeArea()
    }
    
    // MARK: - Top Bar
    
    private var topBar: some View {
        HStack {
            // Status indicator
            HStack(spacing: 8) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 8, height: 8)
                    .shadow(color: statusColor, radius: 4)
                
                Text(statusText)
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.9))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(
                Capsule()
                    .fill(Color.white.opacity(0.08))
                    .overlay(
                        Capsule()
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
            
            Spacer()
            
            // Live indicator
            if isActive && webrtcService.hasVideoPreview {
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 6, height: 6)
                    Text("LIVE")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(.green)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.green.opacity(0.15))
                .cornerRadius(8)
            }
            
            // Latency
            if isActive && latency > 0 {
                Text("\(latency)ms")
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundColor(latencyColor)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(latencyColor.opacity(0.15))
                    .cornerRadius(8)
            }
            
            Spacer()
            
            // Settings button
            Button(action: { withAnimation(.spring()) { showSettings.toggle() } }) {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(.white.opacity(0.7))
                    .frame(width: 40, height: 40)
                    .background(Color.white.opacity(0.08))
                    .cornerRadius(12)
            }
        }
        .padding(.horizontal, 20)
    }
    
    private var statusColor: Color {
        if !isActive { return .gray }
        if webrtcService.isConnecting { return .yellow }
        if webrtcService.isActivated { return .green }
        return .cyan
    }
    
    private var latencyColor: Color {
        if latency < 500 { return .green }
        if latency < 1000 { return .yellow }
        return .red
    }
    
    // MARK: - Waveform Section
    
    private var waveformSection: some View {
        ZStack {
            // Bracket frame
            bracketFrame
            
            // Waveform
            AnimatedWaveform(
                isActive: isActive && webrtcService.isActivated,
                phase: waveformPhase
            )
            .frame(width: 200, height: 80)
            
            // Center text when not active
            if !isActive {
                brandingText
            } else if !webrtcService.isActivated {
                wakeWordPrompt
            }
        }
        .frame(height: 200)
    }
    
    private var brandingText: some View {
        VStack(spacing: 8) {
            Text("REDI")
                .font(.custom("Bodoni 72", size: 36))
                .foregroundStyle(
                    LinearGradient(
                        colors: [cyanGlow, magentaGlow],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .onTapGesture {
                    handleLogoTap()
                }

            Text("for Anything")
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundColor(.white.opacity(0.6))

            // Brain indicator (V9 only)
            if appState.useV9 && !activeBrain.isEmpty {
                brainIndicator
                    .transition(.opacity)
            }
        }
    }

    private var brainIndicator: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(brainColor)
                .frame(width: 6, height: 6)
            Text(brainLabel)
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundColor(brainColor)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(brainColor.opacity(0.15))
        .cornerRadius(8)
    }

    private var brainColor: Color {
        switch activeBrain {
        case "fast": return .orange
        case "voice": return cyanGlow
        case "deep": return .purple
        default: return .gray
        }
    }

    private var brainLabel: String {
        switch activeBrain {
        case "fast": return "CEREBRAS"
        case "voice": return "HAIKU"
        case "deep": return "GPT-4o"
        default: return ""
        }
    }
    
    private var wakeWordPrompt: some View {
        VStack(spacing: 12) {
            Text("Say")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.5))
            
            Text("\"Hey Redi\"")
                .font(.system(size: 24, weight: .semibold, design: .rounded))
                .foregroundStyle(
                    LinearGradient(
                        colors: [cyanGlow, magentaGlow],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
        }
    }
    
    private var bracketFrame: some View {
        ZStack {
            // Left bracket
            BracketShape(side: .left)
                .stroke(
                    LinearGradient(
                        colors: [cyanGlow, cyanGlow.opacity(0.3)],
                        startPoint: .top,
                        endPoint: .bottom
                    ),
                    lineWidth: 2
                )
                .frame(width: 30, height: 140)
                .shadow(color: cyanGlow.opacity(0.5 + glowPulse * 0.3), radius: 10)
                .offset(x: -130)
            
            // Right bracket
            BracketShape(side: .right)
                .stroke(
                    LinearGradient(
                        colors: [magentaGlow.opacity(0.3), magentaGlow],
                        startPoint: .top,
                        endPoint: .bottom
                    ),
                    lineWidth: 2
                )
                .frame(width: 30, height: 140)
                .shadow(color: magentaGlow.opacity(0.5 + glowPulse * 0.3), radius: 10)
                .offset(x: 130)
            
            // Corner dots
            cornerDots
        }
    }
    
    private var cornerDots: some View {
        ZStack {
            // Top-left
            Circle()
                .fill(cyanGlow)
                .frame(width: 4, height: 4)
                .shadow(color: cyanGlow, radius: 4)
                .offset(x: -138, y: -70)
            
            // Top-right
            Circle()
                .fill(magentaGlow)
                .frame(width: 4, height: 4)
                .shadow(color: magentaGlow, radius: 4)
                .offset(x: 138, y: -70)
            
            // Bottom-left
            Circle()
                .fill(cyanGlow)
                .frame(width: 4, height: 4)
                .shadow(color: cyanGlow, radius: 4)
                .offset(x: -138, y: 70)
            
            // Bottom-right
            Circle()
                .fill(magentaGlow)
                .frame(width: 4, height: 4)
                .shadow(color: magentaGlow, radius: 4)
                .offset(x: 138, y: 70)
        }
    }
    
    // MARK: - Transcript
    
    private var transcriptView: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(transcriptLines.suffix(3).enumerated()), id: \.offset) { index, line in
                transcriptLine(text: line.0, role: line.1)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.05))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
        .padding(.horizontal, 20)
    }
    
    private func transcriptLine(text: String, role: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Circle()
                .fill(role == "assistant" ? cyanGlow : Color.white.opacity(0.3))
                .frame(width: 6, height: 6)
                .padding(.top, 6)
            
            Text(text)
                .font(.system(size: 14, weight: role == "assistant" ? .medium : .regular))
                .foregroundColor(role == "assistant" ? .white : .white.opacity(0.6))
                .lineLimit(2)
        }
    }
    
    // MARK: - Bottom Controls
    
    private var bottomControls: some View {
        VStack(spacing: 24) {
            // Main action button
            mainActionButton
            
            // Status text
            Text(bottomStatusText)
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundColor(.white.opacity(0.5))
        }
    }
    
    private var bottomStatusText: String {
        if isActive {
            return webrtcService.isActivated ? "Listening" : "Waiting for wake word"
        }
        return "Tap to start"
    }
    
    private var mainActionButton: some View {
        Button(action: toggleSession) {
            ZStack {
                // Outer glow ring
                outerGlowRing
                
                // Main button
                mainButtonCircle
                
                // Button content
                buttonContent
            }
        }
        .disabled(webrtcService.isConnecting || v9Service.connectionState == .connecting)
    }
    
    private var outerGlowRing: some View {
        Group {
            if isActive {
                Circle()
                    .stroke(Color.red.opacity(0.3), lineWidth: 2)
                    .frame(width: 88, height: 88)
                    .blur(radius: 2)
            } else {
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [cyanGlow.opacity(0.3), magentaGlow.opacity(0.3)],
                            startPoint: .leading,
                            endPoint: .trailing
                        ),
                        lineWidth: 2
                    )
                    .frame(width: 88, height: 88)
                    .blur(radius: 2)
            }
        }
    }
    
    private var mainButtonCircle: some View {
        Group {
            if isActive {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.red, Color.red.opacity(0.8)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(width: 72, height: 72)
                    .shadow(color: .red.opacity(0.4), radius: 15)
            } else {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [cyanGlow, magentaGlow],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 72, height: 72)
                    .shadow(color: cyanGlow.opacity(0.4), radius: 15)
            }
        }
    }
    
    @ViewBuilder
    private var buttonContent: some View {
        if webrtcService.isConnecting {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(1.2)
        } else {
            Image(systemName: isActive ? "stop.fill" : "play.fill")
                .font(.system(size: 28, weight: .semibold))
                .foregroundColor(.white)
                .offset(x: isActive ? 0 : 2)
        }
    }
    
    // MARK: - Settings Overlay
    
    private var settingsOverlay: some View {
        ZStack {
            Color.black.opacity(0.7)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation(.spring()) { showSettings = false }
                }
            
            VStack(spacing: 0) {
                Spacer()
                settingsPanel
            }
            .transition(.move(edge: .bottom))
        }
    }
    
    private var settingsPanel: some View {
        VStack(spacing: 24) {
            // Handle
            Capsule()
                .fill(Color.white.opacity(0.3))
                .frame(width: 40, height: 4)
                .padding(.top, 12)
            
            Text("Settings")
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundColor(.white)
            
            // Memory toggle
            memoryToggleRow
            
            Divider()
                .background(Color.white.opacity(0.1))
                .padding(.horizontal, 20)
            
            // Sensitivity slider
            sensitivitySection
            
            Spacer().frame(height: 20)
        }
        .padding(.bottom, 40)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(Color(hex: "1A1A1A"))
                .overlay(
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        )
    }
    
    private var memoryToggleRow: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Memory")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.white)
                Text("Remember across sessions")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.5))
            }
            Spacer()
            Toggle("", isOn: $memoryEnabled)
                .labelsHidden()
                .tint(cyanGlow)
                .onChange(of: memoryEnabled) { newValue in
                    webrtcService.setMemoryEnabled(newValue)
                }
        }
        .padding(.horizontal, 20)
    }
    
    private var sensitivitySection: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Proactive Level")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.white)
                Spacer()
                Text("\(Int(sensitivity))")
                    .font(.system(size: 15, weight: .bold, design: .monospaced))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [cyanGlow, magentaGlow],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
            }
            
            sensitivitySlider
            
            Text(sensitivityLabel)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.5))
        }
        .padding(.horizontal, 20)
    }
    
    private var sensitivitySlider: some View {
        HStack(spacing: 12) {
            Image(systemName: "speaker.wave.1")
                .foregroundColor(.white.opacity(0.4))
            
            ZStack(alignment: .leading) {
                // Track
                Capsule()
                    .fill(Color.white.opacity(0.1))
                    .frame(height: 6)
                
                // Filled portion with gradient
                GeometryReader { geo in
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [cyanGlow, magentaGlow],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * (sensitivity / 10), height: 6)
                }
                .frame(height: 6)
                
                // Custom slider
                Slider(value: $sensitivity, in: 1...10, step: 1)
                    .accentColor(.clear)
                    .onChange(of: sensitivity) { newValue in
                        webrtcService.setSensitivity(Int(newValue))
                    }
            }
            
            Image(systemName: "speaker.wave.3")
                .foregroundColor(.white.opacity(0.4))
        }
    }
    
    private var sensitivityLabel: String {
        switch Int(sensitivity) {
        case 1...2: return "Quiet — Only speaks when important"
        case 3...4: return "Selective — Shares occasionally"
        case 5...6: return "Balanced — Active partner"
        case 7...8: return "Engaged — Frequently participating"
        case 9...10: return "Full — Constant companion"
        default: return "Balanced"
        }
    }
    
    // MARK: - Actions
    
    private func toggleSession() {
        if isActive {
            if appState.useV9 {
                v9Service.disconnect()
            } else {
                webrtcService.disconnect()
            }
            isActive = false
            statusText = "Ready"
            transcriptLines = []
            activeBrain = ""
        } else {
            if appState.useV9 {
                v9Service.connect()
                isActive = true
                statusText = "Connecting (V9)..."
            } else {
                Task {
                    do {
                        try await webrtcService.connect()
                        isActive = true
                        statusText = "Connecting..."
                    } catch {
                        statusText = "Failed"
                    }
                }
            }
        }
    }

    private func setupCallbacks() {
        // V7 WebRTC callbacks
        webrtcService.onTranscriptReceived = { text, role in
            transcriptLines.append((text, role))
            if transcriptLines.count > 10 { transcriptLines.removeFirst() }
        }
        webrtcService.onLatencyMeasured = { ms in latency = ms }
        webrtcService.onPlaybackStarted = { statusText = "Speaking" }
        webrtcService.onPlaybackEnded = {
            statusText = webrtcService.isActivated ? "Listening" : "Say 'Hey Redi'"
        }

        // V9 WebSocket callbacks
        v9Service.onTranscript = { text, role in
            DispatchQueue.main.async {
                transcriptLines.append((text, role))
                if transcriptLines.count > 10 { transcriptLines.removeFirst() }
            }
        }
        v9Service.onPlaybackStarted = {
            DispatchQueue.main.async { statusText = "Speaking" }
        }
        v9Service.onPlaybackEnded = {
            DispatchQueue.main.async { statusText = "Listening" }
        }
        v9Service.onSessionReady = {
            DispatchQueue.main.async { statusText = "Listening (V9)" }
        }
        v9Service.onBrainUsed = { brain in
            DispatchQueue.main.async { activeBrain = brain }
        }
    }

    private func handleLogoTap() {
        logoTapCount += 1
        logoTapTimer?.invalidate()
        logoTapTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: false) { _ in
            logoTapCount = 0
        }
        if logoTapCount >= 7 {
            logoTapCount = 0
            DeveloperModeManager.shared.unlock()
        }
    }
    
    private func startAnimations() {
        // Waveform animation
        withAnimation(.linear(duration: 2).repeatForever(autoreverses: false)) {
            waveformPhase = .pi * 2
        }
        
        // Glow pulse
        withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
            glowPulse = 1
        }
        
        // Start particle system
        particleSystem.start()
    }
}

// MARK: - Bracket Shape

enum BracketSide {
    case left, right
}

struct BracketShape: Shape {
    let side: BracketSide
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let cornerLength: CGFloat = 15
        
        if side == .left {
            path.move(to: CGPoint(x: rect.maxX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.minX + cornerLength, y: rect.minY))
            path.addQuadCurve(
                to: CGPoint(x: rect.minX, y: rect.minY + cornerLength),
                control: CGPoint(x: rect.minX, y: rect.minY)
            )
            path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY - cornerLength))
            path.addQuadCurve(
                to: CGPoint(x: rect.minX + cornerLength, y: rect.maxY),
                control: CGPoint(x: rect.minX, y: rect.maxY)
            )
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        } else {
            path.move(to: CGPoint(x: rect.minX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX - cornerLength, y: rect.minY))
            path.addQuadCurve(
                to: CGPoint(x: rect.maxX, y: rect.minY + cornerLength),
                control: CGPoint(x: rect.maxX, y: rect.minY)
            )
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - cornerLength))
            path.addQuadCurve(
                to: CGPoint(x: rect.maxX - cornerLength, y: rect.maxY),
                control: CGPoint(x: rect.maxX, y: rect.maxY)
            )
            path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        }
        
        return path
    }
}

// MARK: - Animated Waveform

struct AnimatedWaveform: View {
    let isActive: Bool
    let phase: CGFloat
    
    var body: some View {
        Canvas { context, size in
            drawWaveform(context: context, size: size)
        }
    }
    
    private func drawWaveform(context: GraphicsContext, size: CGSize) {
        let midY = size.height / 2
        let width = size.width
        let barCount = 40
        let barWidth = width / CGFloat(barCount)
        
        let gradient = Gradient(colors: [
            Color(hex: "00D4FF"),
            Color(hex: "8B5CF6"),
            Color(hex: "FF00AA")
        ])
        
        var path = Path()
        
        for i in 0..<barCount {
            let x = CGFloat(i) * barWidth + barWidth / 2
            let normalizedX = CGFloat(i) / CGFloat(barCount)
            let amplitude = calculateAmplitude(normalizedX: normalizedX)
            let barHeight = max(2, abs(amplitude))
            
            let rect = CGRect(
                x: x - barWidth * 0.3,
                y: midY - barHeight,
                width: barWidth * 0.6,
                height: barHeight * 2
            )
            path.addRoundedRect(in: rect, cornerSize: CGSize(width: 2, height: 2))
        }
        
        context.fill(
            path,
            with: .linearGradient(
                gradient,
                startPoint: CGPoint(x: 0, y: midY),
                endPoint: CGPoint(x: width, y: midY)
            )
        )
    }
    
    private func calculateAmplitude(normalizedX: CGFloat) -> CGFloat {
        if isActive {
            let wave1 = sin(normalizedX * .pi) * 30
            let wave2 = 0.5 + 0.5 * sin(phase + normalizedX * 4)
            let wave3 = 0.7 + 0.3 * sin(phase * 1.5 + normalizedX * 6)
            return wave1 * wave2 * wave3
        } else {
            let wave1 = sin(normalizedX * .pi) * 8
            let wave2 = 0.8 + 0.2 * sin(phase * 0.5 + normalizedX * 3)
            return wave1 * wave2
        }
    }
}

// MARK: - Particle System

class ParticleSystem: ObservableObject {
    @Published var particles: [Particle] = []
    private var timer: Timer?
    
    struct Particle: Identifiable {
        let id = UUID()
        var x: CGFloat
        var y: CGFloat
        var size: CGFloat
        var opacity: CGFloat
        var color: Color
        var velocity: CGFloat
    }
    
    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { [weak self] _ in
            self?.addParticle()
            self?.updateParticles()
        }
    }
    
    private func addParticle() {
        guard particles.count < 30 else { return }
        
        let colors: [Color] = [
            Color(hex: "00D4FF").opacity(0.6),
            Color(hex: "FF00AA").opacity(0.6),
            Color.white.opacity(0.4)
        ]
        
        let particle = Particle(
            x: CGFloat.random(in: 0...UIScreen.main.bounds.width),
            y: UIScreen.main.bounds.height + 20,
            size: CGFloat.random(in: 2...4),
            opacity: CGFloat.random(in: 0.3...0.7),
            color: colors.randomElement() ?? .white,
            velocity: CGFloat.random(in: 0.5...1.5)
        )
        
        DispatchQueue.main.async {
            self.particles.append(particle)
        }
    }
    
    private func updateParticles() {
        DispatchQueue.main.async {
            self.particles = self.particles.compactMap { particle in
                var p = particle
                p.y -= p.velocity * 3
                p.opacity -= 0.01
                
                if p.y < -20 || p.opacity <= 0 {
                    return nil
                }
                return p
            }
        }
    }
}

struct ParticleView: View {
    @ObservedObject var system: ParticleSystem
    
    var body: some View {
        Canvas { context, size in
            for particle in system.particles {
                let rect = CGRect(
                    x: particle.x - particle.size / 2,
                    y: particle.y - particle.size / 2,
                    width: particle.size,
                    height: particle.size
                )
                
                context.opacity = particle.opacity
                context.fill(
                    Circle().path(in: rect),
                    with: .color(particle.color)
                )
            }
        }
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - RTC Video View Wrapper

struct RTCVideoViewWrapper: UIViewRepresentable {
    let rtcView: RTCEAGLVideoView
    
    func makeUIView(context: Context) -> UIView {
        let container = UIView()
        container.backgroundColor = .black
        
        rtcView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(rtcView)
        
        NSLayoutConstraint.activate([
            rtcView.topAnchor.constraint(equalTo: container.topAnchor),
            rtcView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            rtcView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            rtcView.trailingAnchor.constraint(equalTo: container.trailingAnchor)
        ])
        
        return container
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {}
}

#Preview {
    V3MainView()
}
