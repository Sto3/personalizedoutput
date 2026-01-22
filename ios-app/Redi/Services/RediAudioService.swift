/**
 * RediAudioService.swift
 *
 * OPTIMIZED for sub-500ms latency
 * 
 * KEY OPTIMIZATION: Stream audio immediately!
 * - V7 (PCM16): Play each chunk as it arrives via AVAudioPlayerNode
 * - V8 (MP3): Buffer minimally, play as soon as possible
 * 
 * Auto-detects format (PCM16 vs MP3) from audio header.
 */

import Foundation
import AVFoundation
import Combine

class RediAudioService: ObservableObject {
    // MARK: - Published Properties
    
    @Published var isRecording = false
    @Published var isPlaying = false
    @Published var isMuted = false
    
    // MARK: - Audio Capture Publisher
    
    let audioCaptured = PassthroughSubject<Data, Never>()
    
    // MARK: - Private Properties
    
    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var audioFormat: AVAudioFormat?
    
    // PCM16 Streaming Playback (V7 - OpenAI Realtime)
    private var playbackEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var playbackFormat: AVAudioFormat?  // Float32 format for playback
    private var scheduledBufferCount = 0
    private let bufferLock = NSLock()
    
    // MP3 Playback (V8 - ElevenLabs)
    private var audioPlayer: AVAudioPlayer?
    private var mp3Queue: [Data] = []
    private var isProcessingMP3 = false
    private var mp3StreamComplete = false
    private let mp3Lock = NSLock()
    
    // Debug & Stats
    private var audioChunksReceived = 0
    private var firstAudioTime: Date?
    private var playbackStartTime: Date?
    
    // MARK: - Configuration
    
    private let sampleRate = RediConfig.Audio.sampleRate  // 24kHz
    private let channels = RediConfig.Audio.channels
    private let bufferSize = RediConfig.Audio.recordingBufferSize
    
    // MARK: - Initialization
    
    init() {
        print("[RediAudio] 🎧 Service initialized (STREAMING MODE)")
        setupAudioSession()
        // Defer playback setup until actually needed
    }
    
    deinit {
        cleanup()
    }
    
    // MARK: - Setup
    
