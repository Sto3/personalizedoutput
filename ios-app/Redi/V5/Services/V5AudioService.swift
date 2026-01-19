/**
 * Redi V5 AudioService
 * ====================
 * 
 * CLEAN VERSION - Handles audio capture and playback
 * 
 * Audio Format: PCM 16-bit, 24kHz, Mono
 * This MUST match the server's 'pcm16' OpenAI format.
 * 
 * Key Features:
 * - Voice Processing (AEC) enabled for echo cancellation
 * - Resampling from device rate to 24kHz
 * - Buffered playback for smooth audio
 */

import AVFoundation
import Combine

class V5AudioService: ObservableObject {
    // Recording
    private var audioEngine: AVAudioEngine?
    private var inputFormat: AVAudioFormat?
    private var outputFormat: AVAudioFormat?
    
    // Playback
    private var playbackEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    
    // State
    @Published var isRecording = false
    @Published var isPlaying = false
    @Published var isMicMuted = false
    
    // Callback
    var onAudioCaptured: ((Data) -> Void)?
    
    // CRITICAL: Must match server config exactly
    private let targetSampleRate: Double = 24000
    private let targetChannels: AVAudioChannelCount = 1
    
    // Playback buffering
    private var audioBuffer = Data()
    private let bufferLock = NSLock()
    private var isBuffering = true
    private let minBufferSize = 1200  // ~25ms at 24kHz
    
    // Debugging
    private var chunksRecorded = 0
    private var chunksPlayed = 0
    private var lastDebugLog = Date()
    
    init() {
        setupAudioSession()
    }
    
    // MARK: - Audio Session Setup
    
