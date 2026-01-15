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

class AudioService: ObservableObject {
    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var inputFormat: AVAudioFormat?
    private var outputFormat: AVAudioFormat?

    @Published var isRecording = false
    @Published var isPlaying = false

    var onAudioCaptured: ((Data) -> Void)?

    // Buffer for accumulating audio samples
    private var audioBuffer = Data()
    private let bufferLock = NSLock()

    // Target: PCM 16-bit, 24kHz, mono (OpenAI Realtime format)
    private let targetSampleRate: Double = 24000
    private let targetChannels: AVAudioChannelCount = 1

    init() {
        setupAudioSession()
    }

    private func setupAudioSession() {
        let audioSession = AVAudioSession.sharedInstance()

        do {
            try audioSession.setCategory(.playAndRecord, mode: .default, options: [
                .defaultToSpeaker,
                .allowBluetooth,
                .mixWithOthers
            ])
            try audioSession.setPreferredSampleRate(targetSampleRate)
            try audioSession.setActive(true)
            print("[AudioService] Audio session configured")
        } catch {
            print("[AudioService] Audio session setup error: \(error)")
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
                print("[AudioService] Failed to create output format")
                return
            }

            // Install tap on input node
            inputNode.installTap(onBus: 0, bufferSize: 2400, format: inputFormat) { [weak self] buffer, time in
                self?.processAudioBuffer(buffer)
            }

            try audioEngine.start()
            isRecording = true
            print("[AudioService] Recording started")

        } catch {
            print("[AudioService] Recording start error: \(error)")
        }
    }

    func stopRecording() {
        guard isRecording else { return }

        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        isRecording = false
        print("[AudioService] Recording stopped")
    }

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let inputFormat = inputFormat,
              let outputFormat = outputFormat else { return }

        // Convert to target format
        guard let converter = AVAudioConverter(from: inputFormat, to: outputFormat) else {
            print("[AudioService] Failed to create converter")
            return
        }

        // Calculate output frame capacity
        let ratio = outputFormat.sampleRate / inputFormat.sampleRate
        let outputFrameCapacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio)

        guard let convertedBuffer = AVAudioPCMBuffer(
            pcmFormat: outputFormat,
            frameCapacity: outputFrameCapacity
        ) else { return }

        var error: NSError?
        let status = converter.convert(to: convertedBuffer, error: &error) { inNumPackets, outStatus in
            outStatus.pointee = .haveData
            return buffer
        }

        if status == .error {
            print("[AudioService] Conversion error: \(error?.localizedDescription ?? "unknown")")
            return
        }

        // Extract raw PCM data
        guard let channelData = convertedBuffer.int16ChannelData else { return }
        let dataSize = Int(convertedBuffer.frameLength) * 2  // 2 bytes per sample
        let data = Data(bytes: channelData[0], count: dataSize)

        // Send to callback
        DispatchQueue.main.async { [weak self] in
            self?.onAudioCaptured?(data)
        }
    }

    func playAudio(_ audioData: Data) {
        guard !audioData.isEmpty else { return }

        DispatchQueue.global(qos: .userInteractive).async { [weak self] in
            self?.playAudioInternal(audioData)
        }
    }

    private func playAudioInternal(_ audioData: Data) {
        guard let format = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: targetSampleRate,
            channels: targetChannels,
            interleaved: true
        ) else {
            print("[AudioService] Failed to create playback format")
            return
        }

        let frameCount = UInt32(audioData.count / 2)  // 2 bytes per sample
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
            print("[AudioService] Failed to create playback buffer")
            return
        }
        buffer.frameLength = frameCount

        // Copy audio data to buffer
        audioData.withUnsafeBytes { rawPtr in
            if let baseAddress = rawPtr.baseAddress {
                memcpy(buffer.int16ChannelData![0], baseAddress, audioData.count)
            }
        }

        // Setup player if needed
        if playerNode == nil {
            setupPlayer(format: format)
        }

        // Schedule and play
        playerNode?.scheduleBuffer(buffer) { [weak self] in
            DispatchQueue.main.async {
                self?.isPlaying = false
            }
        }

        DispatchQueue.main.async { [weak self] in
            self?.isPlaying = true
        }

        if playerNode?.isPlaying == false {
            playerNode?.play()
        }
    }

    private func setupPlayer(format: AVAudioFormat) {
        guard let audioEngine = audioEngine else {
            // Create a new engine for playback if recording engine isn't available
            let engine = AVAudioEngine()
            let player = AVAudioPlayerNode()

            engine.attach(player)
            engine.connect(player, to: engine.mainMixerNode, format: format)

            do {
                try engine.start()
                self.playerNode = player
                print("[AudioService] Playback engine started")
            } catch {
                print("[AudioService] Playback engine start error: \(error)")
            }
            return
        }

        // Use existing engine
        let player = AVAudioPlayerNode()
        audioEngine.attach(player)
        audioEngine.connect(player, to: audioEngine.mainMixerNode, format: format)
        playerNode = player
    }

    func cleanup() {
        stopRecording()
        playerNode?.stop()
        playerNode = nil
    }
}
