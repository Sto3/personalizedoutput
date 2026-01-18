/**
 * Redi V3 AudioService
 *
 * Handles:
 * - Microphone capture (PCM 16-bit, 24kHz, mono)
 * - Speaker playback of AI responses with buffering for smooth audio
 *
 * Audio format matches OpenAI Realtime API requirements.
 */

import AVFoundation
import Combine

class V3AudioService: ObservableObject {
    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var playbackEngine: AVAudioEngine?
    private var inputFormat: AVAudioFormat?
    private var outputFormat: AVAudioFormat?

    @Published var isRecording = false
    @Published var isPlaying = false
    @Published var isMicMuted = false  // Echo suppression: server can mute mic while Redi speaks

    var onAudioCaptured: ((Data) -> Void)?

    // Target: PCM 16-bit, 24kHz, mono (OpenAI Realtime format)
    private let targetSampleRate: Double = 24000
    private let targetChannels: AVAudioChannelCount = 1

    // Audio buffering for smooth playback - minimized for low latency
    private var audioBuffer = Data()
    private let bufferLock = NSLock()
    private var isBuffering = true
    private let minBufferSize = 1200  // ~25ms at 24kHz (reduced for low latency)
    private var playbackTimer: Timer?

    // VAD (Voice Activity Detection) - reduces bandwidth by ~30-40%
    private let vadThreshold: Float = 0.015  // RMS threshold for voice detection
    private var isSpeaking = false
    private var silenceFrameCount = 0
    private let silenceFramesToStop = 10  // ~200ms of silence before stopping
    private let trailingSilenceFrames = 5  // Send some trailing silence for natural cutoff

    @Published var vadActive = false  // For UI indicator

    init() {
        setupAudioSession()
    }

