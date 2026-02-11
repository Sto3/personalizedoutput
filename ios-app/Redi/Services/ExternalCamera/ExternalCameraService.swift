/**
 * ExternalCameraService.swift
 *
 * Support for external RTSP/IP cameras (Tapo C200/C225, etc).
 * For MVP: periodic JPEG snapshots via HTTP endpoint.
 */

import Foundation
import UIKit

class ExternalCameraService: ObservableObject {
    @Published var cameras: [ExternalCamera] = []
    @Published var isConnected = false

    struct ExternalCamera: Identifiable, Codable {
        var id: String { "\(ip):\(port)" }
        var name: String
        var ip: String
        var port: Int
        var username: String
        var password: String
        var snapshotPath: String  // e.g., "/snapshot.jpg"
        var isActive: Bool
    }

    private var captureTimers: [String: Timer] = [:]
    var onFrameCaptured: ((Data, String) -> Void)?  // (imageData, cameraId)

    init() {
        loadSavedCameras()
    }

    func addCamera(_ camera: ExternalCamera) {
        cameras.append(camera)
        saveCameras()
    }

    func removeCamera(id: String) {
        stopCapture(cameraId: id)
        cameras.removeAll { $0.id == id }
        saveCameras()
    }

    func testConnection(_ camera: ExternalCamera, completion: @escaping (Bool) -> Void) {
        let urlString = "http://\(camera.username):\(camera.password)@\(camera.ip):\(camera.port)\(camera.snapshotPath)"
        guard let url = URL(string: urlString) else {
            completion(false)
            return
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 5

        URLSession.shared.dataTask(with: request) { data, response, error in
            let success = error == nil && data != nil && (response as? HTTPURLResponse)?.statusCode == 200
            DispatchQueue.main.async { completion(success) }
        }.resume()
    }

    func startCapture(cameraId: String, interval: TimeInterval = 3.0) {
        guard let camera = cameras.first(where: { $0.id == cameraId }) else { return }

        let timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            self?.captureSnapshot(camera: camera)
        }
        captureTimers[cameraId] = timer
        isConnected = true
    }

    func stopCapture(cameraId: String) {
        captureTimers[cameraId]?.invalidate()
        captureTimers.removeValue(forKey: cameraId)
        if captureTimers.isEmpty { isConnected = false }
    }

    private func captureSnapshot(camera: ExternalCamera) {
        let urlString = "http://\(camera.username):\(camera.password)@\(camera.ip):\(camera.port)\(camera.snapshotPath)"
        guard let url = URL(string: urlString) else { return }

        URLSession.shared.dataTask(with: url) { [weak self] data, _, error in
            guard let data = data, error == nil else { return }

            // Downscale if needed
            if let image = UIImage(data: data) {
                let maxDim: CGFloat = 640
                let scale = min(maxDim / image.size.width, maxDim / image.size.height, 1.0)
                let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

                UIGraphicsBeginImageContextWithOptions(newSize, true, 1.0)
                image.draw(in: CGRect(origin: .zero, size: newSize))
                let resized = UIGraphicsGetImageFromCurrentImageContext()
                UIGraphicsEndImageContext()

                if let jpegData = resized?.jpegData(compressionQuality: 0.7) {
                    self?.onFrameCaptured?(jpegData, camera.id)
                }
            }
        }.resume()
    }

    private func saveCameras() {
        if let data = try? JSONEncoder().encode(cameras) {
            UserDefaults.standard.set(data, forKey: "externalCameras")
        }
    }

    private func loadSavedCameras() {
        if let data = UserDefaults.standard.data(forKey: "externalCameras"),
           let saved = try? JSONDecoder().decode([ExternalCamera].self, from: data) {
            cameras = saved
        }
    }
}
