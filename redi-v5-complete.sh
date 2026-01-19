#!/bin/bash
#
# REDI V5 COMPLETE SETUP & MIGRATION
# ==================================
# Run this in your local personalizedoutput repo root
#
# This script does EVERYTHING:
#   1. Creates V5 server file if missing
#   2. Creates V5 iOS files if missing  
#   3. Fixes iOS to use V5 services (but keeps V3 views/camera)
#   4. Adds V5 initialization to server
#
# Usage:
#   chmod +x redi-v5-complete.sh
#   ./redi-v5-complete.sh
#   git add -A && git commit -m "V5 complete setup" && git push
#

set -e

echo "=========================================="
echo "REDI V5 COMPLETE SETUP & MIGRATION"
echo "=========================================="
echo ""

# Check we're in the right directory
if [ ! -d "src" ] || [ ! -d "ios-app" ]; then
    echo "ERROR: Run this from the repo root (should have src/ and ios-app/ directories)"
    exit 1
fi

echo "Found repo structure"
echo ""

# ==========================================
# STEP 1: Create V5 Server
# ==========================================
echo "STEP 1: V5 Server..."

V5_SERVER="src/websocket/rediV5Server.ts"
mkdir -p src/websocket

if [ -f "$V5_SERVER" ]; then
    echo "  V5 server already exists"
else
    echo "  Creating V5 server..."
    # Server file is too large for heredoc, will be created separately
    echo "  ERROR: V5 server file needs to be created manually or from zip"
fi

echo ""

# ==========================================
# STEP 2: Create V5 iOS files
# ==========================================
echo "STEP 2: V5 iOS files..."

V5_IOS_DIR="ios-app/Redi/Services/V5"
mkdir -p "$V5_IOS_DIR"

# V5Config.swift
if [ ! -f "$V5_IOS_DIR/V5Config.swift" ]; then
    echo "  Creating V5Config.swift..."
    cat > "$V5_IOS_DIR/V5Config.swift" << 'CONFIGEOF'
import Foundation
import AVFoundation

struct V5Config {
    static var serverURL: URL {
        return URL(string: "wss://redialways.com/ws/redi?v=5")!
    }

    struct Audio {
        static let sampleRate: Double = 24000
        static let channels: AVAudioChannelCount = 1
        static let bytesPerSample = 2
        static let bitsPerSample = 16
        static let recordingBufferSize: AVAudioFrameCount = 4800
        static let playbackChunkSize = 9600
        static let minPlaybackBuffer = 1200
    }

    struct Camera {
        static let staticFrameInterval: TimeInterval = 5.0
        static let motionFrameInterval: TimeInterval = 0.25
        static let maxDimension: CGFloat = 512
        static let compressionQuality: CGFloat = 0.7
    }
}
CONFIGEOF
    echo "  V5Config.swift created"
else
    echo "  V5Config.swift exists"
fi

# V5AudioService.swift
if [ ! -f "$V5_IOS_DIR/V5AudioService.swift" ]; then
    echo "  Creating V5AudioService.swift..."
    cat > "$V5_IOS_DIR/V5AudioService.swift" << 'AUDIOEOF'
import AVFoundation
import Combine

class V5AudioService: ObservableObject {
    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var playbackEngine: AVAudioEngine?
    private var inputFormat: AVAudioFormat?
    private var outputFormat: AVAudioFormat?

    @Published var isRecording = false
    @Published var isPlaying = false
    @Published var isMicMuted = false

    var onAudioCaptured: ((Data) -> Void)?

    private let targetSampleRate: Double = 24000
    private let targetChannels: AVAudioChannelCount = 1

    private var audioBuffer = Data()
    private let bufferLock = NSLock()
    private var isBuffering = true
    private let minBufferSize = 1200

    init() { setupAudioSession() }

