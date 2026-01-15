/**
 * Redi V3 AudioService
 *
 * Handles:
 * - Microphone capture (PCM 16-bit, 24kHz, mono)
 * - Speaker playback of AI responses
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

    var onAudioCaptured: ((Data) -> Void)?

    // Target: PCM 16-bit, 24kHz, mono (OpenAI Realtime format)
    private let targetSampleRate: Double = 24000
    private let targetChannels: AVAudioChannelCount = 1

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

        // Send to callback
        onAudioCaptured?(data)
    }

    func playAudio(_ audioData: Data) {
        guard !audioData.isEmpty else { return }

        DispatchQueue.global(qos: .userInteractive).async { [weak self] in
            self?.playAudioInternal(audioData)
        }
    }

    private func playAudioInternal(_ audioData: Data) {
        // Source format: PCM 16-bit, 24kHz, mono (from OpenAI)
        guard let sourceFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: targetSampleRate,
            channels: targetChannels,
            interleaved: true
        ) else {
            print("[V3Audio] Failed to create source format")
            return
        }

        let frameCount = UInt32(audioData.count / 2)  // 2 bytes per sample
        guard frameCount > 0,
              let sourceBuffer = AVAudioPCMBuffer(pcmFormat: sourceFormat, frameCapacity: frameCount) else {
            return
        }
        sourceBuffer.frameLength = frameCount

        // Copy audio data to buffer
        audioData.withUnsafeBytes { rawPtr in
            if let baseAddress = rawPtr.baseAddress {
                memcpy(sourceBuffer.int16ChannelData![0], baseAddress, audioData.count)
            }
        }

        // Setup playback engine if needed
        if playbackEngine == nil || playerNode == nil {
            setupPlaybackEngine()
        }

        guard let player = playerNode,
              let engine = playbackEngine else { return }

        // Convert to hardware sample rate for playback
        let outputFormat = engine.mainMixerNode.outputFormat(forBus: 0)
        guard let converter = AVAudioConverter(from: sourceFormat, to: outputFormat) else {
            print("[V3Audio] Failed to create audio converter")
            return
        }

        let ratio = outputFormat.sampleRate / sourceFormat.sampleRate
        let outputFrameCapacity = AVAudioFrameCount(Double(frameCount) * ratio)
        guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: outputFrameCapacity) else {
            print("[V3Audio] Failed to create output buffer")
            return
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
            print("[V3Audio] Conversion failed: \(error?.localizedDescription ?? "unknown")")
            return
        }

        // Schedule and play
        player.scheduleBuffer(outputBuffer) { [weak self] in
            DispatchQueue.main.async {
                self?.isPlaying = false
            }
        }

        DispatchQueue.main.async { [weak self] in
            self?.isPlaying = true
        }

        if !player.isPlaying {
            player.play()
        }
    }

    private func setupPlaybackEngine() {
        playbackEngine = AVAudioEngine()
        playerNode = AVAudioPlayerNode()

        guard let engine = playbackEngine, let player = playerNode else { return }

        engine.attach(player)

        // Connect using the mixer's native format (hardware sample rate)
        let mixerFormat = engine.mainMixerNode.outputFormat(forBus: 0)
        engine.connect(player, to: engine.mainMixerNode, format: mixerFormat)

        do {
            try engine.start()
            print("[V3Audio] Playback engine started at \(mixerFormat.sampleRate)Hz")
        } catch {
            print("[V3Audio] Playback engine error: \(error)")
        }
    }

    func cleanup() {
        stopRecording()
        playerNode?.stop()
        playbackEngine?.stop()
        playerNode = nil
        playbackEngine = nil
    }

    deinit {
        cleanup()
    }
}
