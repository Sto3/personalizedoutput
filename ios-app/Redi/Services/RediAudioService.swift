/**
 * RediAudioService.swift
 *
 * Production audio service for Redi.
 * Handles audio capture (PCM16) and playback (MP3 from ElevenLabs).
 * NO VERSION NUMBERS - this is the production service.
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
    
    // MP3 Playback using AVAudioPlayer
    private var audioPlayer: AVAudioPlayer?
    private var playbackQueue: [Data] = []
    private var isProcessingPlayback = false
    private var audioStreamComplete = false  // Server signals when done
    private let playbackLock = NSLock()
    
    // Debug counter
    private var audioChunksReceived = 0
    
    // MARK: - Configuration
    
    private let sampleRate = RediConfig.Audio.sampleRate  // 24kHz for capture
    private let channels = RediConfig.Audio.channels
    private let bufferSize = RediConfig.Audio.recordingBufferSize
    
    // MARK: - Initialization
    
    init() {
        print("[RediAudio] 🎧 Service initialized")
        setupAudioSession()
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
            try session.setPreferredIOBufferDuration(0.02)  // 20ms buffer
            try session.setActive(true)
            print("[RediAudio] ✅ Audio session configured (speaker output)")
        } catch {
            print("[RediAudio] ❌ Audio session setup failed: \(error)")
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
            
            // Get the native format and create our target format
            let nativeFormat = input.outputFormat(forBus: 0)
            audioFormat = AVAudioFormat(
                commonFormat: .pcmFormatInt16,
                sampleRate: sampleRate,
                channels: channels,
                interleaved: true
            )
            
            guard let targetFormat = audioFormat else { return }
            
            // Install tap to capture audio
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
        
        // Convert if needed
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
        
        // Extract PCM16 data
        guard let int16Data = convertedBuffer.int16ChannelData else { return }
        let data = Data(bytes: int16Data[0], count: Int(convertedBuffer.frameLength) * 2)
        
        audioCaptured.send(data)
    }
    
    // MARK: - MP3 Playback (for ElevenLabs TTS)
    
    /// Play MP3 audio data from ElevenLabs
    func playAudio(_ data: Data) {
        audioChunksReceived += 1
        print("[RediAudio] 📥 Received audio chunk #\(audioChunksReceived): \(data.count) bytes")
        
        // Log first few bytes to verify it's MP3
        if audioChunksReceived == 1 {
            let header = data.prefix(4).map { String(format: "%02X", $0) }.joined(separator: " ")
            print("[RediAudio] 📥 First chunk header: \(header)")
        }
        
        playbackLock.lock()
        playbackQueue.append(data)
        audioStreamComplete = false  // More data coming
        let shouldProcess = !isProcessingPlayback
        playbackLock.unlock()
        
        if shouldProcess {
            processNextAudioChunk()
        }
    }
    
    /// Called when server signals audio stream is complete
    /// This flushes any remaining audio in the queue
    func flushAudio() {
        print("[RediAudio] 🔊 Flush requested - playing remaining audio")
        
        playbackLock.lock()
        audioStreamComplete = true
        let shouldProcess = !isProcessingPlayback && !playbackQueue.isEmpty
        playbackLock.unlock()
        
        if shouldProcess {
            processNextAudioChunk()
        }
    }
    
    private func processNextAudioChunk() {
        playbackLock.lock()
        
        let totalSize = playbackQueue.reduce(0) { $0 + $1.count }
        let streamDone = audioStreamComplete
        
        // If stream is complete, play whatever we have (even if small)
        // Otherwise wait for 4KB minimum
        let threshold = streamDone ? 1 : 4096
        
        guard totalSize >= threshold else {
            isProcessingPlayback = false
            playbackLock.unlock()
            
            if !streamDone {
                // Check again shortly - more data may be coming
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
                    self?.processNextAudioChunk()
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
        
        // Combine all queued chunks into one
        var combinedData = Data()
        while !playbackQueue.isEmpty {
            combinedData.append(playbackQueue.removeFirst())
        }
        
        playbackLock.unlock()
        
        print("[RediAudio] 🎵 Playing \(combinedData.count) bytes")
        
        // Play on main thread
        DispatchQueue.main.async { [weak self] in
            self?.playMP3Data(combinedData)
        }
    }
    
    private func playMP3Data(_ data: Data) {
        // Verify it looks like MP3 data
        let header = data.prefix(4).map { String(format: "%02X", $0) }.joined(separator: " ")
        print("[RediAudio] 🔊 Data header: \(header)")
        
        do {
            // Stop any existing playback
            audioPlayer?.stop()
            
            // Create new player with MP3 data
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.volume = 1.0
            audioPlayer?.prepareToPlay()
            
            let success = audioPlayer?.play() ?? false
            
            if success {
                isPlaying = true
                let duration = audioPlayer?.duration ?? 0
                print("[RediAudio] ✅ Playing \(String(format: "%.2f", duration))s of audio")
                
                // Check for more audio after this finishes
                DispatchQueue.main.asyncAfter(deadline: .now() + duration + 0.1) { [weak self] in
                    self?.playbackLock.lock()
                    let hasMore = !(self?.playbackQueue.isEmpty ?? true)
                    self?.playbackLock.unlock()
                    
                    if hasMore {
                        self?.processNextAudioChunk()
                    } else {
                        self?.isPlaying = false
                        self?.isProcessingPlayback = false
                        print("[RediAudio] ✅ Playback complete")
                    }
                }
            } else {
                print("[RediAudio] ❌ play() returned false!")
                isPlaying = false
                isProcessingPlayback = false
            }
            
        } catch {
            print("[RediAudio] ❌ MP3 playback failed: \(error)")
            isPlaying = false
            isProcessingPlayback = false
        }
    }
    
    func stopPlayback() {
        print("[RediAudio] 🛑 Stopping playback")
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
        audioChunksReceived = 0
    }
}
