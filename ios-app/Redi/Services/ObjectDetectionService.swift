/**
 * ObjectDetectionService.swift
 *
 * YOLOv8 Object Detection for Redi
 *
 * Uses Core ML to run YOLOv8 nano model for real-time object detection.
 * Provides ground-truth object detections that prevent cloud vision hallucination.
 *
 * YOLO detects 80 COCO classes including:
 * - Household items: bottle, cup, bowl, spoon, knife, scissors, etc.
 * - Electronics: laptop, cell phone, keyboard, mouse, remote, etc.
 * - Furniture: chair, couch, bed, dining table, etc.
 * - Sports: sports ball, tennis racket, skateboard, surfboard, etc.
 * - Kitchen: oven, toaster, refrigerator, microwave, sink, etc.
 * - And many more...
 */

import Foundation
import Vision
import CoreML
import UIKit
import Combine

// MARK: - COCO Class Names

/// COCO dataset class names (80 classes) - matches YOLOv8 output order
private let cocoClassNames: [String] = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
    "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator",
    "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

/// Category mapping for mode detection
private let objectCategoryMapping: [String: String] = [
    // Gym/Sports
    "sports ball": "sports",
    "tennis racket": "sports",
    "skateboard": "sports",
    "surfboard": "sports",
    "baseball bat": "sports",
    "baseball glove": "sports",
    "skis": "sports",
    "snowboard": "sports",
    "frisbee": "sports",

    // Kitchen
    "bottle": "kitchen",
    "wine glass": "kitchen",
    "cup": "kitchen",
    "fork": "kitchen",
    "knife": "kitchen",
    "spoon": "kitchen",
    "bowl": "kitchen",
    "banana": "food",
    "apple": "food",
    "sandwich": "food",
    "orange": "food",
    "broccoli": "food",
    "carrot": "food",
    "hot dog": "food",
    "pizza": "food",
    "donut": "food",
    "cake": "food",
    "microwave": "kitchen",
    "oven": "kitchen",
    "toaster": "kitchen",
    "sink": "kitchen",
    "refrigerator": "kitchen",

    // Electronics
    "laptop": "electronics",
    "tv": "electronics",
    "remote": "electronics",
    "keyboard": "electronics",
    "cell phone": "electronics",
    "mouse": "electronics",

    // Furniture
    "chair": "furniture",
    "couch": "furniture",
    "bed": "furniture",
    "dining table": "furniture",
    "toilet": "bathroom",

    // Study/Office
    "book": "study",
    "clock": "decor",
    "vase": "decor",
    "potted plant": "decor",

    // Personal
    "backpack": "personal",
    "umbrella": "personal",
    "handbag": "personal",
    "tie": "clothing",
    "suitcase": "personal",

    // Baby/Care
    "teddy bear": "baby",
    "toothbrush": "bathroom",
    "hair drier": "bathroom",

    // Animals
    "bird": "animal",
    "cat": "animal",
    "dog": "animal",
    "horse": "animal",
    "sheep": "animal",
    "cow": "animal",
    "elephant": "animal",
    "bear": "animal",
    "zebra": "animal",
    "giraffe": "animal",

    // Person
    "person": "person",

    // Vehicles
    "bicycle": "vehicle",
    "car": "vehicle",
    "motorcycle": "vehicle",
    "airplane": "vehicle",
    "bus": "vehicle",
    "train": "vehicle",
    "truck": "vehicle",
    "boat": "vehicle"
]

// MARK: - Object Detection Service