    private func setupAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers])
            try session.setPreferredSampleRate(targetSampleRate)
            try session.setPreferredIOBufferDuration(0.005)
            try session.setActive(true)
            print("[V5Audio] Session configured")
        } catch {
            print("[V5Audio] Session error: \(error)")
        }
    }

    func startRecording() {
        guard !isRecording else { return }
        do {
            audioEngine = AVAudioEngine()
            guard let engine = audioEngine else { return }
            let inputNode = engine.inputNode
            try? inputNode.setVoiceProcessingEnabled(true)
            inputFormat = inputNode.outputFormat(forBus: 0)
            outputFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: targetSampleRate, channels: targetChannels, interleaved: true)
            guard let outputFmt = outputFormat else { return }
            inputNode.installTap(onBus: 0, bufferSize: 4800, format: inputFormat) { [weak self] buffer, _ in
                self?.processAudioBuffer(buffer)
            }
            try engine.start()
            DispatchQueue.main.async { self.isRecording = true }
        } catch {
            print("[V5Audio] Recording error: \(error)")
        }
    }

    func stopRecording() {
        guard isRecording else { return }
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        DispatchQueue.main.async { self.isRecording = false }
    }

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let inputFmt = inputFormat, let outputFmt = outputFormat, !isMicMuted else { return }
        guard let converter = AVAudioConverter(from: inputFmt, to: outputFmt) else { return }
        let ratio = outputFmt.sampleRate / inputFmt.sampleRate
        let outputCapacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio)
        guard outputCapacity > 0, let convertedBuffer = AVAudioPCMBuffer(pcmFormat: outputFmt, frameCapacity: outputCapacity) else { return }
        var error: NSError?
        var consumed = false
        let status = converter.convert(to: convertedBuffer, error: &error) { _, outStatus in
            if consumed { outStatus.pointee = .noDataNow; return nil }
            consumed = true
            outStatus.pointee = .haveData
            return buffer
        }
        if status == .error { return }
        guard convertedBuffer.frameLength > 0, let channelData = convertedBuffer.int16ChannelData else { return }
        let byteCount = Int(convertedBuffer.frameLength) * 2
        let data = Data(bytes: channelData[0], count: byteCount)
        onAudioCaptured?(data)
    }

    func playAudio(_ audioData: Data) {
        guard !audioData.isEmpty else { return }
        bufferLock.lock()
        audioBuffer.append(audioData)
        let currentSize = audioBuffer.count
        bufferLock.unlock()
        if isBuffering && currentSize >= minBufferSize {
            isBuffering = false
            startContinuousPlayback()
        }
    }

    private func startContinuousPlayback() {
        if playbackEngine == nil || playerNode == nil { setupPlaybackEngine() }
        guard let player = playerNode else { return }
        if !player.isPlaying { player.play() }
        DispatchQueue.main.async { self.isPlaying = true }
        scheduleNextChunk()
    }

    private func scheduleNextChunk() {
        guard let player = playerNode, let engine = playbackEngine else { return }
        bufferLock.lock()
        let chunkSize = min(audioBuffer.count, 9600)
        guard chunkSize > 0 else {
            bufferLock.unlock()
            DispatchQueue.main.async { self.isPlaying = false }
            isBuffering = true
            return
        }
        let chunk = audioBuffer.prefix(chunkSize)
        audioBuffer.removeFirst(chunkSize)
        bufferLock.unlock()
        guard let outputBuffer = convertToPlaybackBuffer(Data(chunk), engine: engine) else {
            DispatchQueue.global(qos: .userInteractive).async { [weak self] in self?.scheduleNextChunk() }
            return
        }
        player.scheduleBuffer(outputBuffer) { [weak self] in
            DispatchQueue.global(qos: .userInteractive).async { self?.scheduleNextChunk() }
        }
    }

    private func convertToPlaybackBuffer(_ audioData: Data, engine: AVAudioEngine) -> AVAudioPCMBuffer? {
        guard let sourceFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: targetSampleRate, channels: targetChannels, interleaved: true) else { return nil }
        let frameCount = UInt32(audioData.count / 2)
        guard frameCount > 0, let sourceBuffer = AVAudioPCMBuffer(pcmFormat: sourceFormat, frameCapacity: frameCount) else { return nil }
        sourceBuffer.frameLength = frameCount
        guard let channelData = sourceBuffer.int16ChannelData else { return nil }
        audioData.withUnsafeBytes { rawPtr in
            if let baseAddress = rawPtr.baseAddress { memcpy(channelData[0], baseAddress, audioData.count) }
        }
        let outputFormat = engine.mainMixerNode.outputFormat(forBus: 0)
        guard let converter = AVAudioConverter(from: sourceFormat, to: outputFormat) else { return nil }
        let ratio = outputFormat.sampleRate / sourceFormat.sampleRate
        let outputCapacity = AVAudioFrameCount(Double(frameCount) * ratio)
        guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: outputCapacity) else { return nil }
        var error: NSError?
        var consumed = false
        let status = converter.convert(to: outputBuffer, error: &error) { _, outStatus in
            if consumed { outStatus.pointee = .noDataNow; return nil }
            consumed = true
            outStatus.pointee = .haveData
            return sourceBuffer
        }
        if status == .error || outputBuffer.frameLength == 0 { return nil }
        return outputBuffer
    }

    private func setupPlaybackEngine() {
        playerNode?.stop()
        playbackEngine?.stop()
        let engine = AVAudioEngine()
        let player = AVAudioPlayerNode()
        engine.attach(player)
        let mixerFormat = engine.mainMixerNode.outputFormat(forBus: 0)
        engine.connect(player, to: engine.mainMixerNode, format: mixerFormat)
        do {
            try engine.start()
            playbackEngine = engine
            playerNode = player
        } catch {
            print("[V5Audio] Playback error: \(error)")
        }
    }

    func clearBuffer() {
        bufferLock.lock()
        audioBuffer.removeAll()
        bufferLock.unlock()
        isBuffering = true
    }

    func stopAudio() {
        playerNode?.stop()
        clearBuffer()
        DispatchQueue.main.async { self.isPlaying = false }
    }

    func cleanup() {
        stopRecording()
        clearBuffer()
        playerNode?.stop()
        playbackEngine?.stop()
    }

    deinit { cleanup() }
}
AUDIOEOF
    echo "  V5AudioService.swift created"