    private func setupAudioSession() {
        let audioSession = AVAudioSession.sharedInstance()

        do {
            try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [
                .defaultToSpeaker,
                .allowBluetooth,
                .mixWithOthers
            ])
            try audioSession.setPreferredSampleRate(targetSampleRate)
            try audioSession.setPreferredIOBufferDuration(0.005)  // 5ms buffer for low latency
            try audioSession.setActive(true)
            print("[V3Audio] Audio session configured")
        } catch {
            print("[V3Audio] Audio session setup error: \(error)")
        }
    }

    func startRecording() {
        guard !isRecording else { return }

        do {
            audioEngine = AVAudioEngine()
            guard let audioEngine = audioEngine else { return }

            let inputNode = audioEngine.inputNode
            inputFormat = inputNode.outputFormat(forBus: 0)

            // Create output format (PCM 16-bit, 24kHz, mono)
            outputFormat = AVAudioFormat(
                commonFormat: .pcmFormatInt16,
                sampleRate: targetSampleRate,
                channels: targetChannels,
                interleaved: true
            )

            guard let outputFormat = outputFormat else {
                print("[V3Audio] Failed to create output format")
                return
            }

            // Install tap on input node
            inputNode.installTap(onBus: 0, bufferSize: 4800, format: inputFormat) { [weak self] buffer, time in
                self?.processAudioBuffer(buffer)
            }

            try audioEngine.start()

            DispatchQueue.main.async {
                self.isRecording = true
            }
            print("[V3Audio] Recording started")

        } catch {
            print("[V3Audio] Recording start error: \(error)")
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
        print("[V3Audio] Recording stopped")
    }

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let inputFormat = inputFormat,
              let outputFormat = outputFormat else { return }

        // Calculate RMS energy for VAD
        let energy = calculateRMSEnergy(buffer)

        // VAD with hysteresis
        let wasSpeaking = isSpeaking
        if energy > vadThreshold * 1.5 {
            // Voice detected - start speaking
            isSpeaking = true
            silenceFrameCount = 0
        } else if energy < vadThreshold * 0.5 {
            // Below threshold - may be silence
            silenceFrameCount += 1
            if silenceFrameCount > silenceFramesToStop {
                isSpeaking = false
            }
        }

        // Update UI indicator
        if wasSpeaking != isSpeaking {
            DispatchQueue.main.async { [weak self] in
                self?.vadActive = self?.isSpeaking ?? false
            }
        }

        // IMPORTANT: Send ALL audio to OpenAI - their server VAD needs to hear
        // the silence to detect when speech ends. Don't filter on client side.
        // let shouldSend = isSpeaking || (silenceFrameCount <= trailingSilenceFrames)
        // guard shouldSend else { return }

        // Convert to target format
        guard let converter = AVAudioConverter(from: inputFormat, to: outputFormat) else {
            return
        }

        // Calculate output frame capacity
        let ratio = outputFormat.sampleRate / inputFormat.sampleRate
        let outputFrameCapacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio)

        guard outputFrameCapacity > 0,
              let convertedBuffer = AVAudioPCMBuffer(
                pcmFormat: outputFormat,
                frameCapacity: outputFrameCapacity
              ) else { return }

        var error: NSError?
        var inputBufferConsumed = false

        let status = converter.convert(to: convertedBuffer, error: &error) { inNumPackets, outStatus in
            if inputBufferConsumed {
                outStatus.pointee = .noDataNow
                return nil
            }
            inputBufferConsumed = true
            outStatus.pointee = .haveData
            return buffer
        }

        if status == .error {
            return
        }

        guard convertedBuffer.frameLength > 0,
              let channelData = convertedBuffer.int16ChannelData else { return }

        let dataSize = Int(convertedBuffer.frameLength) * 2  // 2 bytes per sample
        let data = Data(bytes: channelData[0], count: dataSize)

        // Echo suppression: don't send audio while mic is muted (Redi is speaking)
        guard !isMicMuted else { return }

        // Send to callback
        onAudioCaptured?(data)
    }

    /// Calculate RMS (Root Mean Square) energy of audio buffer
    private func calculateRMSEnergy(_ buffer: AVAudioPCMBuffer) -> Float {
        guard let channelData = buffer.floatChannelData?[0] else { return 0 }
        let frameLength = Int(buffer.frameLength)
        guard frameLength > 0 else { return 0 }

        var sum: Float = 0
        for i in 0..<frameLength {
            sum += channelData[i] * channelData[i]
        }

        return sqrt(sum / Float(frameLength))
    }

    // MARK: - Buffered Playback

    func playAudio(_ audioData: Data) {
        guard !audioData.isEmpty else { return }

        // Add to buffer
        bufferLock.lock()
        audioBuffer.append(audioData)
        let currentBufferSize = audioBuffer.count
        bufferLock.unlock()

        // Start playback once we have enough buffered
        if isBuffering && currentBufferSize >= minBufferSize {
            isBuffering = false
            startContinuousPlayback()
        }
    }

    private func startContinuousPlayback() {
        // Setup engine if needed
        if playbackEngine == nil || playerNode == nil {
            setupPlaybackEngine()
        }

        guard let player = playerNode, let engine = playbackEngine else { return }

        // Start the player if not already playing
        if !player.isPlaying {
            player.play()
        }

        DispatchQueue.main.async { [weak self] in
            self?.isPlaying = true
        }

        // Schedule a chunk immediately
        scheduleNextChunk()
    }

    private func scheduleNextChunk() {
        guard let player = playerNode, let engine = playbackEngine else { return }

        // Get chunk from buffer
        bufferLock.lock()
        let chunkSize = min(audioBuffer.count, 9600)  // ~200ms chunks
        guard chunkSize > 0 else {
            bufferLock.unlock()
            // Buffer empty - mark as done and reset for next response
            DispatchQueue.main.async { [weak self] in
                self?.isPlaying = false
            }
            isBuffering = true
            return
        }

        let chunk = audioBuffer.prefix(chunkSize)
        audioBuffer.removeFirst(chunkSize)
        let remainingData = audioBuffer.count
        bufferLock.unlock()

        // Convert chunk to playable buffer
        guard let outputBuffer = convertToPlaybackBuffer(Data(chunk), engine: engine) else {
            // Try next chunk
            DispatchQueue.global(qos: .userInteractive).async { [weak self] in
                self?.scheduleNextChunk()
            }
            return
        }

        // Schedule this chunk, then schedule next when done
        player.scheduleBuffer(outputBuffer) { [weak self] in
            // Schedule next chunk immediately to avoid gaps
            DispatchQueue.global(qos: .userInteractive).async {
                self?.scheduleNextChunk()
            }
        }
    }

    private func convertToPlaybackBuffer(_ audioData: Data, engine: AVAudioEngine) -> AVAudioPCMBuffer? {
        // Source format: PCM 16-bit, 24kHz, mono (from OpenAI)
        guard let sourceFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: targetSampleRate,
            channels: targetChannels,
            interleaved: true
        ) else {
            return nil
        }

        let frameCount = UInt32(audioData.count / 2)
        guard frameCount > 0,
              let sourceBuffer = AVAudioPCMBuffer(pcmFormat: sourceFormat, frameCapacity: frameCount) else {
            return nil
        }
        sourceBuffer.frameLength = frameCount

        guard let channelData = sourceBuffer.int16ChannelData else {
            return nil
        }
        audioData.withUnsafeBytes { rawPtr in
            if let baseAddress = rawPtr.baseAddress {
                memcpy(channelData[0], baseAddress, audioData.count)
            }
        }

        // Convert to hardware sample rate
        let outputFormat = engine.mainMixerNode.outputFormat(forBus: 0)
        guard let converter = AVAudioConverter(from: sourceFormat, to: outputFormat) else {
            return nil
        }

        let ratio = outputFormat.sampleRate / sourceFormat.sampleRate
        let outputFrameCapacity = AVAudioFrameCount(Double(frameCount) * ratio)
        guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: outputFrameCapacity) else {
            return nil
        }

        var error: NSError?
        var inputConsumed = false
        let status = converter.convert(to: outputBuffer, error: &error) { inNumPackets, outStatus in
            if inputConsumed {
                outStatus.pointee = .noDataNow
                return nil
            }
            inputConsumed = true
            outStatus.pointee = .haveData
            return sourceBuffer
        }

        if status == .error || outputBuffer.frameLength == 0 {
            return nil
        }

        return outputBuffer
    }

    private func setupPlaybackEngine() {
        // Clean up existing engine
        playerNode?.stop()
        playbackEngine?.stop()
        playerNode = nil
        playbackEngine = nil

        // Create new engine
        let newEngine = AVAudioEngine()
        let newPlayer = AVAudioPlayerNode()

        newEngine.attach(newPlayer)

        let mixerFormat = newEngine.mainMixerNode.outputFormat(forBus: 0)
        newEngine.connect(newPlayer, to: newEngine.mainMixerNode, format: mixerFormat)

        do {
            try newEngine.start()
            playbackEngine = newEngine
            playerNode = newPlayer
            print("[V3Audio] Playback engine started at \(mixerFormat.sampleRate)Hz")
        } catch {
            print("[V3Audio] Playback engine error: \(error)")
            newPlayer.stop()
            newEngine.stop()
        }
    }

    func clearBuffer() {
        bufferLock.lock()
        audioBuffer.removeAll()
        bufferLock.unlock()
        isBuffering = true
    }

    func cleanup() {
        stopRecording()
        clearBuffer()
        playerNode?.stop()
        playbackEngine?.stop()
        playerNode = nil
        playbackEngine = nil
    }

    deinit {
        cleanup()
    }
}