class ObjectDetectionService: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var detectedObjects: [DetectedObject] = []
    @Published var isModelLoaded: Bool = false
    @Published var lastProcessingTimeMs: Double = 0

    // MARK: - Publishers

    let objectsDetected = PassthroughSubject<[DetectedObject], Never>()

    // MARK: - Private Properties

    private var model: VNCoreMLModel?
    private var request: VNCoreMLRequest?
    private let processingQueue = DispatchQueue(label: "yolo.detection", qos: .userInitiated)

    // Configuration
    private let confidenceThreshold: Float = 0.35  // Only include objects with >35% confidence
    private let iouThreshold: Float = 0.45         // NMS overlap threshold
    private let maxDetections: Int = 20            // Max objects to return

    // MARK: - Initialization

    override init() {
        super.init()
        loadModel()
    }

    /// Load the YOLOv8 Core ML model
    private func loadModel() {
        processingQueue.async { [weak self] in
            guard let self = self else { return }

            do {
                // Try to load the compiled model from the app bundle
                guard let modelURL = Bundle.main.url(forResource: "yolov8n", withExtension: "mlmodelc") ??
                      Bundle.main.url(forResource: "yolov8n", withExtension: "mlpackage") else {
                    print("[ObjectDetection] YOLOv8 model not found in bundle")
                    return
                }

                print("[ObjectDetection] Loading YOLOv8 model from: \(modelURL)")

                let config = MLModelConfiguration()
                config.computeUnits = .all  // Use Neural Engine if available

                let mlModel = try MLModel(contentsOf: modelURL, configuration: config)
                let visionModel = try VNCoreMLModel(for: mlModel)

                // Create the detection request
                self.request = VNCoreMLRequest(model: visionModel) { [weak self] request, error in
                    if let error = error {
                        print("[ObjectDetection] Detection error: \(error)")
                        return
                    }
                    self?.processResults(request.results)
                }

                // Configure request
                self.request?.imageCropAndScaleOption = .scaleFill
                self.model = visionModel

                DispatchQueue.main.async {
                    self.isModelLoaded = true
                    print("[ObjectDetection] YOLOv8 model loaded successfully")
                }

            } catch {
                print("[ObjectDetection] Failed to load model: \(error)")
            }
        }
    }

    // MARK: - Detection

    /// Process a camera frame for object detection
    func detectObjects(in pixelBuffer: CVPixelBuffer) {
        guard isModelLoaded, let request = request else {
            return
        }

        let startTime = CFAbsoluteTimeGetCurrent()
        
        // Create handler SYNCHRONOUSLY before async dispatch to avoid Sendable issues
        // VNImageRequestHandler retains the pixel buffer internally
        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])

        processingQueue.async { [weak self] in
            do {
                try handler.perform([request])

                let elapsed = (CFAbsoluteTimeGetCurrent() - startTime) * 1000
                DispatchQueue.main.async {
                    self?.lastProcessingTimeMs = elapsed
                }
            } catch {
                print("[ObjectDetection] Detection failed: \(error)")
            }
        }
    }

    /// Process a UIImage for object detection
    func detectObjects(in image: UIImage) {
        guard isModelLoaded, let request = request, let cgImage = image.cgImage else {
            return
        }

        let startTime = CFAbsoluteTimeGetCurrent()
        
        // Create handler SYNCHRONOUSLY before async dispatch
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

        processingQueue.async { [weak self] in
            do {
                try handler.perform([request])

                let elapsed = (CFAbsoluteTimeGetCurrent() - startTime) * 1000
                DispatchQueue.main.async {
                    self?.lastProcessingTimeMs = elapsed
                }
            } catch {
                print("[ObjectDetection] Detection failed: \(error)")
            }
        }
    }

    // MARK: - Result Processing

    private func processResults(_ results: [Any]?) {
        guard let observations = results else {
            DispatchQueue.main.async { [weak self] in
                self?.detectedObjects = []
                self?.objectsDetected.send([])
            }
            return
        }

        var detections: [DetectedObject] = []

        // Handle VNCoreMLFeatureValueObservation (raw YOLO output)
        if let featureObservations = observations as? [VNCoreMLFeatureValueObservation] {
            detections = parseYOLOOutput(featureObservations)
        }
        // Handle VNRecognizedObjectObservation (if model outputs this format)
        else if let objectObservations = observations as? [VNRecognizedObjectObservation] {
            for observation in objectObservations {
                guard observation.confidence >= confidenceThreshold else { continue }

                if let topLabel = observation.labels.first {
                    let detection = DetectedObject(
                        label: topLabel.identifier,
                        confidence: observation.confidence,
                        boundingBox: observation.boundingBox,
                        category: objectCategoryMapping[topLabel.identifier] ?? "other"
                    )
                    detections.append(detection)
                }
            }
        }
        // Handle VNClassificationObservation (if model outputs classifications)
        else if let classificationObservations = observations as? [VNClassificationObservation] {
            for observation in classificationObservations.prefix(maxDetections) {
                guard observation.confidence >= confidenceThreshold else { continue }

                let detection = DetectedObject(
                    label: observation.identifier,
                    confidence: observation.confidence,
                    boundingBox: CGRect(x: 0, y: 0, width: 1, height: 1),  // No bounding box for classification
                    category: objectCategoryMapping[observation.identifier] ?? "other"
                )
                detections.append(detection)
            }
        }

        // Sort by confidence and limit
        detections.sort { $0.confidence > $1.confidence }
        detections = Array(detections.prefix(maxDetections))

        DispatchQueue.main.async { [weak self] in
            self?.detectedObjects = detections
            self?.objectsDetected.send(detections)

            if !detections.isEmpty {
                let objectNames = detections.map { "\($0.label)(\(Int($0.confidence * 100))%)" }.joined(separator: ", ")
                print("[ObjectDetection] Detected: \(objectNames)")
            }
        }
    }

    /// Parse raw YOLO output format
    /// YOLO outputs: [batch, 84, 8400] where 84 = 4 (bbox) + 80 (classes)
    private func parseYOLOOutput(_ observations: [VNCoreMLFeatureValueObservation]) -> [DetectedObject] {
        guard let firstObservation = observations.first,
              let multiArray = firstObservation.featureValue.multiArrayValue else {
            return []
        }

        var detections: [DetectedObject] = []

        // YOLOv8 output shape: [1, 84, 8400]
        // 84 = 4 (x_center, y_center, width, height) + 80 (class probabilities)
        // 8400 = number of anchor boxes

        let shape = multiArray.shape
        guard shape.count >= 2 else { return [] }

        let numClasses = 80
        let numBoxes = shape.last!.intValue

        // Get pointer to data
        let dataPointer = multiArray.dataPointer.bindMemory(to: Float.self, capacity: multiArray.count)

        // Stride for accessing the transposed output
        let stride = numBoxes

        for boxIdx in 0..<numBoxes {
            // Get bounding box (first 4 values)
            let xCenter = CGFloat(dataPointer[0 * stride + boxIdx])
            let yCenter = CGFloat(dataPointer[1 * stride + boxIdx])
            let width = CGFloat(dataPointer[2 * stride + boxIdx])
            let height = CGFloat(dataPointer[3 * stride + boxIdx])

            // Find best class
            var maxProb: Float = 0
            var maxClass: Int = 0

            for classIdx in 0..<numClasses {
                let prob = dataPointer[(4 + classIdx) * stride + boxIdx]
                if prob > maxProb {
                    maxProb = prob
                    maxClass = classIdx
                }
            }

            guard maxProb >= confidenceThreshold else { continue }
            guard maxClass < cocoClassNames.count else { continue }

            // Convert from center/size to corner format and normalize to 0-1
            let x = xCenter - width / 2
            let y = yCenter - height / 2

            // Clamp to valid range
            let boundingBox = CGRect(
                x: max(0, min(1, x)),
                y: max(0, min(1, y)),
                width: max(0, min(1 - max(0, x), width)),
                height: max(0, min(1 - max(0, y), height))
            )

            let label = cocoClassNames[maxClass]
            let detection = DetectedObject(
                label: label,
                confidence: maxProb,
                boundingBox: boundingBox,
                category: objectCategoryMapping[label] ?? "other"
            )

            detections.append(detection)
        }

        // Apply Non-Maximum Suppression
        return applyNMS(detections)
    }

    /// Non-Maximum Suppression to remove overlapping detections
    private func applyNMS(_ detections: [DetectedObject]) -> [DetectedObject] {
        guard !detections.isEmpty else { return [] }

        // Sort by confidence
        var sorted = detections.sorted { $0.confidence > $1.confidence }
        var selected: [DetectedObject] = []

        while !sorted.isEmpty {
            let best = sorted.removeFirst()
            selected.append(best)

            // Remove overlapping boxes
            sorted = sorted.filter { detection in
                let iou = calculateIOU(best.boundingBox, detection.boundingBox)
                return iou < iouThreshold || detection.label != best.label
            }
        }

        return selected
    }

    /// Calculate Intersection over Union
    private func calculateIOU(_ box1: CGRect, _ box2: CGRect) -> Float {
        let intersection = box1.intersection(box2)
        if intersection.isNull { return 0 }

        let intersectionArea = intersection.width * intersection.height
        let unionArea = box1.width * box1.height + box2.width * box2.height - intersectionArea

        return Float(intersectionArea / unionArea)
    }

    // MARK: - Utility

    /// Get labels of all detected objects
    func getDetectedLabels() -> [String] {
        return detectedObjects.map { $0.label }
    }

    /// Check if a specific object type is detected
    func isObjectDetected(_ label: String) -> Bool {
        return detectedObjects.contains { $0.label.lowercased() == label.lowercased() }
    }

    /// Get objects of a specific category
    func getObjectsInCategory(_ category: String) -> [DetectedObject] {
        return detectedObjects.filter { $0.category == category }
    }
}