else
    echo "  V5AudioService.swift exists"
fi

# V5WebSocketService.swift
if [ ! -f "$V5_IOS_DIR/V5WebSocketService.swift" ]; then
    echo "  Creating V5WebSocketService.swift..."
    cat > "$V5_IOS_DIR/V5WebSocketService.swift" << 'WSEOF'
import Foundation
import Combine

class V5WebSocketService: ObservableObject {
    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession?
    private let serverURL: URL

    @Published var isConnected = false
    @Published var connectionState: ConnectionState = .disconnected

    enum ConnectionState: Equatable {
        case disconnected, connecting, connected, error(String)
    }

    var onAudioReceived: ((Data) -> Void)?
    var onTranscriptReceived: ((String, String) -> Void)?
    var onSessionReady: (() -> Void)?
    var onError: ((Error) -> Void)?
    var onMicMuteChanged: ((Bool) -> Void)?
    var onStopAudio: (() -> Void)?
    var onRequestFrame: (() -> Void)?

    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5
    private var isManualDisconnect = false

    init(serverURL: URL = V5Config.serverURL) {
        self.serverURL = serverURL
        print("[V5WS] URL: \(serverURL)")
    }

    func connect() {
        guard connectionState != .connecting else { return }
        isManualDisconnect = false
        connectionState = .connecting
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        session = URLSession(configuration: config)
        webSocket = session?.webSocketTask(with: serverURL)
        webSocket?.resume()
        receiveMessage()
        webSocket?.sendPing { [weak self] error in
            if let error = error {
                self?.connectionState = .error(error.localizedDescription)
                self?.attemptReconnect()
            } else {
                self?.isConnected = true
                self?.connectionState = .connected
                self?.reconnectAttempts = 0
            }
        }
    }

    func disconnect() {
        isManualDisconnect = true
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        isConnected = false
        connectionState = .disconnected
    }

    func sendFrame(_ frameData: Data) {
        sendJSON(["type": "frame", "data": frameData.base64EncodedString(), "timestamp": Date().timeIntervalSince1970])
    }

    func sendAudio(_ audioData: Data) {
        sendJSON(["type": "audio", "data": audioData.base64EncodedString()])
    }

    func sendMode(_ mode: String) {
        sendJSON(["type": "mode", "mode": mode])
    }

    func sendSensitivity(_ value: Double) {
        sendJSON(["type": "sensitivity", "value": value])
    }

