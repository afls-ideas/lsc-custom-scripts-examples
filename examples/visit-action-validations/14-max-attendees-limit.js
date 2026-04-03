/**
 * 14. Max Attendees Limit
 *
 * Limits the total number of attendees on a group visit.
 * Prevents unreasonably large meetings that may violate compliance.
 *
 * Related objects: ChildVisit
 * Pattern: parseContextData count check (synchronous)
 */
function maxAttendeesLimit(contextData) {
    try {
        var MAX_ATTENDEES = 10; // Customize per your org's policy

        var attendeeVisits = contextData['Visit.ParentVisitId'] || contextData['ChildVisit'];
        if (!attendeeVisits || attendeeVisits.length === 0) {
            return { title: 'Attendee limit check passed — no attendees', status: 'success' };
        }

        if (attendeeVisits.length > MAX_ATTENDEES) {
            return {
                title: 'Maximum of ' + MAX_ATTENDEES + ' attendees allowed per visit. Currently ' + attendeeVisits.length + ' attendees.',
                status: 'error'
            };
        }
        return { title: 'Attendee limit check passed — ' + attendeeVisits.length + ' attendee(s)', status: 'success' };
    } catch (e) {
        return { title: 'Attendee limit check error: ' + e.message, status: 'error' };
    }
}
