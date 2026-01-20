import Foundation
import AVFoundation

struct V6Config {
    static var serverURL: URL {
        // V6 endpoint
        return URL(string: "wss://redialways.com/ws/redi?v=6")!
    }

    struct Audio {
        static let sampleRate: Double = 24000
        static let channels: AVAudioChannelCount = 1
        static let bytesPerSample = 2
        static let bitsPerSample = 16
    }
}
