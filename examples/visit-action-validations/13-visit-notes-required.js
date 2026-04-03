/**
 * 13. Visit Notes Required
 *
 * Ensures the rep has entered visit notes before submitting.
 * Common compliance requirement for auditable call reports.
 *
 * Related objects: ProviderVisit
 * Pattern: parseContextData field check (synchronous)
 */
function visitNotesRequired(contextData) {
    try {
        var notes = '';
        if (contextData.ProviderVisit) {
            notes = contextData.ProviderVisit.Description || '';
        }

        if (!notes || notes.trim().length === 0) {
            return {
                title: 'Visit notes are required. Please add notes describing the visit outcome.',
                status: 'error'
            };
        }
        return { title: 'Visit notes check passed', status: 'success' };
    } catch (e) {
        return { title: 'Visit notes check error: ' + e.message, status: 'error' };
    }
}
