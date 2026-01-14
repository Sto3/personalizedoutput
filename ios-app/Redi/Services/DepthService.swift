/**
 * DepthService.swift
 *
 * LiDAR Depth Integration for spatial awareness.
 * Only available on iPhone 12 Pro and later with LiDAR scanner.
 *
 * IMPACT: Enables responses like "The barbell is 3 feet away" or
 * "Move 6 inches closer". Niche feature - most devices don't have LiDAR.
 * Nice for Pro iPhone users but not critical for launch.
 */

import ARKit
import Combine

// MARK: - Depth Data Model

struct DepthData: Codable {
    /// Distance to center of frame in meters
    let centerDistance: Float?

    /// Distance to nearest detected object in meters
    let nearestObjectDistance: Float?

    /// Whether LiDAR is available on this device
    let available: Bool

    /// Confidence level of depth measurement (0-1)
    let confidence: Float

    /// Timestamp
    let timestamp: TimeInterval
}

// MARK: - Depth Service

class DepthService: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var isAvailable: Bool = false
    @Published var currentDepth: DepthData?
    @Published var error: String?

    // MARK: - Publishers

    let depthUpdated = PassthroughSubject<DepthData, Never>()

    // MARK: - Private Properties

    private var arSession: ARSession?
    private var isRunning = false

    // MARK: - Initialization

    override init() {
        super.init()
        checkAvailability()
    }

    // MARK: - Availability Check

    private func checkAvailability() {
        // Check if device supports scene depth (requires LiDAR)
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
            isAvailable = true
            print("[Depth] LiDAR available on this device")
        } else {
            isAvailable = false
            print("[Depth] LiDAR not available - depth features disabled")
        }
    }

    // MARK: - Start/Stop

    func start() {
        guard isAvailable else {
            print("[Depth] Cannot start - LiDAR not available")
            return
        }

        guard !isRunning else { return }

        arSession = ARSession()
        arSession?.delegate = self

        let config = ARWorldTrackingConfiguration()
        config.frameSemantics = .sceneDepth

        arSession?.run(config)
        isRunning = true
        print("[Depth] LiDAR depth capture started")
    }

    func stop() {
        arSession?.pause()
        arSession = nil
        isRunning = false
        print("[Depth] LiDAR depth capture stopped")
    }

    // MARK: - Depth Analysis

    private func analyzeDepth(from frame: ARFrame) {
        guard let depthData = frame.sceneDepth else { return }

        let depthMap = depthData.depthMap
        let confidenceMap = depthData.confidenceMap

        // Get depth at center of frame
        let centerDistance = getDepthAtPoint(depthMap, point: CGPoint(x: 0.5, y: 0.5))

        // Find nearest object
        let nearestDistance = findNearestObjectDistance(depthMap)

        // Calculate average confidence
        let avgConfidence = calculateAverageConfidence(confidenceMap)

        let data = DepthData(
            centerDistance: centerDistance,
            nearestObjectDistance: nearestDistance,
            available: true,
            confidence: avgConfidence,
            timestamp: Date().timeIntervalSince1970 * 1000
        )

        DispatchQueue.main.async { [weak self] in
            self?.currentDepth = data
            self?.depthUpdated.send(data)
        }
    }

    private func getDepthAtPoint(_ depthMap: CVPixelBuffer, point: CGPoint) -> Float? {
        CVPixelBufferLockBaseAddress(depthMap, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(depthMap, .readOnly) }

        let width = CVPixelBufferGetWidth(depthMap)
        let height = CVPixelBufferGetHeight(depthMap)

        let x = Int(point.x * CGFloat(width))
        let y = Int(point.y * CGFloat(height))

        guard x >= 0 && x < width && y >= 0 && y < height else { return nil }

        guard let baseAddress = CVPixelBufferGetBaseAddress(depthMap) else { return nil }
        let buffer = baseAddress.assumingMemoryBound(to: Float32.self)

        let depth = buffer[y * width + x]

        // Filter out invalid values
        if depth.isNaN || depth.isInfinite || depth <= 0 || depth > 10 {
            return nil
        }

        return depth
    }

    private func findNearestObjectDistance(_ depthMap: CVPixelBuffer) -> Float? {
        CVPixelBufferLockBaseAddress(depthMap, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(depthMap, .readOnly) }

        let width = CVPixelBufferGetWidth(depthMap)
        let height = CVPixelBufferGetHeight(depthMap)

        guard let baseAddress = CVPixelBufferGetBaseAddress(depthMap) else { return nil }
        let buffer = baseAddress.assumingMemoryBound(to: Float32.self)

        var minDistance: Float = Float.greatestFiniteMagnitude

        // Sample every 10th pixel for performance
        let step = 10
        for y in stride(from: 0, to: height, by: step) {
            for x in stride(from: 0, to: width, by: step) {
                let depth = buffer[y * width + x]
                if !depth.isNaN && !depth.isInfinite && depth > 0.1 && depth < minDistance {
                    minDistance = depth
                }
            }
        }

        return minDistance < Float.greatestFiniteMagnitude ? minDistance : nil
    }

    private func calculateAverageConfidence(_ confidenceMap: CVPixelBuffer?) -> Float {
        guard let confidenceMap = confidenceMap else { return 0.5 }

        CVPixelBufferLockBaseAddress(confidenceMap, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(confidenceMap, .readOnly) }

        let width = CVPixelBufferGetWidth(confidenceMap)
        let height = CVPixelBufferGetHeight(confidenceMap)

        guard let baseAddress = CVPixelBufferGetBaseAddress(confidenceMap) else { return 0.5 }
        let buffer = baseAddress.assumingMemoryBound(to: UInt8.self)

        var total: Int = 0
        var count: Int = 0

        // Sample every 20th pixel
        let step = 20
        for y in stride(from: 0, to: height, by: step) {
            for x in stride(from: 0, to: width, by: step) {
                // ARConfidenceLevel: 0 = low, 1 = medium, 2 = high
                total += Int(buffer[y * width + x])
                count += 1
            }
        }

        guard count > 0 else { return 0.5 }

        // Convert to 0-1 range (max confidence level is 2)
        return Float(total) / Float(count * 2)
    }

    // MARK: - Utility Methods

    /// Convert meters to human-readable distance string
    static func formatDistance(_ meters: Float) -> String {
        if meters < 0.3 {
            let inches = Int(meters * 39.37)
            return "\(inches) inches"
        } else if meters < 1.0 {
            let feet = meters * 3.281
            return String(format: "%.1f feet", feet)
        } else {
            let feet = Int(meters * 3.281)
            return "\(feet) feet"
        }
    }

    /// Get unavailable placeholder data
    static func unavailableData() -> DepthData {
        return DepthData(
            centerDistance: nil,
            nearestObjectDistance: nil,
            available: false,
            confidence: 0,
            timestamp: Date().timeIntervalSince1970 * 1000
        )
    }
}

// MARK: - ARSessionDelegate

extension DepthService: ARSessionDelegate {
    func session(_ session: ARSession, didUpdate frame: ARFrame) {
        analyzeDepth(from: frame)
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        DispatchQueue.main.async { [weak self] in
            self?.error = error.localizedDescription
        }
        print("[Depth] ARSession error: \(error.localizedDescription)")
    }
}
