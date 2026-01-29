/**
 * HealthReportView.swift
 *
 * REDI HEALTH REPORT VIEW
 * 
 * Generate and share health reports:
 * - Period selector
 * - Report preview
 * - Share/export options
 *
 * Created: Jan 29, 2026
 */

import SwiftUI

struct HealthReportView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var reportService = HealthReportService.shared
    
    @State private var selectedPeriod = 30
    @State private var reportText = ""
    @State private var isGenerating = false
    @State private var showShareSheet = false
    @State private var shareURL: URL?
    
    let periods = [
        (7, "Last 7 Days"),
        (14, "Last 2 Weeks"),
        (30, "Last 30 Days"),
        (90, "Last 90 Days")
    ]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Period Selector
                Picker("Period", selection: $selectedPeriod) {
                    ForEach(periods, id: \.0) { period in
                        Text(period.1).tag(period.0)
                    }
                }
                .pickerStyle(.segmented)
                .padding()
                .onChange(of: selectedPeriod) { _ in
                    generateReport()
                }
                
                Divider()
                
                // Report Preview
                if isGenerating {
                    Spacer()
                    ProgressView("Generating report...")
                    Spacer()
                } else if reportText.isEmpty {
                    Spacer()
                    VStack(spacing: 16) {
                        Image(systemName: "doc.text")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text("Tap Generate to create your report")
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
                            .font(.system(.caption, design: .monospaced))
                            .padding()
                    }
                }
                
                // Actions
                if !reportText.isEmpty {
                    Divider()
                    
                    HStack(spacing: 16) {
                        Button(action: regenerateReport) {
                            Label("Regenerate", systemImage: "arrow.clockwise")
                        }
                        .buttonStyle(.bordered)
                        
                        Button(action: shareReport) {
                            Label("Share", systemImage: "square.and.arrow.up")
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                }
            }
            .navigationTitle("Health Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showShareSheet) {
                if let url = shareURL {
                    ShareSheet(items: [url])
                }
            }
        }
    }
    
    private func generateReport() {
        isGenerating = true
        DispatchQueue.global().async {
            let text = reportService.generateTextReport(days: selectedPeriod)
            DispatchQueue.main.async {
                reportText = text
                isGenerating = false
            }
        }
    }
    
    private func regenerateReport() {
        reportText = ""
        generateReport()
    }
    
    private func shareReport() {
        if let url = reportService.shareReport(days: selectedPeriod) {
            shareURL = url
            showShareSheet = true
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
