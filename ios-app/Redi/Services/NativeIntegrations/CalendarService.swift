/**
 * CalendarService.swift
 *
 * EventKit integration for reading/writing calendar events.
 * Auto-creates events after restaurant bookings or appointment scheduling.
 */

import EventKit

class CalendarService: ObservableObject {
    static let shared = CalendarService()

    private let store = EKEventStore()
    @Published var isAuthorized = false

    func requestAccess() async -> Bool {
        do {
            var granted = false
            if #available(iOS 17.0, *) {
                granted = try await store.requestFullAccessToEvents()
            } else {
                granted = try await store.requestAccess(to: .event)
            }
            await MainActor.run { isAuthorized = granted }
            return granted
        } catch {
            print("[Calendar] Access error: \(error)")
            return false
        }
    }

    func fetchUpcomingEvents(days: Int = 7) -> [EKEvent] {
        let startDate = Date()
        let endDate = Calendar.current.date(byAdding: .day, value: days, to: startDate)!
        let predicate = store.predicateForEvents(withStart: startDate, end: endDate, calendars: nil)
        return store.events(matching: predicate).sorted { $0.startDate < $1.startDate }
    }

    func createEvent(title: String, startDate: Date, endDate: Date, location: String? = nil, notes: String? = nil) -> Bool {
        let event = EKEvent(eventStore: store)
        event.title = title
        event.startDate = startDate
        event.endDate = endDate
        event.location = location
        event.notes = notes
        event.calendar = store.defaultCalendarForNewEvents

        do {
            try store.save(event, span: .thisEvent)
            print("[Calendar] Event created: \(title)")
            return true
        } catch {
            print("[Calendar] Save error: \(error)")
            return false
        }
    }

    func deleteEvent(identifier: String) -> Bool {
        guard let event = store.event(withIdentifier: identifier) else { return false }
        do {
            try store.remove(event, span: .thisEvent)
            return true
        } catch {
            print("[Calendar] Delete error: \(error)")
            return false
        }
    }
}
