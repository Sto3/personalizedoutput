/**
 * RediAudioService.swift
 *
 * Production audio service for Redi.
 * Handles audio capture (PCM16) and playback.
 * 
 * CRITICAL FIX: V7 uses PCM16, V8 uses MP3
 * This service auto-detects format and plays correctly.
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
    
    // PCM16 Playback (V7 - OpenAI Realtime)
    private var playerNode: AVAudioPlayerNode?
    private var playbackEngine: AVAudioEngine?
    private var playbackFormat: AVAudioFormat?
    
    // MP3 Playback (V8 - ElevenLabs)
    private var audioPlayer: AVAudioPlayer?
    private var playbackQueue: [Data] = []
    private var isProcessingPlayback = false
    private var audioStreamComplete = false
    private let playbackLock = NSLock()
    
    // Debug counter
    private var audioChunksReceived = 0
    
    // MARK: - Configuration
    
    private let sampleRate = RediConfig.Audio.sampleRate  // 24kHz
    private let channels = RediConfig.Audio.channels
    private let bufferSize = RediConfig.Audio.recordingBufferSize
    
    // MARK: - Initialization
    
    init() {
        print("[RediAudio] 🎧 Service initialized")
        setupAudioSession()
        setupPCMPlayback()  // V7 needs this
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
            try session.setPreferredIOBufferDuration(0.02)
            try session.setActive(true)
            print("[RediAudio] ✅ Audio session configured (speaker output)")
        } catch {
            print("[RediAudio] ❌ Audio session setup failed: \(error)")
        }
    }
    
    private func setupPCMPlayback() {
        // Create playback engine for PCM16 audio (V7)
        playbackEngine = AVAudioEngine()
        playerNode = AVAudioPlayerNode()
        
        guard let engine = playbackEngine, let player = playerNode else { return }
        
        // PCM16 format at 24kHz mono (matching OpenAI Realtime output)
        playbackFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: sampleRate,
            channels: channels,
            interleaved: true
        )
        
        engine.attach(player)
        
        if let format = playbackFormat {
            engine.connect(player, to: engine.mainMixerNode, format: format)
        }
        
        do {
            try engine.start()
            print("[RediAudio] ✅ PCM playback engine ready")
        } catch {
            print("[RediAudio] ❌ PCM playback setup failed: \(error)")
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
            print("[RediAudio] ✅ Recording started at \(sampleRate)Hz")
            
        } catch {
            print("[RediAudio] ❌ Failed to start recording: \(error)")
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
    
    /// Play audio data - auto-detects format (PCM16 for V7, MP3 for V8)
    func playAudio(_ data: Data) {
        audioChunksReceived += 1
        
        // Detect format from header
        let isMP3 = detectMP3(data)
        
        if audioChunksReceived == 1 {
            let header = data.prefix(4).map { String(format: "%02X", $0) }.joined(separator: " ")
            print("[RediAudio] 📥 Audio chunk #\(audioChunksReceived): \(data.count) bytes, header: \(header), format: \(isMP3 ? "MP3" : "PCM16")")
        }
        
        if isMP3 {
            playMP3Audio(data)
        } else {
            playPCM16Audio(data)
        }
    }
    
    /// Detect if data is MP3 format
    private func detectMP3(_ data: Data) -> Bool {
        guard data.count >= 3 else { return false }
        
        let bytes = [UInt8](data.prefix(3))
        
        // ID3 tag
        if bytes[0] == 0x49 && bytes[1] == 0x44 && bytes[2] == 0x33 {
            return true
        }
        
        // MP3 frame sync (FF FB, FF FA, FF F3, FF F2, etc.)
        if bytes[0] == 0xFF && (bytes[1] & 0xE0) == 0xE0 {
            return true
        }
        
        return false
    }
    
    // MARK: - PCM16 Playback (V7 - OpenAI Realtime)
    
    private func playPCM16Audio(_ data: Data) {
        guard let player = playerNode,
              let format = playbackFormat,
              let engine = playbackEngine else {
            print("[RediAudio] ❌ PCM playback not ready")
            return
        }
        
        // Ensure engine is running
        if !engine.isRunning {
            do {
                try engine.start()
            } catch {
                print("[RediAudio] ❌ Failed to restart playback engine: \(error)")
                return
            }
        }
        
        // Create buffer from PCM16 data
        let frameCount = UInt32(data.count / 2)  // 2 bytes per sample
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
            print("[RediAudio] ❌ Failed to create buffer")
            return
        }
        
        buffer.frameLength = frameCount
        
        // Copy data to buffer
        data.withUnsafeBytes { rawBuffer in
            if let baseAddress = rawBuffer.baseAddress {
                memcpy(buffer.int16ChannelData![0], baseAddress, data.count)
            }
        }
        
        // Schedule and play
        if !player.isPlaying {
            player.play()
        }
        
        player.scheduleBuffer(buffer, completionHandler: nil)
        isPlaying = true
    }
    
    // MARK: - MP3 Playback (V8 - ElevenLabs)
    
    private func playMP3Audio(_ data: Data) {
        playbackLock.lock()
        playbackQueue.append(data)
        audioStreamComplete = false
        let shouldProcess = !isProcessingPlayback
        playbackLock.unlock()
        
        if shouldProcess {
            processNextMP3Chunk()
        }
    }
    
    func flushAudio() {
        print("[RediAudio] 🔊 Flush requested")
        
        playbackLock.lock()
        audioStreamComplete = true
        let shouldProcess = !isProcessingPlayback && !playbackQueue.isEmpty
        playbackLock.unlock()
        
        if shouldProcess {
            processNextMP3Chunk()
        }
    }
    
    private func processNextMP3Chunk() {
        playbackLock.lock()
        
        let totalSize = playbackQueue.reduce(0) { $0 + $1.count }
        let streamDone = audioStreamComplete
        let threshold = streamDone ? 1 : 4096
        
        guard totalSize >= threshold else {
            isProcessingPlayback = false
            playbackLock.unlock()
            
            if !streamDone {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
                    self?.processNextMP3Chunk()
                }
            }
            return
        }
        
        guard !playbackQueue.isEmpty else {
            isProcessingPlayback = false
            playbackLock.unlock()
            return
        }
        
        isProcessingPlayback = true
        
        var combinedData = Data()
        while !playbackQueue.isEmpty {
            combinedData.append(playbackQueue.removeFirst())
        }
        
        playbackLock.unlock()
        
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
            
            let success = audioPlayer?.play() ?? false
            
            if success {
                isPlaying = true
                let duration = audioPlayer?.duration ?? 0
                print("[RediAudio] ✅ Playing MP3 \(String(format: "%.2f", duration))s")
                
                DispatchQueue.main.asyncAfter(deadline: .now() + duration + 0.1) { [weak self] in
                    self?.playbackLock.lock()
                    let hasMore = !(self?.playbackQueue.isEmpty ?? true)
                    self?.playbackLock.unlock()
                    
                    if hasMore {
                        self?.processNextMP3Chunk()
                    } else {
                        self?.isPlaying = false
                        self?.isProcessingPlayback = false
                    }
                }
            } else {
                print("[RediAudio] ❌ MP3 play() failed")
                isPlaying = false
                isProcessingPlayback = false
            }
            
        } catch {
            print("[RediAudio] ❌ MP3 playback error: \(error)")
            isPlaying = false
            isProcessingPlayback = false
        }
    }
    
    func stopPlayback() {
        print("[RediAudio] 🛑 Stopping playback")
        
        // Stop PCM playback
        playerNode?.stop()
        
        // Stop MP3 playback
        audioPlayer?.stop()
        audioPlayer = nil
        
        playbackLock.lock()
        playbackQueue.removeAll()
        isProcessingPlayback = false
        audioStreamComplete = false
        playbackLock.unlock()
        
        isPlaying = false
        audioChunksReceived = 0
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
    }
}
