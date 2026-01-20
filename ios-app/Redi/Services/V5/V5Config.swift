import Foundation
import AVFoundation

struct V5Config {
    static var serverURL: URL {
        return URL(string: "wss://redialways.com/ws/redi?v=7")!
    }

    struct Audio {
        static let sampleRate: Double = 24000
        static let channels: AVAudioChannelCount = 1
        static let bytesPerSample = 2
        static let bitsPerSample = 16
        static let recordingBufferSize: AVAudioFrameCount = 4800
        static let playbackChunkSize = 9600
        static let minPlaybackBuffer = 1200
    }

    struct Camera {
        static let staticFrameInterval: TimeInterval = 5.0
        static let motionFrameInterval: TimeInterval = 0.25
        static let maxDimension: CGFloat = 768  // Higher for better OCR
        static let compressionQuality: CGFloat = 0.85  // Higher quality
    }
}
