/**
 * 15. Call Objective Required
 *
 * Requires reps to select or confirm a call objective before
 * submitting. Ensures visits are planned and purposeful.
 *
 * Related objects: ProviderVisit
 * Pattern: parseContextData field check (synchronous)
 */
function callObjectiveRequired(contextData) {
    try {
        var objective = '';
        if (contextData.ProviderVisit) {
            objective = contextData.ProviderVisit.CallObjective__c || contextData.ProviderVisit.Purpose || '';
        }

        if (!objective || objective.trim().length === 0) {
            return {
                title: 'A call objective is required before submitting the visit.',
                status: 'error'
            };
        }
        return { title: 'Call objective check passed', status: 'success' };
    } catch (e) {
        return { title: 'Call objective check error: ' + e.message, status: 'error' };
    }
}
