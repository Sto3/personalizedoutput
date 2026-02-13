/**
 * RediEngagementPrompt — "Help Redi Help You" habit-building prompts
 * ===================================================================
 * Phase 1 (sessions < 30): Habit builders — teach users what Redi can do
 * Phase 2 (sessions >= 30): "Did you know?" tips — surface advanced features
 *
 * Shown on the main screen or after sessions end to encourage
 * deeper engagement and help users discover Redi's full capabilities.
 */

import SwiftUI

// MARK: - Engagement Prompt Model

struct EngagementPrompt: Identifiable {
    let id = UUID()
    let emoji: String
    let title: String
    let body: String
    let actionLabel: String?
    let actionType: EngagementAction
}

enum EngagementAction {
    case none
    case startSession
    case openSettings
    case openMemory
    case openMeetings
    case shareRedi
    case saveContact
}

// MARK: - Prompt Library

struct EngagementPromptLibrary {

    /// Phase 1: Habit builders for new users (< 30 sessions)
    static let habitBuilders: [EngagementPrompt] = [
        EngagementPrompt(
            emoji: "👋",
            title: "Say good morning",
            body: "Start your day by telling Redi what's on your mind. It helps me learn your rhythm.",
            actionLabel: "Start Session",
            actionType: .startSession
        ),
        EngagementPrompt(
            emoji: "📸",
            title: "Show me what you're working on",
            body: "Point your camera at anything — I can read documents, identify objects, and help you think through what you see.",
            actionLabel: "Start Session",
            actionType: .startSession
        ),
        EngagementPrompt(
            emoji: "🧠",
            title: "Tell me about your week",
            body: "The more I know about your life, the better I can help. I remember everything you share — across sessions.",
            actionLabel: "Start Session",
            actionType: .startSession
        ),
        EngagementPrompt(
            emoji: "📅",
            title: "Ask me to prep you for a meeting",
            body: "Tell me who you're meeting with and what it's about. I'll help you think through talking points.",
            actionLabel: "Start Session",
            actionType: .startSession
        ),
        EngagementPrompt(
            emoji: "💡",
            title: "Think out loud with me",
            body: "Got a decision to make? A problem you're stuck on? Just talk it through — I'm a great sounding board.",
            actionLabel: "Start Session",
            actionType: .startSession
        ),
        EngagementPrompt(
            emoji: "🏃",
            title: "Tell me about your goals",
            body: "Share what you're working toward. I'll remember and check in on your progress over time.",
            actionLabel: "Start Session",
            actionType: .startSession
        ),
        EngagementPrompt(
            emoji: "👤",
            title: "Save me to your contacts",
            body: "Add Redi to your phone contacts so I'm always one tap away — like a real assistant.",
            actionLabel: "Save Contact",
            actionType: .saveContact
        ),
        EngagementPrompt(
            emoji: "🎙️",
            title: "Try a different voice",
            body: "I have 7 voices to choose from. Find the one that feels right for you.",
            actionLabel: "Voice Settings",
            actionType: .openSettings
        ),
    ]

    /// Phase 2: "Did you know?" tips for established users (>= 30 sessions)
    static let didYouKnow: [EngagementPrompt] = [
        EngagementPrompt(
            emoji: "🔍",
            title: "Did you know? I can read your screen",
            body: "Share your screen with me and I can help with anything visible — emails, code, documents.",
            actionLabel: nil,
            actionType: .none
        ),
        EngagementPrompt(
            emoji: "📊",
            title: "Did you know? I generate reports",
            body: "Ask me to write a progress report, meeting summary, or weekly recap for your boss or team.",
            actionLabel: nil,
            actionType: .none
        ),
        EngagementPrompt(
            emoji: "🏢",
            title: "Did you know? I work for teams",
            body: "Create an organization and invite your team. I'll learn your org's projects, culture, and goals.",
            actionLabel: nil,
            actionType: .none
        ),
        EngagementPrompt(
            emoji: "💾",
            title: "Back up your memory",
            body: "I've been learning about you. Download a backup of everything I remember — just in case.",
            actionLabel: "Open Memory",
            actionType: .openMemory
        ),
        EngagementPrompt(
            emoji: "📞",
            title: "Did you know? I can join meetings",
            body: "Give me a Zoom, Teams, or Google Meet link and I'll join, listen, and take notes for you.",
            actionLabel: "Open Meetings",
            actionType: .openMeetings
        ),
        EngagementPrompt(
            emoji: "🌍",
            title: "Did you know? I search the web",
            body: "Ask me to look anything up — news, restaurants, prices, facts. I search and summarize in real time.",
            actionLabel: nil,
            actionType: .none
        ),
        EngagementPrompt(
            emoji: "❤️",
            title: "Share Redi with someone",
            body: "Know someone who'd benefit from a personal AI assistant? Share the love.",
            actionLabel: "Share",
            actionType: .shareRedi
        ),
    ]

    /// Get the right prompt for the user's session count
    static func getPrompt(sessionCount: Int) -> EngagementPrompt {
        if sessionCount < 30 {
            // Phase 1: Rotate through habit builders
            let index = sessionCount % habitBuilders.count
            return habitBuilders[index]
        } else {
            // Phase 2: Rotate through did-you-know tips
            let index = (sessionCount - 30) % didYouKnow.count
            return didYouKnow[index]
        }
    }

    /// Get a random prompt (for widget or push notification)
    static func getRandomPrompt(sessionCount: Int) -> EngagementPrompt {
        if sessionCount < 30 {
            return habitBuilders.randomElement()!
        } else {
            return didYouKnow.randomElement()!
        }
    }
}

// MARK: - Engagement Prompt View

struct RediEngagementPromptView: View {
    let prompt: EngagementPrompt
    var onAction: ((EngagementAction) -> Void)?
    var onDismiss: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(prompt.emoji)
                    .font(.title2)
                Text(prompt.title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.primary)
                Spacer()
                if onDismiss != nil {
                    Button(action: { onDismiss?() }) {
                        Image(systemName: "xmark")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Text(prompt.body)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
                .lineSpacing(3)

            if let actionLabel = prompt.actionLabel {
                Button(action: { onAction?(prompt.actionType) }) {
                    Text(actionLabel)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                        .background(Color.blue)
                        .cornerRadius(20)
                }
                .padding(.top, 4)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(.separator).opacity(0.3), lineWidth: 0.5)
        )
    }
}

// MARK: - Preview

struct RediEngagementPromptView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 16) {
            RediEngagementPromptView(
                prompt: EngagementPromptLibrary.habitBuilders[0],
                onAction: { _ in },
                onDismiss: { }
            )
            RediEngagementPromptView(
                prompt: EngagementPromptLibrary.didYouKnow[0],
                onAction: { _ in },
                onDismiss: { }
            )
        }
        .padding()
    }
}
