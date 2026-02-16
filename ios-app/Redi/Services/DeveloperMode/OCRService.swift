/**
 * OCRService.swift
 *
 * On-device text extraction using Apple Vision framework (free, no API cost).
 * When text is extracted, we send TEXT to the LLM instead of IMAGE,
 * cutting vision API costs by ~90% for text-heavy screens.
 */

import Vision
import UIKit

class OCRService {

    /// Extract text from an image using Apple's on-device Vision framework
    static func extractText(from image: UIImage, completion: @escaping (String?) -> Void) {
        guard let cgImage = image.cgImage else {
            completion(nil)
            return
        }

        let request = VNRecognizeTextRequest { request, error in
            guard let observations = request.results as? [VNRecognizedTextObservation] else {
                completion(nil)
                return
            }

            let text = observations.compactMap { observation in
                observation.topCandidates(1).first?.string
            }.joined(separator: "\n")

            completion(text.isEmpty ? nil : text)
        }

        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        DispatchQueue.global(qos: .userInitiated).async {
            try? handler.perform([request])
        }
    }

    /// Determine if a frame is text-heavy (should use OCR) or visual (should use vision API)
    static func isTextHeavy(image: UIImage, completion: @escaping (Bool) -> Void) {
        guard let cgImage = image.cgImage else {
            completion(false)
            return
        }

        let request = VNRecognizeTextRequest { request, error in
            guard let observations = request.results as? [VNRecognizedTextObservation] else {
                completion(false)
                return
            }

            let totalArea = CGFloat(cgImage.width * cgImage.height)
            let textArea = observations.reduce(CGFloat(0)) { sum, obs in
                let box = obs.boundingBox
                return sum + (box.width * box.height * totalArea)
            }

            let ratio = textArea / totalArea
            completion(ratio > 0.15)  // 15% text coverage = text-heavy screen
        }

        request.recognitionLevel = .fast

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        DispatchQueue.global(qos: .userInitiated).async {
            try? handler.perform([request])
        }
    }
}
