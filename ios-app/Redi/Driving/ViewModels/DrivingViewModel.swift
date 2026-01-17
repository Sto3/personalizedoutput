/**
 * DrivingViewModel.swift
 *
 * Orchestrates all driving mode services:
 * - Navigation (MapKit)
 * - Driver Monitoring (ARKit face tracking)
 * - Rear Awareness (Vision framework)
 * - Alert Management (Rule Engine)
 * - Speech Output (Local TTS)
 *
 * 90% runs on-device (FREE), 10% cloud (conversation).
 */

import SwiftUI
import Combine
import MapKit

class DrivingViewModel: ObservableObject {
    // MARK: - Services

    private let navigationService = NavigationService()
    private let driverMonitoring = DriverMonitoringService()
    private let rearAwareness = RearAwarenessService()
    private let ruleEngine = DrivingRuleEngine()
    private let tts = DrivingTTSService()

    // MARK: - Published State

    @Published var isActive = false
    @Published var currentInstruction: String?
    @Published var isDrowsy = false
    @Published var isDistracted = false
    @Published var isTailgating = false
    @Published var emergencyVehicle = false
    @Published var destination: String?
    @Published var isNavigating = false
    @Published var eta: Date?
    @Published var drivingDuration: TimeInterval = 0

    // MARK: - Private

    private var cancellables = Set<AnyCancellable>()
    private var drivingStartTime: Date?
    private var durationTimer: Timer?
    private var reminderTimer: Timer?

    // MARK: - Initialization

    init() {
        setupBindings()
    }

    private func setupBindings() {
        // Navigation instructions → Rule Engine → TTS
        navigationService.onInstructionReady = { [weak self] instruction in
            self?.ruleEngine.queueNavigationInstruction(instruction)
        }

        navigationService.onDestinationReached = { [weak self] in
            self?.isNavigating = false
            self?.destination = nil
        }

        // Navigation state
        navigationService.$isNavigating
            .receive(on: DispatchQueue.main)
            .sink { [weak self] navigating in
                self?.isNavigating = navigating
            }
            .store(in: &cancellables)

        navigationService.$eta
            .receive(on: DispatchQueue.main)
            .sink { [weak self] eta in
                self?.eta = eta
            }
            .store(in: &cancellables)

        // Driver monitoring → Rule Engine
        driverMonitoring.onDrowsinessDetected = { [weak self] in
            self?.ruleEngine.queueAlert(type: .drowsiness, priority: .critical)
        }

        driverMonitoring.onDistractionDetected = { [weak self] in
            self?.ruleEngine.queueAlert(type: .distraction, priority: .high)
        }

        driverMonitoring.onAlertCleared = { [weak self] in
            DispatchQueue.main.async {
                self?.isDrowsy = false
                self?.isDistracted = false
            }
        }

        // Driver monitoring state
        driverMonitoring.$isDrowsy
            .receive(on: DispatchQueue.main)
            .sink { [weak self] drowsy in
                self?.isDrowsy = drowsy
            }
            .store(in: &cancellables)

        driverMonitoring.$isDistracted
            .receive(on: DispatchQueue.main)
            .sink { [weak self] distracted in
                self?.isDistracted = distracted
            }
            .store(in: &cancellables)

        // Rear awareness → Rule Engine
        rearAwareness.onTailgatingDetected = { [weak self] in
            self?.ruleEngine.queueAlert(type: .tailgating, priority: .medium)
        }

        rearAwareness.onEmergencyVehicleDetected = { [weak self] in
            self?.ruleEngine.queueAlert(type: .emergencyVehicle, priority: .critical)
        }

        rearAwareness.onFastApproachDetected = { [weak self] in
            self?.ruleEngine.queueAlert(type: .fastApproach, priority: .high)
        }

        // Rear awareness state
        rearAwareness.$isTailgating
            .receive(on: DispatchQueue.main)
            .sink { [weak self] tailgating in
                self?.isTailgating = tailgating
            }
            .store(in: &cancellables)

        rearAwareness.$emergencyVehicleDetected
            .receive(on: DispatchQueue.main)
            .sink { [weak self] emergency in
                self?.emergencyVehicle = emergency
            }
            .store(in: &cancellables)

        // Rule Engine → TTS
        ruleEngine.onAlertReady = { [weak self] message in
            self?.tts.speak(message, priority: true)
            DispatchQueue.main.async {
                self?.currentInstruction = message
            }
        }

        // TTS → Rule Engine (for alert completion)
        tts.onSpeechFinished = { [weak self] in
            self?.ruleEngine.alertFinished()
            // Clear instruction after a delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                if self?.currentInstruction == self?.ruleEngine.currentAlert?.message {
                    self?.currentInstruction = nil
                }
            }
        }
    }

    // MARK: - Public Methods

    func startDriving() {
        guard !isActive else { return }

        isActive = true
        drivingStartTime = Date()

        // Start all monitoring services
        driverMonitoring.startMonitoring()
        rearAwareness.startMonitoring()

        // Start duration timer
        durationTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            if let start = self?.drivingStartTime {
                self?.drivingDuration = Date().timeIntervalSince(start)
            }
        }

        // Start break reminder timer (every hour)
        reminderTimer = Timer.scheduledTimer(withTimeInterval: 3600, repeats: true) { [weak self] _ in
            self?.ruleEngine.queueAlert(type: .reminder, priority: .low)
        }

        tts.speak("Driving mode active. Where would you like to go?")
        print("[Driving] Started driving mode")
    }

    func stopDriving() {
        guard isActive else { return }

        isActive = false

        // Stop all monitoring services
        driverMonitoring.stopMonitoring()
        rearAwareness.stopMonitoring()
        navigationService.stopNavigation()

        // Stop timers
        durationTimer?.invalidate()
        durationTimer = nil
        reminderTimer?.invalidate()
        reminderTimer = nil

        // Clear state
        ruleEngine.clearAllAlerts()
        drivingDuration = 0
        drivingStartTime = nil
        destination = nil
        currentInstruction = nil

        tts.speak("Driving mode ended. Drive safe.")
        print("[Driving] Stopped driving mode")
    }

    func navigateTo(_ query: String) {
        destination = query
        tts.speak("Searching for \(query)")

        navigationService.searchDestination(query: query) { [weak self] results in
            guard let destination = results.first else {
                self?.tts.speak("I couldn't find that location. Try a different search.")
                self?.destination = nil
                return
            }

            let name = destination.name ?? "your destination"
            self?.tts.speak("Navigating to \(name)")
            self?.navigationService.startNavigation(to: destination)
        }
    }

    func stopNavigation() {
        navigationService.stopNavigation()
        destination = nil
        tts.speak("Navigation cancelled.")
    }

    // MARK: - Formatted Properties

    var formattedDuration: String {
        let hours = Int(drivingDuration) / 3600
        let minutes = (Int(drivingDuration) % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }

    var formattedETA: String? {
        guard let eta = eta else { return nil }
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: eta)
    }
}
