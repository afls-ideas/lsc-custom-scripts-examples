/**
 * 13. Visit Notes Required
 *
 * Ensures the rep has entered visit notes before submitting.
 * Common compliance requirement for auditable call reports.
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

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var results = [visitNotesRequired(contextData)];
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
