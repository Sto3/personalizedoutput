import AVFoundation
import Combine

class V5AudioService: ObservableObject {
    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var playbackEngine: AVAudioEngine?
    private var inputFormat: AVAudioFormat?
    private var outputFormat: AVAudioFormat?

    @Published var isRecording = false
    @Published var isPlaying = false
    @Published var isMicMuted = false

    var onAudioCaptured: ((Data) -> Void)?

    private let targetSampleRate: Double = 24000
    private let targetChannels: AVAudioChannelCount = 1

    private var audioBuffer = Data()
    private let bufferLock = NSLock()
    private var isBuffering = true
    private let minBufferSize = 1200

    init() { setupAudioSession() }

    private func setupAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers])
            try session.setPreferredSampleRate(targetSampleRate)
            try session.setPreferredIOBufferDuration(0.005)
            try session.setActive(true)
            print("[V5Audio] Session configured")
        } catch {
            print("[V5Audio] Session error: \(error)")
        }
    }

    func startRecording() {
        guard !isRecording else { return }
        do {
            audioEngine = AVAudioEngine()
            guard let engine = audioEngine else { return }
            let inputNode = engine.inputNode
            try? inputNode.setVoiceProcessingEnabled(true)
            inputFormat = inputNode.outputFormat(forBus: 0)
            outputFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: targetSampleRate, channels: targetChannels, interleaved: true)
            guard let outputFmt = outputFormat else { return }
            inputNode.installTap(onBus: 0, bufferSize: 4800, format: inputFormat) { [weak self] buffer, _ in
                self?.processAudioBuffer(buffer)
            }
            try engine.start()
            DispatchQueue.main.async { self.isRecording = true }
        } catch {
            print("[V5Audio] Recording error: \(error)")
        }
    }

    func stopRecording() {
        guard isRecording else { return }
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        DispatchQueue.main.async { self.isRecording = false }
    }

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let inputFmt = inputFormat, let outputFmt = outputFormat, !isMicMuted else { return }
        guard let converter = AVAudioConverter(from: inputFmt, to: outputFmt) else { return }
        let ratio = outputFmt.sampleRate / inputFmt.sampleRate
        let outputCapacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio)
        guard outputCapacity > 0, let convertedBuffer = AVAudioPCMBuffer(pcmFormat: outputFmt, frameCapacity: outputCapacity) else { return }
        var error: NSError?
        var consumed = false
        let status = converter.convert(to: convertedBuffer, error: &error) { _, outStatus in
            if consumed { outStatus.pointee = .noDataNow; return nil }
            consumed = true
            outStatus.pointee = .haveData
            return buffer
        }
        if status == .error { return }
        guard convertedBuffer.frameLength > 0, let channelData = convertedBuffer.int16ChannelData else { return }
        let byteCount = Int(convertedBuffer.frameLength) * 2
        let data = Data(bytes: channelData[0], count: byteCount)
        onAudioCaptured?(data)
    }

    func playAudio(_ audioData: Data) {
        guard !audioData.isEmpty else { return }
        bufferLock.lock()
        audioBuffer.append(audioData)
        let currentSize = audioBuffer.count
        bufferLock.unlock()
        if isBuffering && currentSize >= minBufferSize {
            isBuffering = false
            startContinuousPlayback()
        }
    }

    private func startContinuousPlayback() {
        if playbackEngine == nil || playerNode == nil { setupPlaybackEngine() }
        guard let player = playerNode else { return }
        if !player.isPlaying { player.play() }
        DispatchQueue.main.async { self.isPlaying = true }
        scheduleNextChunk()
    }

    private func scheduleNextChunk() {
        guard let player = playerNode, let engine = playbackEngine else { return }
        bufferLock.lock()
        let chunkSize = min(audioBuffer.count, 9600)
        guard chunkSize > 0 else {
            bufferLock.unlock()
            DispatchQueue.main.async { self.isPlaying = false }
            isBuffering = true
            return
        }
        let chunk = audioBuffer.prefix(chunkSize)
        audioBuffer.removeFirst(chunkSize)
        bufferLock.unlock()
        guard let outputBuffer = convertToPlaybackBuffer(Data(chunk), engine: engine) else {
            DispatchQueue.global(qos: .userInteractive).async { [weak self] in self?.scheduleNextChunk() }
            return
        }
        player.scheduleBuffer(outputBuffer) { [weak self] in
            DispatchQueue.global(qos: .userInteractive).async { self?.scheduleNextChunk() }
        }
    }

    private func convertToPlaybackBuffer(_ audioData: Data, engine: AVAudioEngine) -> AVAudioPCMBuffer? {
        guard let sourceFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: targetSampleRate, channels: targetChannels, interleaved: true) else { return nil }
        let frameCount = UInt32(audioData.count / 2)
        guard frameCount > 0, let sourceBuffer = AVAudioPCMBuffer(pcmFormat: sourceFormat, frameCapacity: frameCount) else { return nil }
        sourceBuffer.frameLength = frameCount
        guard let channelData = sourceBuffer.int16ChannelData else { return nil }
        audioData.withUnsafeBytes { rawPtr in
            if let baseAddress = rawPtr.baseAddress { memcpy(channelData[0], baseAddress, audioData.count) }
        }
        let outputFormat = engine.mainMixerNode.outputFormat(forBus: 0)
        guard let converter = AVAudioConverter(from: sourceFormat, to: outputFormat) else { return nil }
        let ratio = outputFormat.sampleRate / sourceFormat.sampleRate
        let outputCapacity = AVAudioFrameCount(Double(frameCount) * ratio)
        guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: outputCapacity) else { return nil }
        var error: NSError?
        var consumed = false
        let status = converter.convert(to: outputBuffer, error: &error) { _, outStatus in
            if consumed { outStatus.pointee = .noDataNow; return nil }
            consumed = true
            outStatus.pointee = .haveData
            return sourceBuffer
        }
        if status == .error || outputBuffer.frameLength == 0 { return nil }
        return outputBuffer
    }

    private func setupPlaybackEngine() {
        playerNode?.stop()
        playbackEngine?.stop()
        let engine = AVAudioEngine()
        let player = AVAudioPlayerNode()
        engine.attach(player)
        let mixerFormat = engine.mainMixerNode.outputFormat(forBus: 0)
        engine.connect(player, to: engine.mainMixerNode, format: mixerFormat)
        do {
            try engine.start()
            playbackEngine = engine
            playerNode = player
        } catch {
            print("[V5Audio] Playback error: \(error)")
        }
    }

    func clearBuffer() {
        bufferLock.lock()
        audioBuffer.removeAll()
        bufferLock.unlock()
        isBuffering = true
    }

    func stopAudio() {
        playerNode?.stop()
        clearBuffer()
        DispatchQueue.main.async { self.isPlaying = false }
    }

    func cleanup() {
        stopRecording()
        clearBuffer()
        playerNode?.stop()
        playbackEngine?.stop()

        // CRITICAL: Release the audio session so microphone indicator turns off
        do {
            try AVAudioSession.sharedInstance().setActive(false)
        } catch {
            print("[V5Audio] Failed to deactivate session: \(error)")
        }
    }

    deinit { cleanup() }
}
