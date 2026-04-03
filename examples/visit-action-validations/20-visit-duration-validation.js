/**
 * 20. Visit Duration Validation
 *
 * Ensures the visit duration is within a reasonable range.
 * Flags visits shorter than 2 minutes (likely errors) or
 * longer than 4 hours (likely forgot to check out).
 *
 * Related objects: ProviderVisit
 * Pattern: parseContextData date math (synchronous)
 */
function visitDurationValidation(contextData) {
    try {
        var MIN_MINUTES = 2;
        var MAX_MINUTES = 240; // 4 hours

        var startTime = '';
        var endTime = '';
        if (contextData.ProviderVisit) {
            startTime = contextData.ProviderVisit.ActualStartDateTime || '';
            endTime = contextData.ProviderVisit.ActualEndDateTime || '';
        }

        if (!startTime || !endTime) {
            return { title: 'Duration check skipped — missing start or end time', status: 'success' };
        }

        var startMs = new Date(startTime).getTime();
        var endMs = new Date(endTime).getTime();
        var durationMinutes = (endMs - startMs) / (1000 * 60);

        if (durationMinutes < MIN_MINUTES) {
            return {
                title: 'Visit duration is under ' + MIN_MINUTES + ' minutes (' + Math.round(durationMinutes) + ' min). Please verify the check-in/check-out times.',
                status: 'error'
            };
        }
        if (durationMinutes > MAX_MINUTES) {
            return {
                title: 'Visit duration exceeds ' + (MAX_MINUTES / 60) + ' hours (' + Math.round(durationMinutes) + ' min). Please verify the check-in/check-out times.',
                status: 'error'
            };
        }
        return { title: 'Duration check passed — ' + Math.round(durationMinutes) + ' minutes', status: 'success' };
    } catch (e) {
        return { title: 'Duration check error: ' + e.message, status: 'error' };
    }
}
