/**
 * ContactsService.swift
 *
 * CNContactStore integration for contact lookup.
 * Used when user says "Call Mom" - looks up contact to get number.
 */

import Contacts

class ContactsService: ObservableObject {
    static let shared = ContactsService()

    private let store = CNContactStore()
    @Published var isAuthorized = false

    func requestAccess() async -> Bool {
        do {
            let granted = try await store.requestAccess(for: .contacts)
            await MainActor.run { isAuthorized = granted }
            return granted
        } catch {
            print("[Contacts] Access error: \(error)")
            return false
        }
    }

    func searchContacts(name: String) -> [CNContact] {
        let keysToFetch: [CNKeyDescriptor] = [
            CNContactGivenNameKey as CNKeyDescriptor,
            CNContactFamilyNameKey as CNKeyDescriptor,
            CNContactNicknameKey as CNKeyDescriptor,
            CNContactPhoneNumbersKey as CNKeyDescriptor,
            CNContactEmailAddressesKey as CNKeyDescriptor
        ]

        let request = CNContactFetchRequest(keysToFetch: keysToFetch)
        request.predicate = CNContact.predicateForContacts(matchingName: name)

        var results: [CNContact] = []
        do {
            try store.enumerateContacts(with: request) { contact, _ in
                results.append(contact)
            }
        } catch {
            print("[Contacts] Search error: \(error)")
        }
        return results
    }

    func getPhoneNumber(name: String) -> String? {
        let contacts = searchContacts(name: name)
        return contacts.first?.phoneNumbers.first?.value.stringValue
    }

    func getContact(identifier: String) -> CNContact? {
        let keysToFetch: [CNKeyDescriptor] = [
            CNContactGivenNameKey as CNKeyDescriptor,
            CNContactFamilyNameKey as CNKeyDescriptor,
            CNContactPhoneNumbersKey as CNKeyDescriptor,
            CNContactEmailAddressesKey as CNKeyDescriptor
        ]
        return try? store.unifiedContact(withIdentifier: identifier, keysToFetch: keysToFetch)
    }
}
