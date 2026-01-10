# Redi iOS App

**Present. Active. Always Ready.**

This directory contains the Swift/SwiftUI source code for the Redi iOS application. These files can be imported into a new Xcode project.

## Setup Instructions

### 1. Create Xcode Project

1. Open Xcode
2. File → New → Project
3. Select "App" under iOS
4. Configure:
   - Product Name: `Redi`
   - Team: Your Apple Developer Team
   - Organization Identifier: `com.personalizedoutput`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Storage: None
   - Uncheck "Include Tests" (add later)

### 2. Import Source Files

Copy the contents of this directory into your Xcode project:

```
Redi/
├── App/
│   └── RediApp.swift          → Replace generated @main file
├── Models/
│   └── Models.swift
├── Views/
│   ├── HomeView.swift
│   ├── SessionView.swift
│   └── OnboardingView.swift
├── ViewModels/
│   ├── HomeViewModel.swift
│   └── SessionViewModel.swift
├── Services/
│   ├── WebSocketService.swift
│   ├── CameraService.swift
│   ├── AudioService.swift
│   └── MotionService.swift
└── Utilities/
    └── (add as needed)
```

### 3. Configure Info.plist

Add these required permissions:

```xml
<key>NSCameraUsageDescription</key>
<string>Redi uses your camera to see what you're working on and provide real-time feedback and assistance.</string>

<key>NSMicrophoneUsageDescription</key>
<string>Redi listens to your voice to understand context and respond naturally when you need help.</string>

<key>NSMotionUsageDescription</key>
<string>Redi detects movement to provide timely feedback during sports and music practice.</string>
```

### 4. Add Capabilities

In Xcode, select your project → Signing & Capabilities:

1. **Background Modes** (if needed for extended sessions)
   - Audio, AirPlay, and Picture in Picture

2. **In-App Purchase** (for Stripe integration alternative)

### 5. Configure Backend URL

Update the base URL in these files to match your server:

- `Services/WebSocketService.swift` - line 25
- `ViewModels/HomeViewModel.swift` - line 42

```swift
// Development
private let baseURL = "ws://localhost:3000"

// Production
private let baseURL = "wss://personalizedoutput.com"
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         RediApp                              │
│                      (AppState)                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ OnboardingView│  │   HomeView   │  │ SessionView  │
│              │  │              │  │              │
│ (Permissions)│  │(Configuration)│ │(Active Session)│
└──────────────┘  └──────┬───────┘  └──────┬───────┘
                         │                 │
                         ▼                 ▼
                  ┌──────────────┐  ┌──────────────┐
                  │HomeViewModel │  │SessionViewModel│
                  └──────────────┘  └──────┬───────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
              ▼                            ▼                            ▼
       ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
       │CameraService│            │AudioService │            │WebSocketService│
       │  (AVFoundation)│         │  (AVAudioEngine)│        │  (URLSession)│
       └─────────────┘            └─────────────┘            └─────────────┘
              │
              ▼
       ┌─────────────┐
       │MotionService│
       │ (CoreMotion)│
       └─────────────┘
```

## Key Features

### Camera Service
- Periodic snapshots for static use cases
- Motion-triggered clip capture for active use cases
- Front/back camera switching
- JPEG compression for efficient uploads

### Audio Service
- 16kHz mono PCM capture for transcription
- Streaming audio playback for TTS responses
- Audio level monitoring

### Motion Service
- Core Motion acceleration monitoring
- Configurable sensitivity threshold
- Cooldown to prevent over-triggering

### WebSocket Service
- Real-time bidirectional communication
- Automatic reconnection handling
- Message parsing for transcripts, AI responses, and voice audio

## Testing

### Simulator Limitations
- Camera: Use actual device
- Motion: Use actual device
- Audio: Works in simulator

### Test Checklist
- [ ] Camera preview displays
- [ ] Audio capture works
- [ ] WebSocket connects to server
- [ ] Transcripts appear
- [ ] AI responses display
- [ ] Voice audio plays
- [ ] Sensitivity slider updates server
- [ ] Timer counts down correctly
- [ ] Session ends properly

## App Store Submission

### Required Assets
- App Icon (1024x1024)
- Screenshots (various sizes)
- App Preview video (optional)

### Privacy Declarations
- Camera usage
- Microphone usage
- Motion usage
- Network/WebSocket usage

### Review Notes
Include a demo account or test session for reviewers to test the app without payment.

## Troubleshooting

### Camera Not Working
- Check Info.plist permissions
- Ensure user granted permission in Settings

### Audio Issues
- Check audio session category
- Ensure not in silent mode

### WebSocket Connection Fails
- Verify server is running
- Check URL is correct (ws:// vs wss://)
- Check network connectivity

## License

Proprietary - Personalized Output LLC
