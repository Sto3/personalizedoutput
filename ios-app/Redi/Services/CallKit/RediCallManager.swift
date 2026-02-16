/**
 * RediCallManager.swift
 *
 * CallKit + VoIP Push integration for Redi.
 * Allows Redi to "call" users and users to "call" Redi.
 *
 * Entitlements needed: VoIP background mode, Push Notifications
 * Info.plist: UIBackgroundModes: ["voip", "audio", "fetch"]
 */

import CallKit
import PushKit

class RediCallManager: NSObject, ObservableObject {
    private let provider: CXProvider
    private let callController = CXCallController()
    private var pushRegistry: PKPushRegistry?

    @Published var activeCallUUID: UUID?
    @Published var isInCall = false

    var onCallAnswered: ((UUID) -> Void)?
    var onCallEnded: ((UUID) -> Void)?

    override init() {
        let config = CXProviderConfiguration()
        config.localizedName = "Redi"
        config.supportsVideo = true
        config.maximumCallsPerCallGroup = 1
        config.supportedHandleTypes = [.generic, .phoneNumber]

        provider = CXProvider(configuration: config)
        super.init()
        provider.setDelegate(self, queue: nil)

        registerForVoIPPushes()
    }

    private func registerForVoIPPushes() {
        pushRegistry = PKPushRegistry(queue: .main)
        pushRegistry?.delegate = self
        pushRegistry?.desiredPushTypes = [.voIP]
    }

    func reportIncomingCall(uuid: UUID, reason: String, completion: @escaping (Error?) -> Void) {
        let update = CXCallUpdate()
        update.localizedCallerName = "Redi"
        update.remoteHandle = CXHandle(type: .generic, value: "redi")
        update.hasVideo = false
        update.supportsDTMF = false
        update.supportsHolding = false
        update.supportsGrouping = false
        update.supportsUngrouping = false

        provider.reportNewIncomingCall(with: uuid, update: update) { error in
            if let error = error {
                print("[CallKit] Error reporting call: \(error)")
            } else {
                self.activeCallUUID = uuid
                print("[CallKit] Incoming call reported: \(reason)")
            }
            completion(error)
        }
    }

    func endCall() {
        guard let uuid = activeCallUUID else { return }
        let action = CXEndCallAction(call: uuid)
        let transaction = CXTransaction(action: action)
        callController.request(transaction) { error in
            if let error = error {
                print("[CallKit] Error ending call: \(error)")
            }
        }
    }
}

// MARK: - CXProviderDelegate
extension RediCallManager: CXProviderDelegate {
    func providerDidReset(_ provider: CXProvider) {
        activeCallUUID = nil
        isInCall = false
    }

    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        isInCall = true
        onCallAnswered?(action.callUUID)
        action.fulfill()
    }

    func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        isInCall = false
        activeCallUUID = nil
        onCallEnded?(action.callUUID)
        action.fulfill()
    }

    func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
        isInCall = true
        onCallAnswered?(action.callUUID)
        action.fulfill()
    }
}

// MARK: - PKPushRegistryDelegate
extension RediCallManager: PKPushRegistryDelegate {
    func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        let token = pushCredentials.token.map { String(format: "%02.2hhx", $0) }.joined()
        print("[VoIP] Push token: \(token)")
        // Send token to server at /api/outreach/register-voip-token
    }

    func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
        let uuid = UUID()
        let reason = payload.dictionaryPayload["reason"] as? String ?? "Redi is calling"

        reportIncomingCall(uuid: uuid, reason: reason) { _ in
            completion()
        }
    }
}
