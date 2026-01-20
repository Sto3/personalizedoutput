/**
 * RediAudioService.swift
 *
 * Production audio service for Redi.
 * Handles audio capture and playback for real-time voice interaction.
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
    private var audioPlayer: AVAudioPlayerNode?
    private var audioFormat: AVAudioFormat?
    
    // Playback buffer
    private var playbackBuffer: [Data] = []
    private var isProcessingPlayback = false
    private let playbackQueue = DispatchQueue(label: "redi.audio.playback", qos: .userInteractive)
    
    // MARK: - Configuration
    
    private let sampleRate = RediConfig.Audio.sampleRate
    private let channels = RediConfig.Audio.channels
    private let bufferSize = RediConfig.Audio.recordingBufferSize
    
    // MARK: - Initialization
    
    init() {
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
            print("[RediAudio] ✅ Audio session configured")
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
    
    // MARK: - Playback
    
    func playAudio(_ data: Data) {
        playbackQueue.async { [weak self] in
            self?.playbackBuffer.append(data)
            self?.processPlaybackBuffer()
        }
    }
    
    private func processPlaybackBuffer() {
        guard !isProcessingPlayback else { return }
        guard !playbackBuffer.isEmpty else { return }
        
        isProcessingPlayback = true
        
        // Ensure we have enough data before starting playback
        let totalBytes = playbackBuffer.reduce(0) { $0 + $1.count }
        guard totalBytes >= RediConfig.Audio.minPlaybackBuffer else {
            isProcessingPlayback = false
            return
        }
        
        // Combine buffered data
        var combinedData = Data()
        while !playbackBuffer.isEmpty && combinedData.count < RediConfig.Audio.playbackChunkSize {
            combinedData.append(playbackBuffer.removeFirst())
        }
        
        playPCM16Data(combinedData)
        isProcessingPlayback = false
        
        // Continue processing if more data
        if !playbackBuffer.isEmpty {
            playbackQueue.asyncAfter(deadline: .now() + 0.02) { [weak self] in
                self?.processPlaybackBuffer()
            }
        }
    }
    
    private func playPCM16Data(_ data: Data) {
        guard let format = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: sampleRate,
            channels: channels,
            interleaved: true
        ) else { return }
        
        let frameCount = UInt32(data.count / 2)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return }
        buffer.frameLength = frameCount
        
        data.withUnsafeBytes { rawBuffer in
            if let baseAddress = rawBuffer.baseAddress {
                memcpy(buffer.int16ChannelData![0], baseAddress, data.count)
            }
        }
        
        DispatchQueue.main.async { [weak self] in
            self?.scheduleBuffer(buffer)
        }
    }
    
    private func scheduleBuffer(_ buffer: AVAudioPCMBuffer) {
        if audioPlayer == nil {
            setupPlayer()
        }
        
        audioPlayer?.scheduleBuffer(buffer, completionHandler: nil)
        
        if !(audioPlayer?.isPlaying ?? false) {
            audioPlayer?.play()
            isPlaying = true
        }
    }
    
    private func setupPlayer() {
        guard let engine = audioEngine else {
            // Create a new engine for playback if recording engine doesn't exist
            audioEngine = AVAudioEngine()
            guard let newEngine = audioEngine else { return }
            
            audioPlayer = AVAudioPlayerNode()
            guard let player = audioPlayer else { return }
            
            let format = AVAudioFormat(
                commonFormat: .pcmFormatInt16,
                sampleRate: sampleRate,
                channels: channels,
                interleaved: true
            )!
            
            newEngine.attach(player)
            newEngine.connect(player, to: newEngine.mainMixerNode, format: format)
            
            try? newEngine.start()
            return
        }
        
        audioPlayer = AVAudioPlayerNode()
        guard let player = audioPlayer else { return }
        
        let format = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: sampleRate,
            channels: channels,
            interleaved: true
        )!
        
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)
    }
    
    func stopPlayback() {
        audioPlayer?.stop()
        playbackBuffer.removeAll()
        isPlaying = false
    }
    
    // MARK: - Mute Control
    
    func setMuted(_ muted: Bool) {
        isMuted = muted
        print("[RediAudio] Mute: \(muted)")
    }
    
    // MARK: - Cleanup
    
    func cleanup() {
        stopRecording()
        stopPlayback()
        audioEngine?.stop()
        audioEngine = nil
        audioPlayer = nil
    }
}
