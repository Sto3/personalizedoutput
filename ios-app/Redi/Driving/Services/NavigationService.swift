/**
 * NavigationService.swift
 *
 * MapKit-based navigation with conversational turn-by-turn directions.
 * Proactively announces turns without user prompting - Redi's presence paradigm.
 */

import MapKit
import CoreLocation

class NavigationService: NSObject, ObservableObject {
    @Published var currentRoute: MKRoute?
    @Published var currentStepIndex: Int = 0
    @Published var nextInstruction: String?
    @Published var distanceToNextStep: CLLocationDistance = 0
    @Published var isNavigating: Bool = false
    @Published var eta: Date?

    private let locationManager = CLLocationManager()
    private var steps: [MKRoute.Step] = []

    // Distance thresholds for announcements
    private let farAnnouncementDistance: CLLocationDistance = 800    // "In half a mile..."
    private let nearAnnouncementDistance: CLLocationDistance = 150   // "In 400 feet..."
    private let immediateAnnouncementDistance: CLLocationDistance = 30 // "Turn now"

    private var announcedFar = false
    private var announcedNear = false
    private var announcedImmediate = false

    var onInstructionReady: ((String) -> Void)?
    var onDestinationReached: (() -> Void)?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        locationManager.requestWhenInUseAuthorization()
    }

    // MARK: - Public Methods

    func startNavigation(to destination: MKMapItem) {
        let request = MKDirections.Request()
        request.source = MKMapItem.forCurrentLocation()
        request.destination = destination
        request.transportType = .automobile

        let directions = MKDirections(request: request)
        directions.calculate { [weak self] response, error in
            guard let self = self, let route = response?.routes.first else {
                print("[Navigation] Failed to get route: \(error?.localizedDescription ?? "unknown")")
                self?.onInstructionReady?("I couldn't find a route to that location.")
                return
            }

            DispatchQueue.main.async {
                self.currentRoute = route
                self.steps = route.steps.filter { !$0.instructions.isEmpty }
                self.currentStepIndex = 0
                self.isNavigating = true
                self.eta = Date().addingTimeInterval(route.expectedTravelTime)
                self.locationManager.startUpdatingLocation()

                // Announce route summary
                let distance = self.formatDistance(route.distance)
                let time = self.formatDuration(route.expectedTravelTime)
                self.onInstructionReady?("Route found. \(distance), about \(time).")

                // Announce first instruction after a short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    if let firstStep = self.steps.first {
                        self.announceInstruction("In \(self.formatDistance(firstStep.distance)), \(firstStep.instructions.lowercased())")
                    }
                }
            }
        }
    }

    func stopNavigation() {
        isNavigating = false
        locationManager.stopUpdatingLocation()
        currentRoute = nil
        steps = []
        currentStepIndex = 0
        eta = nil
    }

    func searchDestination(query: String, completion: @escaping ([MKMapItem]) -> Void) {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.region = MKCoordinateRegion(
            center: locationManager.location?.coordinate ?? CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
            latitudinalMeters: 50000,
            longitudinalMeters: 50000
        )

        let search = MKLocalSearch(request: request)
        search.start { response, error in
            DispatchQueue.main.async {
                completion(response?.mapItems ?? [])
            }
        }
    }

    // MARK: - Private Methods

    private func announceInstruction(_ instruction: String) {
        nextInstruction = instruction
        onInstructionReady?(instruction)
    }

    private func formatDistance(_ meters: CLLocationDistance) -> String {
        let miles = meters / 1609.34
        if miles >= 1.0 {
            return String(format: "%.1f miles", miles)
        } else if miles >= 0.4 {
            return "half a mile"
        } else {
            let feet = Int(meters * 3.28084)
            return "\(feet) feet"
        }
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let minutes = Int(seconds / 60)
        if minutes >= 60 {
            let hours = minutes / 60
            let remainingMinutes = minutes % 60
            if remainingMinutes == 0 {
                return "\(hours) hour\(hours > 1 ? "s" : "")"
            }
            return "\(hours) hour\(hours > 1 ? "s" : "") \(remainingMinutes) minutes"
        }
        return "\(minutes) minutes"
    }

    private func checkForAnnouncement(distance: CLLocationDistance, step: MKRoute.Step) {
        if distance <= immediateAnnouncementDistance && !announcedImmediate {
            announceInstruction(step.instructions)
            announcedImmediate = true
        } else if distance <= nearAnnouncementDistance && !announcedNear {
            let distanceText = formatDistance(distance)
            announceInstruction("In \(distanceText), \(step.instructions.lowercased())")
            announcedNear = true
        } else if distance <= farAnnouncementDistance && !announcedFar {
            let distanceText = formatDistance(distance)
            announceInstruction("In \(distanceText), \(step.instructions.lowercased())")
            announcedFar = true
        }
    }

    private func advanceToNextStep() {
        currentStepIndex += 1
        announcedFar = false
        announcedNear = false
        announcedImmediate = false

        if currentStepIndex >= steps.count {
            announceInstruction("You have arrived at your destination.")
            onDestinationReached?()
            stopNavigation()
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension NavigationService: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard isNavigating,
              let location = locations.last,
              currentStepIndex < steps.count else { return }

        let currentStep = steps[currentStepIndex]

        // Calculate distance to end of current step
        let pointCount = currentStep.polyline.pointCount
        guard pointCount > 0 else { return }

        let stepEndPoint = currentStep.polyline.points()[pointCount - 1]
        let stepEndLocation = CLLocation(
            latitude: stepEndPoint.coordinate.latitude,
            longitude: stepEndPoint.coordinate.longitude
        )

        let distance = location.distance(from: stepEndLocation)
        distanceToNextStep = distance

        // Check if we should announce
        checkForAnnouncement(distance: distance, step: currentStep)

        // Check if we've completed this step
        if distance < 20 {
            advanceToNextStep()
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("[Navigation] Location error: \(error.localizedDescription)")
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            print("[Navigation] Location authorized")
        case .denied, .restricted:
            print("[Navigation] Location denied")
            onInstructionReady?("I need location access for navigation. Please enable it in Settings.")
        default:
            break
        }
    }
}
