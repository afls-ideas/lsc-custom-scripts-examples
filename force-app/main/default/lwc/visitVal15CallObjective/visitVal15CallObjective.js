/**
 * 15. Call Objective Required
 *
 * Requires reps to select or confirm a call objective before
 * submitting. Ensures visits are planned and purposeful.
 *
 * Related objects: ProviderVisit
 * Pattern: parseContextData field check (synchronous)
 */
(() => {
    function parseContextData(record) {
        try {
            if (!record || typeof record.getContextData !== 'function') return {};
            var contextData = record.getContextData();
            if (typeof contextData === 'string') return JSON.parse(contextData);
            if (typeof contextData === 'object' && contextData !== null) return contextData;
            return {};
        } catch (e) { return {}; }
    }

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

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var results = [callObjectiveRequired(contextData)];
            if (hasWebField) return await Promise.all(results);
            return results;
        } catch (error) {
            return [{ title: 'Validation error: ' + error.message, status: 'error' }];
        }
    }

    if (record && user && env && db) {
        var contextData = parseContextData(record);
        var hasWebField = contextData['ProviderVisit'] !== undefined;
        if (hasWebField) return [validateVisit()];
        else return validateVisit();
    }
})();
