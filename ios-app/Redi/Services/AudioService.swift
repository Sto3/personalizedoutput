/**
 * AudioService.swift
 *
 * Handles microphone capture and audio playback for Redi.
 * Captures audio in PCM format for transcription and plays back TTS responses.
 */

import AVFoundation
import Combine

class AudioService: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var isRecording: Bool = false
    @Published var isPlaying: Bool = false
    @Published var audioLevel: Float = 0
    @Published var error: String?

    // MARK: - Publishers

    let audioChunkCaptured = PassthroughSubject<Data, Never>()

    // MARK: - Private Properties

    private var audioEngine: AVAudioEngine?
    private var audioPlayer: AVAudioPlayer?
    private var audioQueue: [Data] = []
    private let audioSession = AVAudioSession.sharedInstance()

    // Audio format for transcription (16kHz mono PCM)
    private let sampleRate: Double = 16000
    private let channels: AVAudioChannelCount = 1

    // Playback engine with audio processing
    private var playbackEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var eqNode: AVAudioUnitEQ?
    private var reverbNode: AVAudioUnitReverb?

    // Audio processing settings - makes voice feel "in the room"
    private let enableAudioProcessing = true
    private let warmthBoostDB: Float = 3.0        // Subtle low-mid boost
    private let reverbWetDryMix: Float = 8.0      // Very subtle room presence (0-100)

    // MARK: - Initialization

    override init() {
        super.init()
        setupAudioSession()
        if enableAudioProcessing {
            setupPlaybackEngine()
        }
    }

    // MARK: - Setup

    private func setupAudioSession() {
        do {
            // Use spokenAudio mode for highest quality voice playback
            // Options: defaultToSpeaker for loudspeaker, allowBluetooth for headphones
            try audioSession.setCategory(
                .playAndRecord,
                mode: .spokenAudio,
                options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
            )
            // Set preferred sample rate for high quality
            try audioSession.setPreferredSampleRate(44100)
            try audioSession.setActive(true)
        } catch {
            self.error = "Failed to setup audio session: \(error.localizedDescription)"
        }
    }

    /// Setup audio processing engine for warm, natural voice playback
    private func setupPlaybackEngine() {
        playbackEngine = AVAudioEngine()
        playerNode = AVAudioPlayerNode()

        guard let engine = playbackEngine, let player = playerNode else { return }

        // Create EQ for warmth (boost low-mids around 250Hz)
        eqNode = AVAudioUnitEQ(numberOfBands: 2)
        if let eq = eqNode {
            // Band 0: Warmth boost at 250Hz
            let warmthBand = eq.bands[0]
            warmthBand.filterType = .parametric
            warmthBand.frequency = 250
            warmthBand.bandwidth = 1.5
            warmthBand.gain = warmthBoostDB
            warmthBand.bypass = false

            // Band 1: Presence boost at 3kHz (clarity)
            let presenceBand = eq.bands[1]
            presenceBand.filterType = .parametric
            presenceBand.frequency = 3000
            presenceBand.bandwidth = 1.0
            presenceBand.gain = 1.5
            presenceBand.bypass = false
        }

        // Create reverb for subtle room presence
        reverbNode = AVAudioUnitReverb()
        if let reverb = reverbNode {
            reverb.loadFactoryPreset(.smallRoom)
            reverb.wetDryMix = reverbWetDryMix  // Very subtle
        }

        // Attach nodes
        engine.attach(player)
        if let eq = eqNode { engine.attach(eq) }
        if let reverb = reverbNode { engine.attach(reverb) }

        // Connect: player -> EQ -> reverb -> output
        let format = engine.outputNode.inputFormat(forBus: 0)
        if let eq = eqNode, let reverb = reverbNode {
            engine.connect(player, to: eq, format: format)
            engine.connect(eq, to: reverb, format: format)
            engine.connect(reverb, to: engine.mainMixerNode, format: format)
        } else {
            engine.connect(player, to: engine.mainMixerNode, format: format)
        }

        do {
            try engine.start()
            print("[Audio] Playback engine with processing started")
        } catch {
            print("[Audio] Failed to start playback engine: \(error)")
            // Fall back to simple playback
            playbackEngine = nil
        }
    }

    // MARK: - Recording

    func startRecording() {
        guard !isRecording else { return }

        audioEngine = AVAudioEngine()
        guard let audioEngine = audioEngine else { return }

        let inputNode = audioEngine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)

        // Create conversion format (16kHz mono)
        guard let outputFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: sampleRate, channels: channels, interleaved: true) else {
            error = "Failed to create audio format"
            return
        }

        // Install tap on input node
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { [weak self] buffer, time in
            self?.processAudioBuffer(buffer, inputFormat: inputFormat, outputFormat: outputFormat)
        }

        do {
            try audioEngine.start()
            isRecording = true
            print("[Audio] Recording started")
        } catch {
            self.error = "Failed to start recording: \(error.localizedDescription)"
        }
    }

    func stopRecording() {
        guard isRecording else { return }

        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        isRecording = false
        print("[Audio] Recording stopped")
    }

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer, inputFormat: AVAudioFormat, outputFormat: AVAudioFormat) {
        // Convert to output format if needed
        guard let converter = AVAudioConverter(from: inputFormat, to: outputFormat) else { return }

        let frameCount = AVAudioFrameCount(Double(buffer.frameLength) * sampleRate / inputFormat.sampleRate)
        guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: frameCount) else { return }

        var error: NSError?
        let inputBlock: AVAudioConverterInputBlock = { inNumPackets, outStatus in
            outStatus.pointee = .haveData
            return buffer
        }

        converter.convert(to: outputBuffer, error: &error, withInputFrom: inputBlock)

        if let error = error {
            print("[Audio] Conversion error: \(error)")
            return
        }

        // Convert to Data
        if let channelData = outputBuffer.int16ChannelData {
            let dataSize = Int(outputBuffer.frameLength) * MemoryLayout<Int16>.size
            let data = Data(bytes: channelData[0], count: dataSize)
            audioChunkCaptured.send(data)
        }

        // Update audio level
        if let floatData = buffer.floatChannelData {
            var sum: Float = 0
            for i in 0..<Int(buffer.frameLength) {
                sum += abs(floatData[0][i])
            }
            let average = sum / Float(buffer.frameLength)
            DispatchQueue.main.async { [weak self] in
                self?.audioLevel = average
            }
        }
    }

    // MARK: - Playback

    func playAudio(_ data: Data) {
        audioQueue.append(data)

        if !isPlaying {
            playNextInQueue()
        }
    }

    private func playNextInQueue() {
        guard !audioQueue.isEmpty else {
            isPlaying = false
            return
        }

        let data = audioQueue.removeFirst()

        // Try processed playback first, fall back to simple if needed
        if enableAudioProcessing, let engine = playbackEngine, let player = playerNode {
            playWithProcessing(data: data, engine: engine, player: player)
        } else {
            playSimple(data: data)
        }
    }

    /// Play with audio processing (EQ + reverb for warmth)
    private func playWithProcessing(data: Data, engine: AVAudioEngine, player: AVAudioPlayerNode) {
        do {
            // Convert MP3 data to PCM buffer
            guard let audioFile = try? AVAudioFile(forReading: createTempFile(from: data)) else {
                print("[Audio] Failed to create audio file, falling back to simple playback")
                playSimple(data: data)
                return
            }

            let format = audioFile.processingFormat
            let frameCount = UInt32(audioFile.length)
            guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
                playSimple(data: data)
                return
            }

            try audioFile.read(into: buffer)

            // Schedule and play with processing
            player.scheduleBuffer(buffer) { [weak self] in
                DispatchQueue.main.async {
                    self?.playNextInQueue()
                }
            }

            if !player.isPlaying {
                player.play()
            }
            isPlaying = true

        } catch {
            print("[Audio] Processed playback error: \(error), falling back to simple")
            playSimple(data: data)
        }
    }

    /// Simple playback without processing (fallback)
    private func playSimple(data: Data) {
        do {
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.delegate = self
            audioPlayer?.prepareToPlay()
            audioPlayer?.play()
            isPlaying = true
        } catch {
            print("[Audio] Playback error: \(error)")
            playNextInQueue()
        }
    }

    /// Create temporary file from audio data for AVAudioFile
    private func createTempFile(from data: Data) -> URL {
        let tempDir = FileManager.default.temporaryDirectory
        let tempFile = tempDir.appendingPathComponent(UUID().uuidString + ".mp3")
        try? data.write(to: tempFile)
        return tempFile
    }

    func stopPlayback() {
        audioPlayer?.stop()
        playerNode?.stop()
        audioQueue.removeAll()
        isPlaying = false
    }

    // MARK: - Cleanup

    func cleanup() {
        stopRecording()
        stopPlayback()
        playbackEngine?.stop()
        playbackEngine = nil
    }
}

// MARK: - AVAudioPlayerDelegate

extension AudioService: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        DispatchQueue.main.async { [weak self] in
            self?.playNextInQueue()
        }
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        print("[Audio] Decode error: \(error?.localizedDescription ?? "unknown")")
        DispatchQueue.main.async { [weak self] in
            self?.playNextInQueue()
        }
    }
}
