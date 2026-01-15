/**
 * Redi V3 App Entry Point
 *
 * Clean implementation using OpenAI Realtime API.
 */

import SwiftUI

@main
struct RediApp: App {
    var body: some Scene {
        WindowGroup {
            MainView()
                .preferredColorScheme(.dark)
        }
    }
}