    private func setupAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setPreferredSampleRate(sampleRate)
            try session.setPreferredIOBufferDuration(0.005)  // 5ms buffer for low latency!
            try session.setActive(true)
            print("[RediAudio] ✅ Audio session configured (5ms buffer)")
        } catch {
            print("[RediAudio] ❌ Audio session setup failed: \(error)")
        }
    }
    
    private func setupPCMPlayback() {
        // Skip if already setup
        guard playbackEngine == nil else { return }
        
        playbackEngine = AVAudioEngine()
        playerNode = AVAudioPlayerNode()
        
        guard let engine = playbackEngine, let player = playerNode else { return }
        
        // CRITICAL FIX: Use Float32 format - iOS mixer doesn't support Int16 directly
        playbackFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: sampleRate,
            channels: channels,
            interleaved: false
        )
        
        guard let format = playbackFormat else {
            print("[RediAudio] ❌ Failed to create playback format")
            return
        }
        
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)
        
        do {
            try engine.start()
            print("[RediAudio] ✅ PCM streaming engine ready (Float32 @ \(sampleRate)Hz)")
        } catch {
            print("[RediAudio] ❌ PCM engine failed: \(error)")
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
            
            let nativeFormat = input.outputFormat(forBus: 0)
            audioFormat = AVAudioFormat(
                commonFormat: .pcmFormatInt16,
                sampleRate: sampleRate,
                channels: channels,
                interleaved: true
            )
            
            guard let targetFormat = audioFormat else { return }
            
            input.installTap(onBus: 0, bufferSize: bufferSize, format: nativeFormat) { [weak self] buffer, _ in
                self?.processAudioBuffer(buffer, from: nativeFormat, to: targetFormat)
            }
            
            try engine.start()
            isRecording = true
            print("[RediAudio] ✅ Recording at \(sampleRate)Hz")
            
        } catch {
            print("[RediAudio] ❌ Recording failed: \(error)")
        }
    }
    
    func stopRecording() {
        guard isRecording else { return }
        
        inputNode?.removeTap(onBus: 0)
        audioEngine?.stop()
        isRecording = false
        print("[RediAudio] Recording stopped")
    }
    
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer, from sourceFormat: AVAudioFormat, to targetFormat: AVAudioFormat) {
        guard !isMuted else { return }
        
        guard let converter = AVAudioConverter(from: sourceFormat, to: targetFormat) else { return }
        
        let frameCount = AVAudioFrameCount(Double(buffer.frameLength) * targetFormat.sampleRate / sourceFormat.sampleRate)
        guard let convertedBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: frameCount) else { return }
        
        var error: NSError?
        converter.convert(to: convertedBuffer, error: &error) { inNumPackets, outStatus in
            outStatus.pointee = .haveData
            return buffer
        }
        
        if let error = error {
            print("[RediAudio] Conversion error: \(error)")
            return
        }
        
        guard let int16Data = convertedBuffer.int16ChannelData else { return }
        let data = Data(bytes: int16Data[0], count: Int(convertedBuffer.frameLength) * 2)
        
        audioCaptured.send(data)
    }
    
    // MARK: - Smart Playback (Auto-detect PCM16 vs MP3)
    
    func playAudio(_ data: Data) {
        audioChunksReceived += 1
        
        // Track first audio arrival
        if firstAudioTime == nil {
            firstAudioTime = Date()
            print("[RediAudio] 📥 First audio chunk arrived!")
        }
        
        let isMP3 = detectMP3(data)
        
        if audioChunksReceived <= 3 {
            let header = data.prefix(4).map { String(format: "%02X", $0) }.joined(separator: " ")
            print("[RediAudio] 📥 Chunk #\(audioChunksReceived): \(data.count) bytes [\(header)] \(isMP3 ? "MP3" : "PCM16")")
        }
        
        if isMP3 {
            playMP3Audio(data)
        } else {
            streamPCM16Audio(data)
        }
    }
    
    private func detectMP3(_ data: Data) -> Bool {
        guard data.count >= 3 else { return false }
        let bytes = [UInt8](data.prefix(3))
        
        // ID3 tag
        if bytes[0] == 0x49 && bytes[1] == 0x44 && bytes[2] == 0x33 { return true }
        
        // MP3 frame sync
        if bytes[0] == 0xFF && (bytes[1] & 0xE0) == 0xE0 { return true }
        
        return false
    }
    
    // MARK: - PCM16 STREAMING Playback (V7)
    // Play IMMEDIATELY as each chunk arrives - no buffering!
    
    private func streamPCM16Audio(_ data: Data) {
        // Lazy setup of playback engine
        if playbackEngine == nil {
            setupPCMPlayback()
        }
        
        guard let player = playerNode,
              let format = playbackFormat,
              let engine = playbackEngine else {
            print("[RediAudio] ❌ PCM engine not ready")
            return
        }
        
        // Ensure engine is running
        if !engine.isRunning {
            do {
                try engine.start()
            } catch {
                print("[RediAudio] ❌ Engine restart failed: \(error)")
                return
            }
        }
        
        // Convert PCM16 Int16 data to Float32 for playback
        let frameCount = UInt32(data.count / 2)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
            print("[RediAudio] ❌ Buffer creation failed")
            return
        }
        
        buffer.frameLength = frameCount
        
        // Convert Int16 -> Float32
        data.withUnsafeBytes { rawBuffer in
            let int16Ptr = rawBuffer.bindMemory(to: Int16.self)
            guard let floatChannel = buffer.floatChannelData?[0] else { return }
            
            for i in 0..<Int(frameCount) {
                floatChannel[i] = Float(int16Ptr[i]) / 32768.0
            }
        }
        
        // Track playback start
        if playbackStartTime == nil {
            playbackStartTime = Date()
            if let first = firstAudioTime {
                let latency = playbackStartTime!.timeIntervalSince(first) * 1000
                print("[RediAudio] 🔊 Playback starting! (audio→play latency: \(Int(latency))ms)")
            }
        }
        
        // Start player if not playing
        if !player.isPlaying {
            player.play()
        }
        
        // Schedule buffer immediately
        bufferLock.lock()
        scheduledBufferCount += 1
        bufferLock.unlock()
        
        player.scheduleBuffer(buffer) { [weak self] in
            self?.bufferLock.lock()
            self?.scheduledBufferCount -= 1
            let remaining = self?.scheduledBufferCount ?? 0
            self?.bufferLock.unlock()
            
            if remaining == 0 {
                DispatchQueue.main.async {
                    self?.isPlaying = false
                }
            }
        }
        
        isPlaying = true
    }
    
    // MARK: - MP3 Playback (V8)
    
    private func playMP3Audio(_ data: Data) {
        mp3Lock.lock()
        mp3Queue.append(data)
        mp3StreamComplete = false
        let shouldProcess = !isProcessingMP3
        mp3Lock.unlock()
        
        if shouldProcess {
            processMP3Queue()
        }
    }
    
    func flushAudio() {
        print("[RediAudio] 🔊 Flush requested")
        
        mp3Lock.lock()
        mp3StreamComplete = true
        let shouldProcess = !isProcessingMP3 && !mp3Queue.isEmpty
        mp3Lock.unlock()
        
        if shouldProcess {
            processMP3Queue()
        }
    }
    
    private func processMP3Queue() {
        mp3Lock.lock()
        
        let totalSize = mp3Queue.reduce(0) { $0 + $1.count }
        let streamDone = mp3StreamComplete
        let threshold = streamDone ? 1 : 2048  // Reduced from 4KB
        
        guard totalSize >= threshold else {
            isProcessingMP3 = false
            mp3Lock.unlock()
            
            if !streamDone {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.03) { [weak self] in
                    self?.processMP3Queue()
                }
            }
            return
        }
        
        guard !mp3Queue.isEmpty else {
            isProcessingMP3 = false
            mp3Lock.unlock()
            return
        }
        
        isProcessingMP3 = true
        
        var combinedData = Data()
        while !mp3Queue.isEmpty {
            combinedData.append(mp3Queue.removeFirst())
        }
        
        mp3Lock.unlock()
        
        DispatchQueue.main.async { [weak self] in
            self?.playMP3Data(combinedData)
        }
    }
    
    private func playMP3Data(_ data: Data) {
        do {
            audioPlayer?.stop()
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.volume = 1.0
            audioPlayer?.prepareToPlay()
            
            if audioPlayer?.play() == true {
                isPlaying = true
                let duration = audioPlayer?.duration ?? 0
                
                DispatchQueue.main.asyncAfter(deadline: .now() + duration + 0.05) { [weak self] in
                    self?.mp3Lock.lock()
                    let hasMore = !(self?.mp3Queue.isEmpty ?? true)
                    self?.mp3Lock.unlock()
                    
                    if hasMore {
                        self?.processMP3Queue()
                    } else {
                        self?.isPlaying = false
                        self?.isProcessingMP3 = false
                    }
                }
            } else {
                isPlaying = false
                isProcessingMP3 = false
            }
        } catch {
            print("[RediAudio] ❌ MP3 error: \(error)")
            isPlaying = false
            isProcessingMP3 = false
        }
    }
    
    func stopPlayback() {
        print("[RediAudio] 🛑 Stopping playback")
        
        // Stop PCM
        playerNode?.stop()
        
        // Stop MP3
        audioPlayer?.stop()
        audioPlayer = nil
        
        mp3Lock.lock()
        mp3Queue.removeAll()
        isProcessingMP3 = false
        mp3StreamComplete = false
        mp3Lock.unlock()
        
        bufferLock.lock()
        scheduledBufferCount = 0
        bufferLock.unlock()
        
        isPlaying = false
        audioChunksReceived = 0
        firstAudioTime = nil
        playbackStartTime = nil
    }
    
    // MARK: - Mute Control
    
    func setMuted(_ muted: Bool) {
        isMuted = muted
        print("[RediAudio] 🎤 Mute: \(muted)")
    }
    
    // MARK: - Cleanup
    
    func cleanup() {
        stopRecording()
        stopPlayback()
        audioEngine?.stop()
        audioEngine = nil
        playbackEngine?.stop()
        playbackEngine = nil
        audioChunksReceived = 0
        firstAudioTime = nil
        playbackStartTime = nil
    }
}
