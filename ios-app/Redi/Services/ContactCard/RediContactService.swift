/**
 * RediContactService — Save Redi as a phone contact
 * ===================================================
 * During onboarding (or from Settings), creates a CNContact
 * for Redi so the user sees "Redi" in their Contacts app.
 * Makes Redi feel like a real presence on their phone.
 */

import Foundation
import Contacts
import ContactsUI

class RediContactService {
    static let shared = RediContactService()
    private let store = CNContactStore()

    // MARK: - Permission

    func requestAccess() async -> Bool {
        do {
            return try await store.requestAccess(for: .contacts)
        } catch {
            print("[RediContact] Access denied: \(error)")
            return false
        }
    }

    var hasAccess: Bool {
        CNContactStore.authorizationStatus(for: .contacts) == .authorized
    }

    // MARK: - Save Redi Contact

    /// Save Redi as a contact. Returns true if successful.
    func saveRediContact() async -> Bool {
        guard await requestAccess() else { return false }

        // Check if already saved
        if isRediAlreadySaved() {
            print("[RediContact] Already saved")
            return true
        }

        let contact = CNMutableContact()
        contact.givenName = "Redi"
        contact.organizationName = "Personalized Output"
        contact.jobTitle = "Your AI Assistant"
        contact.note = "Redi — your personal AI assistant. Always here when you need me."

        // Phone number
        let phone = CNPhoneNumber(stringValue: "+1-555-REDI")
        contact.phoneNumbers = [CNLabeledValue(label: CNLabelPhoneNumberMobile, value: phone)]

        // Email
        contact.emailAddresses = [
            CNLabeledValue(label: CNLabelHome, value: "redi@personalizedoutput.com" as NSString)
        ]

        // URL
        contact.urlAddresses = [
            CNLabeledValue(label: CNLabelHome, value: "https://personalizedoutput.com/redi" as NSString)
        ]

        // Save
        let saveRequest = CNSaveRequest()
        saveRequest.add(contact, toContainerWithIdentifier: nil)

        do {
            try store.execute(saveRequest)
            print("[RediContact] Saved successfully")
            UserDefaults.standard.set(true, forKey: "redi_contact_saved")
            return true
        } catch {
            print("[RediContact] Save failed: \(error)")
            return false
        }
    }

    // MARK: - Check if Already Saved

    func isRediAlreadySaved() -> Bool {
        // Quick check via UserDefaults first
        if UserDefaults.standard.bool(forKey: "redi_contact_saved") {
            return true
        }

        // Search contacts for "Redi"
        guard hasAccess else { return false }

        let predicate = CNContact.predicateForContacts(matchingName: "Redi")
        do {
            let contacts = try store.unifiedContacts(matching: predicate, keysToFetch: [CNContactGivenNameKey as CNKeyDescriptor])
            if !contacts.isEmpty {
                UserDefaults.standard.set(true, forKey: "redi_contact_saved")
                return true
            }
        } catch {
            print("[RediContact] Search failed: \(error)")
        }

        return false
    }

    // MARK: - Delete Redi Contact

    func deleteRediContact() async -> Bool {
        guard hasAccess else { return false }

        let predicate = CNContact.predicateForContacts(matchingName: "Redi")
        do {
            let contacts = try store.unifiedContacts(matching: predicate, keysToFetch: [CNContactIdentifierKey as CNKeyDescriptor])
            let saveRequest = CNSaveRequest()
            for contact in contacts {
                let mutable = contact.mutableCopy() as! CNMutableContact
                saveRequest.delete(mutable)
            }
            try store.execute(saveRequest)
            UserDefaults.standard.set(false, forKey: "redi_contact_saved")
            print("[RediContact] Deleted")
            return true
        } catch {
            print("[RediContact] Delete failed: \(error)")
            return false
        }
    }
}
