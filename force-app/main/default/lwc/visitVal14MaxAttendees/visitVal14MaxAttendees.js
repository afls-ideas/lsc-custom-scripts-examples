(() => {
    function parseContextData(record) {
        try {
            if (!record || typeof record.getContextData !== 'function') return {};
            var contextData = record.getContextData();
            if (typeof contextData === 'string') return JSON.parse(contextData);
            if (typeof contextData === 'object' && contextData !== null) return contextData;
            return {};
        } catch (e) { return {}; }

    function unwrapProxy(results) {
        return JSON.parse(JSON.stringify(results));
    }
    }

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

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var results = [maxAttendeesLimit(contextData)];
            if (hasWebField) { var resolved = await Promise.all(results); return unwrapProxy(resolved); }
            return unwrapProxy(results);
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
