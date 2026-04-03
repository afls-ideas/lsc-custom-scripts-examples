/**
 * 16. Adverse Event Reporting Flag
 *
 * If the rep has flagged an adverse event on the visit,
 * detailed notes must be provided. Pharma regulatory requirement
 * for pharmacovigilance.
 *
 * Related objects: ProviderVisit
 * Pattern: parseContextData conditional field check (synchronous)
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

    function adverseEventReportingFlag(contextData) {
        try {
            var adverseEvent = false;
            var notes = '';

            if (contextData.ProviderVisit) {
                adverseEvent = contextData.ProviderVisit.AdverseEventReported__c === true
                            || contextData.ProviderVisit.AdverseEventReported__c === 'true';
                notes = contextData.ProviderVisit.AdverseEventNotes__c || '';
            }

            if (!adverseEvent) {
                return { title: 'Adverse event check passed — no event reported', status: 'success' };
            }

            if (!notes || notes.trim().length < 20) {
                return {
                    title: 'When an adverse event is reported, detailed notes (min 20 characters) are required for pharmacovigilance compliance.',
                    status: 'error'
                };
            }
            return { title: 'Adverse event check passed — notes provided', status: 'success' };
        } catch (e) {
            return { title: 'Adverse event check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var results = [adverseEventReportingFlag(contextData)];
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
