/**
 * AudioService.swift
 *
 * Handles audio recording and playback for Redi.
 * Records at 24kHz mono PCM16 for OpenAI Realtime API.
 */

import AVFoundation
import Combine

class AudioService: ObservableObject {
    // MARK: - Published Properties
    
    @Published var isRecording = false
    @Published var isPlaying = false
    @Published var audioLevel: Float = 0.0
    
    // MARK: - Publishers
    
    let audioChunkCaptured = PassthroughSubject<Data, Never>()
    
    // MARK: - Private Properties
    
    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var playerNode: AVAudioPlayerNode?
    private var audioFormat: AVAudioFormat?
    
    // Playback buffer
    private var playbackBuffer: [Data] = []
    private var isProcessingPlayback = false
    private let playbackQueue = DispatchQueue(label: "audio.playback", qos: .userInteractive)
    
    // Configuration matching OpenAI Realtime API
    private let sampleRate: Double = 24000
    private let channels: AVAudioChannelCount = 1
    
    // MARK: - Initialization
    
    init() {
        setupAudioSession()
    }
    
    // MARK: - Setup
    
    private func setupAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setPreferredSampleRate(sampleRate)
            try session.setActive(true)
            print("[Audio] Session configured: \(sampleRate)Hz")
        } catch {
            print("[Audio] ❌ Session setup failed: \(error)")
        }
    }
    
    // MARK: - Recording
    
    func startRecording() {
        guard !isRecording else { return }
        
        do {
            audioEngine = AVAudioEngine()
            guard let engine = audioEngine else { return }
            
            inputNode = engine.inputNode
            guard let input = inputNode else { return }
            
            // Create format for 24kHz mono PCM
            let recordingFormat = AVAudioFormat(
                commonFormat: .pcmFormatInt16,
                sampleRate: sampleRate,
                channels: channels,
                interleaved: true
            )!
            
            // Get input format
            let inputFormat = input.outputFormat(forBus: 0)
            
            // Install tap with conversion
            let bufferSize: AVAudioFrameCount = 4800 // 200ms at 24kHz
            
            input.installTap(onBus: 0, bufferSize: bufferSize, format: inputFormat) { [weak self] buffer, time in
                self?.processAudioBuffer(buffer, targetFormat: recordingFormat)
            }
            
            try engine.start()
            
            DispatchQueue.main.async {
                self.isRecording = true
            }
            
            print("[Audio] ✅ Recording started")
            
        } catch {
            print("[Audio] ❌ Recording failed: \(error)")
        }
    }
    
    func stopRecording() {
        guard isRecording else { return }
        
        inputNode?.removeTap(onBus: 0)
        audioEngine?.stop()
        
        DispatchQueue.main.async {
            self.isRecording = false
        }
        
        print("[Audio] Recording stopped")
    }
    
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer, targetFormat: AVAudioFormat) {
        // Convert to target format if needed
        guard let converter = AVAudioConverter(from: buffer.format, to: targetFormat) else {
            return
        }
        
        let frameCount = AVAudioFrameCount(Double(buffer.frameLength) * targetFormat.sampleRate / buffer.format.sampleRate)
        guard let convertedBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: frameCount) else {
            return
        }
        
        var error: NSError?
        let inputBlock: AVAudioConverterInputBlock = { inNumPackets, outStatus in
            outStatus.pointee = .haveData
            return buffer
        }
        
        converter.convert(to: convertedBuffer, error: &error, withInputFrom: inputBlock)
        
        if let error = error {
            print("[Audio] Conversion error: \(error)")
            return
        }
        
        // Extract PCM data
        guard let channelData = convertedBuffer.int16ChannelData else { return }
        let data = Data(bytes: channelData[0], count: Int(convertedBuffer.frameLength) * 2)
        
        // Calculate audio level
        let samples = Array(UnsafeBufferPointer(start: channelData[0], count: Int(convertedBuffer.frameLength)))
        let rms = sqrt(samples.map { Float($0) * Float($0) }.reduce(0, +) / Float(samples.count))
        let level = min(1.0, rms / 32768.0 * 10) // Normalize and amplify
        
        DispatchQueue.main.async {
            self.audioLevel = level
        }
        
        // Send audio chunk
        audioChunkCaptured.send(data)
    }
    
    // MARK: - Playback
    
    func playAudio(_ data: Data) {
        playbackQueue.async { [weak self] in
            self?.playbackBuffer.append(data)
            self?.processPlaybackBuffer()
        }
    }
    
    private func processPlaybackBuffer() {
        guard !isProcessingPlayback, !playbackBuffer.isEmpty else { return }
        isProcessingPlayback = true
        
        // Setup player if needed
        if playerNode == nil {
            setupPlayer()
        }
        
        guard let player = playerNode, let engine = audioEngine else {
            isProcessingPlayback = false
            return
        }
        
        // Create playback format
        guard let format = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: sampleRate,
            channels: channels,
            interleaved: true
        ) else {
            isProcessingPlayback = false
            return
        }
        
        // Process all buffered audio
        while !playbackBuffer.isEmpty {
            let data = playbackBuffer.removeFirst()
            
            let frameCount = AVAudioFrameCount(data.count / 2)
            guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
                continue
            }
            buffer.frameLength = frameCount
            
            // Copy data to buffer
            data.withUnsafeBytes { rawPtr in
                if let ptr = rawPtr.baseAddress?.assumingMemoryBound(to: Int16.self) {
                    buffer.int16ChannelData?[0].update(from: ptr, count: Int(frameCount))
                }
            }
            
            // Schedule buffer for playback
            player.scheduleBuffer(buffer)
        }
        
        // Start playing if not already
        if !player.isPlaying {
            player.play()
            DispatchQueue.main.async {
                self.isPlaying = true
            }
        }
        
        isProcessingPlayback = false
    }
    
    private func setupPlayer() {
        guard let engine = audioEngine else {
            // Create new engine for playback
            audioEngine = AVAudioEngine()
            guard let newEngine = audioEngine else { return }
            
            playerNode = AVAudioPlayerNode()
            guard let player = playerNode else { return }
            
            newEngine.attach(player)
            
            let format = AVAudioFormat(
                commonFormat: .pcmFormatInt16,
                sampleRate: sampleRate,
                channels: channels,
                interleaved: true
            )!
            
            newEngine.connect(player, to: newEngine.mainMixerNode, format: format)
            
            do {
                try newEngine.start()
            } catch {
                print("[Audio] ❌ Playback engine start failed: \(error)")
            }
            return
        }
        
        // Use existing engine
        playerNode = AVAudioPlayerNode()
        guard let player = playerNode else { return }
        
        engine.attach(player)
        
        let format = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: sampleRate,
            channels: channels,
            interleaved: true
        )!
        
        engine.connect(player, to: engine.mainMixerNode, format: format)
    }
    
    func stopPlayback() {
        playbackQueue.async { [weak self] in
            self?.playbackBuffer.removeAll()
            self?.playerNode?.stop()
            DispatchQueue.main.async {
                self?.isPlaying = false
            }
        }
        print("[Audio] Playback stopped")
    }
    
    // MARK: - Cleanup
    
    func cleanup() {
        stopRecording()
        stopPlayback()
        audioEngine?.stop()
        audioEngine = nil
        playerNode = nil
        print("[Audio] Cleaned up")
    }
    
    func getAudioFormat() -> AVAudioFormat? {
        return AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: sampleRate,
            channels: channels,
            interleaved: true
        )
    }
}
