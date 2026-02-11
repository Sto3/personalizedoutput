/**
 * RemindersService.swift
 *
 * EventKit integration for reminders.
 */

import EventKit

class RemindersService: ObservableObject {
    static let shared = RemindersService()

    private let store = EKEventStore()
    @Published var isAuthorized = false

    func requestAccess() async -> Bool {
        do {
            let granted = try await store.requestFullAccessToReminders()
            await MainActor.run { isAuthorized = granted }
            return granted
        } catch {
            print("[Reminders] Access error: \(error)")
            return false
        }
    }

    func fetchIncompleteReminders() async -> [EKReminder] {
        let predicate = store.predicateForIncompleteReminders(withDueDateStarting: nil, ending: nil, calendars: nil)
        return await withCheckedContinuation { continuation in
            store.fetchReminders(matching: predicate) { reminders in
                continuation.resume(returning: reminders ?? [])
            }
        }
    }

    func createReminder(title: String, dueDate: Date? = nil, notes: String? = nil, priority: Int = 0) -> Bool {
        let reminder = EKReminder(eventStore: store)
        reminder.title = title
        reminder.notes = notes
        reminder.priority = priority
        reminder.calendar = store.defaultCalendarForNewReminders()

        if let due = dueDate {
            let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: due)
            reminder.dueDateComponents = components
        }

        do {
            try store.save(reminder, commit: true)
            print("[Reminders] Created: \(title)")
            return true
        } catch {
            print("[Reminders] Save error: \(error)")
            return false
        }
    }

    func completeReminder(identifier: String) -> Bool {
        guard let calendars = store.calendars(for: .reminder) as [EKCalendar]? else { return false }
        let predicate = store.predicateForReminders(in: calendars)
        var found = false

        store.fetchReminders(matching: predicate) { [weak self] reminders in
            guard let reminder = reminders?.first(where: { $0.calendarItemIdentifier == identifier }) else { return }
            reminder.isCompleted = true
            try? self?.store.save(reminder, commit: true)
            found = true
        }
        return found
    }
}
