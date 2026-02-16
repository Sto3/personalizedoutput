/**
 * V9AudioService.swift
 *
 * Audio capture and playback for V9 Three-Brain architecture.
 * Based on RediAudioService with critical volume fix and barge-in detection.
 *
 * CRITICAL FIX: Routes audio to SPEAKER (not earpiece) via:
 * - .defaultToSpeaker option on audio session
 * - overrideOutputAudioPort(.speaker) after activation
 */

import Foundation
import AVFoundation
import Combine

class V9AudioService: ObservableObject {
    // MARK: - Published Properties

    @Published var isRecording = false
    @Published var isPlaying = false
    @Published var isMuted = false
    @Published var audioLevel: Float = 0.0  // For waveform visualization

    // MARK: - Audio Capture Publisher

    let audioCaptured = PassthroughSubject<Data, Never>()

    // MARK: - Barge-in

    var onBargeIn: (() -> Void)?

    // MARK: - Private Properties

    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var audioFormat: AVAudioFormat?

    // PCM16 Streaming Playback
    private var playbackEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var playbackFormat: AVAudioFormat?
    private var scheduledBufferCount = 0
    private let bufferLock = NSLock()

    // Debug & Stats
    private var audioChunksReceived = 0
    private var firstAudioTime: Date?
    private var playbackStartTime: Date?

    // MARK: - Configuration

    private let sampleRate: Double = V9Config.Audio.sampleRate  // 24kHz
    private let channels: AVAudioChannelCount = AVAudioChannelCount(V9Config.Audio.channels)
    private let bufferSize: AVAudioFrameCount = 4800  // 200ms at 24kHz

    // MARK: - Initialization

    init() {
        print("[V9Audio] Service initialized")
        setupAudioSession()
    }

    deinit {
        cleanup()
    }

    // MARK: - Setup

    private func setupAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            // CRITICAL: .defaultToSpeaker routes to main speaker, not earpiece
            try session.setCategory(.playAndRecord, options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers])
            try session.setMode(.voiceChat)
            try session.setPreferredSampleRate(sampleRate)
            try session.setPreferredIOBufferDuration(0.005)  // 5ms buffer for low latency
            try session.setActive(true)
            // CRITICAL: Force speaker output
            try session.overrideOutputAudioPort(.speaker)
            print("[V9Audio] Audio session configured (speaker output, 5ms buffer)")
        } catch {
            print("[V9Audio] Audio session setup failed: \(error)")
        }
    }

    private func setupPCMPlayback() {
        guard playbackEngine == nil else { return }

        playbackEngine = AVAudioEngine()
        playerNode = AVAudioPlayerNode()

        guard let engine = playbackEngine, let player = playerNode else { return }

        // Float32 format - iOS mixer doesn't support Int16 directly
        playbackFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: sampleRate,
            channels: channels,
            interleaved: false
        )

        guard let format = playbackFormat else {
            print("[V9Audio] Failed to create playback format")
            return
        }

        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)

        // Set volume to maximum
        engine.mainMixerNode.outputVolume = 1.0

        do {
            try engine.start()
            print("[V9Audio] PCM streaming engine ready (Float32 @ \(sampleRate)Hz)")
        } catch {
            print("[V9Audio] PCM engine failed: \(error)")
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
            print("[V9Audio] Recording at \(sampleRate)Hz")

        } catch {
            print("[V9Audio] Recording failed: \(error)")
        }
    }

    func stopRecording() {
        guard isRecording else { return }

        inputNode?.removeTap(onBus: 0)
        audioEngine?.stop()
        isRecording = false
        print("[V9Audio] Recording stopped")
    }

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer, from sourceFormat: AVAudioFormat, to targetFormat: AVAudioFormat) {
        guard !isMuted else { return }

        // Calculate audio level for visualization
        if let channelData = buffer.floatChannelData?[0] {
            let frameCount = Int(buffer.frameLength)
            var sum: Float = 0
            for i in 0..<frameCount {
                sum += abs(channelData[i])
            }
            let average = sum / Float(frameCount)
            DispatchQueue.main.async { [weak self] in
                self?.audioLevel = average
            }
        }

        // Barge-in detection: if we're playing audio and user speaks, stop playback
        if isPlaying {
            if let channelData = buffer.floatChannelData?[0] {
                let frameCount = Int(buffer.frameLength)
                var sum: Float = 0
                for i in 0..<frameCount {
                    sum += abs(channelData[i])
                }
                let average = sum / Float(frameCount)
                if average > 0.02 {  // Threshold for speech detection
                    stopPlayback()
                    onBargeIn?()
                }
            }
        }

        guard let converter = AVAudioConverter(from: sourceFormat, to: targetFormat) else { return }

        let frameCount = AVAudioFrameCount(Double(buffer.frameLength) * targetFormat.sampleRate / sourceFormat.sampleRate)
        guard let convertedBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: frameCount) else { return }

        var error: NSError?
        converter.convert(to: convertedBuffer, error: &error) { inNumPackets, outStatus in
            outStatus.pointee = .haveData
            return buffer
        }

        if let error = error {
            print("[V9Audio] Conversion error: \(error)")
            return
        }

        guard let int16Data = convertedBuffer.int16ChannelData else { return }
        let data = Data(bytes: int16Data[0], count: Int(convertedBuffer.frameLength) * 2)

        audioCaptured.send(data)
    }

    // MARK: - PCM16 Streaming Playback

    func playAudio(_ data: Data) {
        audioChunksReceived += 1

        if firstAudioTime == nil {
            firstAudioTime = Date()
            print("[V9Audio] First audio chunk arrived!")
        }

        streamPCM16Audio(data)
    }

    private func streamPCM16Audio(_ data: Data) {
        if playbackEngine == nil {
            setupPCMPlayback()
        }

        guard let player = playerNode,
              let format = playbackFormat,
              let engine = playbackEngine else {
            print("[V9Audio] PCM engine not ready")
            return
        }

        if !engine.isRunning {
            do {
                try engine.start()
            } catch {
                print("[V9Audio] Engine restart failed: \(error)")
                return
            }
        }

        // Convert PCM16 Int16 data to Float32 for playback
        let frameCount = UInt32(data.count / 2)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
            print("[V9Audio] Buffer creation failed")
            return
        }

        buffer.frameLength = frameCount

        data.withUnsafeBytes { rawBuffer in
            let int16Ptr = rawBuffer.bindMemory(to: Int16.self)
            guard let floatChannel = buffer.floatChannelData?[0] else { return }

            for i in 0..<Int(frameCount) {
                floatChannel[i] = Float(int16Ptr[i]) / 32768.0
            }
        }

        if playbackStartTime == nil {
            playbackStartTime = Date()
            if let first = firstAudioTime {
                let latency = playbackStartTime!.timeIntervalSince(first) * 1000
                print("[V9Audio] Playback starting! (audio->play latency: \(Int(latency))ms)")
            }
        }

        if !player.isPlaying {
            player.play()
        }

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

    func stopPlayback() {
        playerNode?.stop()

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
        print("[V9Audio] Mute: \(muted)")
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
