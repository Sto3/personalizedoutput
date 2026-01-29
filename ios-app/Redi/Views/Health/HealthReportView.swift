/**
 * HealthReportView.swift
 *
 * REDI HEALTH - Doctor Visit Report
 *
 * Created: Jan 26, 2026
 */

import SwiftUI

struct HealthReportView: View {
    @Environment(\.dismiss) private var dismiss
    
    @State private var reportDays = 30
    @State private var reportText = ""
    @State private var isGenerating = false
    
    private let reportService = HealthReportService.shared
    
    var body: some View {
        NavigationView {
            VStack {
                // Period selector
                Picker("Period", selection: $reportDays) {
                    Text("7 Days").tag(7)
                    Text("14 Days").tag(14)
                    Text("30 Days").tag(30)
                }
                .pickerStyle(.segmented)
                .padding()
                .onChange(of: reportDays) { _ in
                    generateReport()
                }
                
                if isGenerating {
                    ProgressView("Generating report...")
                        .frame(maxHeight: .infinity)
                } else {
                    ScrollView {
                        Text(reportText)
                            .font(.system(.body, design: .monospaced))
                            .padding()
                    }
                }
                
                // Actions
                HStack(spacing: 16) {
                    Button(action: shareReport) {
                        Label("Share", systemImage: "square.and.arrow.up")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    
                    Button(action: copyReport) {
                        Label("Copy", systemImage: "doc.on.doc")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
            }
            .navigationTitle("Health Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear {
                generateReport()
            }
        }
    }
    
    private func generateReport() {
        isGenerating = true
        DispatchQueue.global().async {
            let text = reportService.generateTextReport(days: reportDays)
            DispatchQueue.main.async {
                reportText = text
                isGenerating = false
            }
        }
    }
    
    private func shareReport() {
        let av = UIActivityViewController(activityItems: [reportText], applicationActivities: nil)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootVC = window.rootViewController {
            rootVC.present(av, animated: true)
        }
    }
    
    private func copyReport() {
        UIPasteboard.general.string = reportText
    }
}

#Preview {
    HealthReportView()
}
