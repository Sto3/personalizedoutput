/**
 * DrivingView.swift
 *
 * Main UI for Driving Mode.
 * Minimalist design to avoid distracting the driver.
 * Large tap targets, high contrast alerts.
 */

import SwiftUI
import MapKit

struct DrivingView: View {
    @StateObject private var viewModel = DrivingViewModel()
    @State private var showingDestinationInput = false
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )

    var body: some View {
        ZStack {
            // Map background
            Map(coordinateRegion: $region, showsUserLocation: true)
                .ignoresSafeArea()

            // Dark overlay for better contrast
            Color.black.opacity(0.3)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Top status bar
                topStatusBar
                    .padding(.top, 60)

                Spacer()

                // Current instruction
                if let instruction = viewModel.currentInstruction {
                    instructionCard(instruction)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }

                Spacer()

                // Alert badges
                alertBadges
                    .padding(.bottom, 20)

                // Bottom controls
                bottomControls
                    .padding(.bottom, 40)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: viewModel.currentInstruction)
        .animation(.easeInOut(duration: 0.3), value: viewModel.isDrowsy)
        .animation(.easeInOut(duration: 0.3), value: viewModel.isDistracted)
        .onAppear {
            viewModel.startDriving()
        }
        .onDisappear {
            viewModel.stopDriving()
        }
        .sheet(isPresented: $showingDestinationInput) {
            DestinationInputView { query in
                viewModel.navigateTo(query)
                showingDestinationInput = false
            }
        }
    }

    // MARK: - Components

    private var topStatusBar: some View {
        HStack {
            // Duration
            VStack(alignment: .leading) {
                Text("Driving")
                    .font(.caption)
                    .foregroundColor(.gray)
                Text(viewModel.formattedDuration)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
            }

            Spacer()

            // ETA (if navigating)
            if let eta = viewModel.formattedETA {
                VStack(alignment: .trailing) {
                    Text("ETA")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text(eta)
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(.green)
                }
            }

            // Destination (if set)
            if let destination = viewModel.destination {
                VStack(alignment: .trailing) {
                    Text("To")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text(destination)
                        .font(.headline)
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
    }

    private func instructionCard(_ instruction: String) -> some View {
        Text(instruction)
            .font(.title2)
            .fontWeight(.medium)
            .foregroundColor(.white)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            .background(Color.blue.opacity(0.9))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.3), radius: 10)
            .padding(.horizontal, 20)
    }

    private var alertBadges: some View {
        HStack(spacing: 16) {
            if viewModel.isDrowsy {
                AlertBadge(
                    icon: "eye.slash.fill",
                    text: "DROWSY",
                    color: .red
                )
            }

            if viewModel.isDistracted {
                AlertBadge(
                    icon: "exclamationmark.triangle.fill",
                    text: "EYES UP",
                    color: .orange
                )
            }

            if viewModel.isTailgating {
                AlertBadge(
                    icon: "car.fill",
                    text: "TAILGATING",
                    color: .yellow
                )
            }

            if viewModel.emergencyVehicle {
                AlertBadge(
                    icon: "light.beacon.max.fill",
                    text: "EMERGENCY",
                    color: .red
                )
                .scaleEffect(1.1)
            }
        }
    }

    private var bottomControls: some View {
        HStack(spacing: 40) {
            // Navigate button
            Button(action: { showingDestinationInput = true }) {
                VStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 28))
                    Text("Navigate")
                        .font(.caption)
                }
                .foregroundColor(.white)
                .frame(width: 80, height: 80)
                .background(Color.blue.opacity(0.8))
                .cornerRadius(16)
            }

            // End driving button
            Button(action: { viewModel.stopDriving() }) {
                VStack(spacing: 8) {
                    Image(systemName: "xmark")
                        .font(.system(size: 28, weight: .bold))
                    Text("End")
                        .font(.caption)
                }
                .foregroundColor(.white)
                .frame(width: 80, height: 80)
                .background(Color.red.opacity(0.8))
                .cornerRadius(16)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(.ultraThinMaterial)
        .cornerRadius(24)
    }
}

// MARK: - Alert Badge

struct AlertBadge: View {
    let icon: String
    let text: String
    let color: Color

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .bold))
            Text(text)
                .font(.system(size: 14, weight: .bold))
        }
        .foregroundColor(.white)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(color)
        .cornerRadius(24)
        .shadow(color: color.opacity(0.5), radius: 8)
    }
}

// MARK: - Destination Input View

struct DestinationInputView: View {
    @State private var query = ""
    @FocusState private var isFocused: Bool
    @Environment(\.dismiss) private var dismiss

    let onSubmit: (String) -> Void

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                TextField("Where to?", text: $query)
                    .textFieldStyle(.roundedBorder)
                    .font(.title2)
                    .focused($isFocused)
                    .submitLabel(.go)
                    .onSubmit {
                        if !query.isEmpty {
                            onSubmit(query)
                        }
                    }
                    .padding(.horizontal)

                // Quick suggestions
                VStack(alignment: .leading, spacing: 12) {
                    Text("Suggestions")
                        .font(.headline)
                        .foregroundColor(.secondary)
                        .padding(.horizontal)

                    quickSuggestion("Home", icon: "house.fill")
                    quickSuggestion("Work", icon: "briefcase.fill")
                    quickSuggestion("Gas Station", icon: "fuelpump.fill")
                    quickSuggestion("Coffee", icon: "cup.and.saucer.fill")
                }

                Spacer()

                Button(action: {
                    if !query.isEmpty {
                        onSubmit(query)
                    }
                }) {
                    Text("Navigate")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(query.isEmpty ? Color.gray : Color.blue)
                        .cornerRadius(12)
                }
                .disabled(query.isEmpty)
                .padding(.horizontal)
            }
            .padding(.top, 20)
            .navigationTitle("Destination")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            isFocused = true
        }
    }

    private func quickSuggestion(_ text: String, icon: String) -> some View {
        Button(action: {
            query = text
            onSubmit(text)
        }) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(.blue)
                    .frame(width: 30)
                Text(text)
                    .foregroundColor(.primary)
                Spacer()
                Image(systemName: "arrow.right")
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(10)
        }
        .padding(.horizontal)
    }
}

// MARK: - Preview

#Preview {
    DrivingView()
}