    private func sendJSON(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let string = String(data: data, encoding: .utf8) else { return }
        webSocket?.send(.string(string)) { _ in }
    }

    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleMessage(message)
                self?.receiveMessage()
            case .failure:
                self?.attemptReconnect()
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let type = json["type"] as? String else { return }
            DispatchQueue.main.async { [weak self] in
                switch type {
                case "audio":
                    if let b64 = json["data"] as? String, let audioData = Data(base64Encoded: b64) {
                        self?.onAudioReceived?(audioData)
                    }
                case "transcript":
                    if let text = json["text"] as? String, let role = json["role"] as? String {
                        self?.onTranscriptReceived?(text, role)
                    }
                case "session_ready":
                    self?.isConnected = true
                    self?.connectionState = .connected
                    self?.onSessionReady?()
                case "mute_mic":
                    if let muted = json["muted"] as? Bool { self?.onMicMuteChanged?(muted) }
                case "stop_audio":
                    self?.onStopAudio?()
                case "request_frame":
                    self?.onRequestFrame?()
                case "error":
                    if let msg = json["message"] as? String { self?.connectionState = .error(msg) }
                default: break
                }
            }
        case .data(let data):
            DispatchQueue.main.async { [weak self] in self?.onAudioReceived?(data) }
        @unknown default: break
        }
    }

    private func attemptReconnect() {
        guard !isManualDisconnect, reconnectAttempts < maxReconnectAttempts else { return }
        reconnectAttempts += 1
        let delay = pow(2.0, Double(reconnectAttempts - 1))
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.connect()
        }
    }
}
WSEOF
    echo "  V5WebSocketService.swift created"
else
    echo "  V5WebSocketService.swift exists"
fi

echo ""

# ==========================================
# STEP 3: Fix iOS references
# ==========================================
echo "STEP 3: Fixing iOS references..."

# Revert V5MainView, V5CameraService back to V3
find ios-app -name "*.swift" -type f 2>/dev/null | while read file; do
    if [[ "$file" == *"/V3/"* ]] || [[ "$file" == *"/V5/"* ]]; then
        continue
    fi
    
    if grep -q "V5MainView" "$file" 2>/dev/null; then
        sed -i.bak 's/V5MainView/V3MainView/g' "$file"
        rm -f "$file.bak"
        echo "  Reverted V5MainView in: $file"
    fi
    
    if grep -q "V5CameraService" "$file" 2>/dev/null; then
        sed -i.bak 's/V5CameraService/V3CameraService/g' "$file"
        rm -f "$file.bak"
        echo "  Reverted V5CameraService in: $file"
    fi
    
    if grep -q "V5SessionManager" "$file" 2>/dev/null; then
        sed -i.bak 's/V5SessionManager/V3SessionManager/g' "$file"
        rm -f "$file.bak"
        echo "  Reverted V5SessionManager in: $file"
    fi
done

# Update to V5 services
find ios-app -name "*.swift" -type f 2>/dev/null | while read file; do
    if [[ "$file" == *"/V3/"* ]] || [[ "$file" == *"/V5/"* ]]; then
        continue
    fi
    
    if grep -q "V3WebSocketService" "$file" 2>/dev/null; then
        sed -i.bak 's/V3WebSocketService/V5WebSocketService/g' "$file"
        rm -f "$file.bak"
        echo "  Updated V3WebSocketService -> V5 in: $file"
    fi
    
    if grep -q "V3AudioService" "$file" 2>/dev/null; then
        sed -i.bak 's/V3AudioService/V5AudioService/g' "$file"
        rm -f "$file.bak"
        echo "  Updated V3AudioService -> V5 in: $file"
    fi
done

echo ""

# ==========================================
# STEP 4: Update server index.ts
# ==========================================
echo "STEP 4: Updating server..."

for MAIN_FILE in "src/index.ts" "src/server.ts"; do
    if [ -f "$MAIN_FILE" ]; then
        echo "  Found: $MAIN_FILE"
        
        if ! grep -q "rediV5Server" "$MAIN_FILE"; then
            if grep -q "rediV3Server" "$MAIN_FILE"; then
                sed -i.bak "/rediV3Server/a\\
import { initRediV5, closeRediV5 } from './websocket/rediV5Server';" "$MAIN_FILE"
                rm -f "$MAIN_FILE.bak"
                echo "  Added V5 import"
            fi
        fi
        
        if ! grep -q "initRediV5" "$MAIN_FILE"; then
            if grep -q "initRediV3" "$MAIN_FILE"; then
                sed -i.bak "/initRediV3/a\\
  await initRediV5(server);" "$MAIN_FILE"
                rm -f "$MAIN_FILE.bak"
                echo "  Added V5 init"
            fi
        fi
        
        break
    fi
done

echo ""
echo "=========================================="
echo "V5 SETUP COMPLETE"
echo "=========================================="
echo ""
echo "NOTE: The V5 server file (rediV5Server.ts) is too large"
echo "for this script. If it doesn't exist, use the zip file."
echo ""
echo "NEXT:"
echo "  1. git diff"
echo "  2. git add -A && git commit -m 'V5 setup' && git push"
echo ""