    private func setupAudioSession() {
        let session = AVAudioSession.sharedInstance()
        
        do {
            // voiceChat mode enables AEC (Acoustic Echo Cancellation)
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [
                .defaultToSpeaker,
                .allowBluetooth,
                .mixWithOthers
            ])
            
            // Request 24kHz - iOS may give us something different
            try session.setPreferredSampleRate(targetSampleRate)
            
            // Low latency buffer
            try session.setPreferredIOBufferDuration(0.005)
            
            try session.setActive(true)
            
            let actualRate = session.sampleRate
            print("[V5Audio] ✅ Session configured")
            print("[V5Audio]    Requested: \(targetSampleRate)Hz")
            print("[V5Audio]    Actual: \(actualRate)Hz")
            print("[V5Audio]    Will resample: \(actualRate != targetSampleRate)")
            
        } catch {
            print("[V5Audio] ❌ Session setup error: \(error)")
        }
    }
    
    // MARK: - Recording
    
    func startRecording() {
        guard !isRecording else { return }
        
        do {
            audioEngine = AVAudioEngine()
            guard let engine = audioEngine else { return }
            
            let inputNode = engine.inputNode
            
            // Enable Voice Processing for AEC
            do {
                try inputNode.setVoiceProcessingEnabled(true)
                print("[V5Audio] ✅ Voice Processing (AEC) enabled")
            } catch {
                print("[V5Audio] ⚠️ Voice Processing not available: \(error)")
            }
            
            // Get device's native format
            inputFormat = inputNode.outputFormat(forBus: 0)
            guard let inputFmt = inputFormat else {
                print("[V5Audio] ❌ Failed to get input format")
                return
            }
            
            print("[V5Audio] Device input format:")
            print("[V5Audio]    Sample rate: \(inputFmt.sampleRate)Hz")
            print("[V5Audio]    Channels: \(inputFmt.channelCount)")
            
            // Create target format: PCM 16-bit, 24kHz, mono
            outputFormat = AVAudioFormat(
                commonFormat: .pcmFormatInt16,
                sampleRate: targetSampleRate,
                channels: targetChannels,
                interleaved: true
            )
            
            guard let outputFmt = outputFormat else {
                print("[V5Audio] ❌ Failed to create output format")
                return
            }
            
            print("[V5Audio] Target output format:")
            print("[V5Audio]    Sample rate: \(outputFmt.sampleRate)Hz")
            print("[V5Audio]    Channels: \(outputFmt.channelCount)")
            print("[V5Audio]    Bits: 16 (pcmFormatInt16)")
            
            // Install tap - process audio in callback
            inputNode.installTap(onBus: 0, bufferSize: 4800, format: inputFmt) { [weak self] buffer, _ in
                self?.processAudioBuffer(buffer)
            }
            
            try engine.start()
            
            DispatchQueue.main.async {
                self.isRecording = true
            }
            print("[V5Audio] ✅ Recording started")
            
        } catch {
            print("[V5Audio] ❌ Recording error: \(error)")
        }
    }
    
    func stopRecording() {
        guard isRecording else { return }
        
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        
        DispatchQueue.main.async {
            self.isRecording = false
        }
        print("[V5Audio] Recording stopped (chunks: \(chunksRecorded))")
    }
    
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let inputFmt = inputFormat,
              let outputFmt = outputFormat else { return }
        
        // Skip if muted (echo suppression)
        guard !isMicMuted else { return }
        
        // Create converter
        guard let converter = AVAudioConverter(from: inputFmt, to: outputFmt) else {
            print("[V5Audio] ❌ Failed to create converter")
            return
        }
        
        // Calculate output capacity
        let ratio = outputFmt.sampleRate / inputFmt.sampleRate
        let outputCapacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio)
        
        guard outputCapacity > 0,
              let convertedBuffer = AVAudioPCMBuffer(
                pcmFormat: outputFmt,
                frameCapacity: outputCapacity
              ) else { return }
        
        // Convert
        var error: NSError?
        var consumed = false
        
        let status = converter.convert(to: convertedBuffer, error: &error) { _, outStatus in
            if consumed {
                outStatus.pointee = .noDataNow
                return nil
            }
            consumed = true
            outStatus.pointee = .haveData
            return buffer
        }
        
        if status == .error {
            if let err = error {
                print("[V5Audio] ❌ Conversion error: \(err)")
            }
            return
        }
        
        guard convertedBuffer.frameLength > 0,
              let channelData = convertedBuffer.int16ChannelData else { return }
        
        // Extract PCM data
        let byteCount = Int(convertedBuffer.frameLength) * 2  // 16-bit = 2 bytes
        let data = Data(bytes: channelData[0], count: byteCount)
        
        chunksRecorded += 1
        
        // Debug log periodically
        if Date().timeIntervalSince(lastDebugLog) > 5.0 {
            print("[V5Audio] 🎤 Stats: recorded=\(chunksRecorded), played=\(chunksPlayed), bytes=\(byteCount)")
            lastDebugLog = Date()
        }
        
        // Send to callback
        onAudioCaptured?(data)
    }
    
    // MARK: - Playback
    
    func playAudio(_ audioData: Data) {
        guard !audioData.isEmpty else { return }
        
        // Add to buffer
        bufferLock.lock()
        audioBuffer.append(audioData)
        let currentSize = audioBuffer.count
        bufferLock.unlock()
        
        // Start playback once buffered enough
        if isBuffering && currentSize >= minBufferSize {
            isBuffering = false
            startContinuousPlayback()
        }
    }
    
    private func startContinuousPlayback() {
        if playbackEngine == nil || playerNode == nil {
            setupPlaybackEngine()
        }
        
        guard let player = playerNode else { return }
        
        if !player.isPlaying {
            player.play()
        }
        
        DispatchQueue.main.async {
            self.isPlaying = true
        }
        
        scheduleNextChunk()
    }
    
    private func scheduleNextChunk() {
        guard let player = playerNode, let engine = playbackEngine else { return }
        
        bufferLock.lock()
        let chunkSize = min(audioBuffer.count, 9600)  // ~200ms chunks
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
            DispatchQueue.global(qos: .userInteractive).async { [weak self] in
                self?.scheduleNextChunk()
            }
            return
        }
        
        chunksPlayed += 1
        
        player.scheduleBuffer(outputBuffer) { [weak self] in
            DispatchQueue.global(qos: .userInteractive).async {
                self?.scheduleNextChunk()
            }
        }
    }
    
    private func convertToPlaybackBuffer(_ audioData: Data, engine: AVAudioEngine) -> AVAudioPCMBuffer? {
        // Source: PCM 16-bit, 24kHz, mono (from OpenAI)
        guard let sourceFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: targetSampleRate,
            channels: targetChannels,
            interleaved: true
        ) else { return nil }
        
        let frameCount = UInt32(audioData.count / 2)
        guard frameCount > 0,
              let sourceBuffer = AVAudioPCMBuffer(pcmFormat: sourceFormat, frameCapacity: frameCount) else {
            return nil
        }
        sourceBuffer.frameLength = frameCount
        
        guard let channelData = sourceBuffer.int16ChannelData else { return nil }
        audioData.withUnsafeBytes { rawPtr in
            if let baseAddress = rawPtr.baseAddress {
                memcpy(channelData[0], baseAddress, audioData.count)
            }
        }
        
        // Convert to hardware format
        let outputFormat = engine.mainMixerNode.outputFormat(forBus: 0)
        guard let converter = AVAudioConverter(from: sourceFormat, to: outputFormat) else {
            return nil
        }
        
        let ratio = outputFormat.sampleRate / sourceFormat.sampleRate
        let outputCapacity = AVAudioFrameCount(Double(frameCount) * ratio)
        guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: outputCapacity) else {
            return nil
        }
        
        var error: NSError?
        var consumed = false
        let status = converter.convert(to: outputBuffer, error: &error) { _, outStatus in
            if consumed {
                outStatus.pointee = .noDataNow
                return nil
            }
            consumed = true
            outStatus.pointee = .haveData
            return sourceBuffer
        }
        
        if status == .error || outputBuffer.frameLength == 0 {
            return nil
        }
        
        return outputBuffer
    }
    
    private func setupPlaybackEngine() {
        playerNode?.stop()
        playbackEngine?.stop()
        playerNode = nil
        playbackEngine = nil
        
        let engine = AVAudioEngine()
        let player = AVAudioPlayerNode()
        
        engine.attach(player)
        
        let mixerFormat = engine.mainMixerNode.outputFormat(forBus: 0)
        engine.connect(player, to: engine.mainMixerNode, format: mixerFormat)
        
        do {
            try engine.start()
            playbackEngine = engine
            playerNode = player
            print("[V5Audio] ✅ Playback engine at \(mixerFormat.sampleRate)Hz")
        } catch {
            print("[V5Audio] ❌ Playback engine error: \(error)")
            player.stop()
            engine.stop()
        }
    }
    
    // MARK: - Control
    
    func clearBuffer() {
        bufferLock.lock()
        audioBuffer.removeAll()
        bufferLock.unlock()
        isBuffering = true
    }
    
    func stopAudio() {
        print("[V5Audio] 🛑 Stopping playback (barge-in)")
        playerNode?.stop()
        clearBuffer()
        DispatchQueue.main.async {
            self.isPlaying = false
        }
    }
    
    func cleanup() {
        stopRecording()
        clearBuffer()
        playerNode?.stop()
        playbackEngine?.stop()
        playerNode = nil
        playbackEngine = nil

        // CRITICAL: Release the audio session so microphone indicator turns off
        do {
            try AVAudioSession.sharedInstance().setActive(false)
        } catch {
            print("[V5Audio] Failed to deactivate session: \(error)")
        }
    }
    
    deinit {
        cleanup()
    }
}
