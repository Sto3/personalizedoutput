/**
 * HealthReportView.swift
 *
 * REDI HEALTH REPORT VIEW
 * 
 * Generate and share comprehensive health reports:
 * - Period selection (7, 14, 30 days)
 * - Medication adherence
 * - Symptom summary
 * - Nutrition overview
 * - Share functionality
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct HealthReportView: View {
    @Environment(\.dismiss) private var dismiss
    
    @State private var selectedPeriod = 7
    @State private var reportText = ""
    @State private var isGenerating = false
    @State private var showShareSheet = false
    
    private let service = HealthReportService.shared
    private let periods = [7, 14, 30]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Period selector
                Picker("Period", selection: $selectedPeriod) {
                    ForEach(periods, id: \.self) { days in
                        Text("\(days) days").tag(days)
                    }
                }
                .pickerStyle(.segmented)
                .padding()
                .onChange(of: selectedPeriod) { _ in
                    generateReport()
                }
                
                Divider()
                
                // Report content
                if isGenerating {
                    Spacer()
                    ProgressView("Generating report...")
                    Spacer()
                } else if reportText.isEmpty {
                    Spacer()
                    VStack(spacing: 16) {
                        Image(systemName: "doc.text")
                            .font(.largeTitle)
                            .foregroundColor(.gray)
                        Text("Tap Generate to create your health report")
                            .foregroundColor(.secondary)
                        Button("Generate Report") {
                            generateReport()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    Spacer()
                } else {
                    ScrollView {
                        Text(reportText)
                            .font(.system(.body, design: .monospaced))
                            .padding()
                    }
                }
            }
            .navigationTitle("Health Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showShareSheet = true }) {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .disabled(reportText.isEmpty)
                }
            }
            .sheet(isPresented: $showShareSheet) {
                ShareSheet(items: [reportText])
            }
        }
    }
    
    private func generateReport() {
        isGenerating = true
        
        // Generate on background thread
        DispatchQueue.global(qos: .userInitiated).async {
            let text = service.generateTextReport(days: selectedPeriod)
            
            DispatchQueue.main.async {
                reportText = text
                isGenerating = false
            }
        }
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    HealthReportView()
}
