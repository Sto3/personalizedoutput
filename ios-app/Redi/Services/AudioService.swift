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

    // MARK: - Initialization

    override init() {
        super.init()
        setupAudioSession()
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

    func stopPlayback() {
        audioPlayer?.stop()
        audioQueue.removeAll()
        isPlaying = false
    }

    // MARK: - Cleanup

    func cleanup() {
        stopRecording()
        stopPlayback()
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
