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

    function unwrapProxy(results) {
        return JSON.parse(JSON.stringify(results));
    }

    async function duplicateVisitPrevention(contextData) {
        try {
            var accountId = '';
            var visitDate = '';
            var currentVisitId = '';

            if (contextData.ProviderVisit) {
                accountId = contextData.ProviderVisit.AccountId || '';
                visitDate = contextData.ProviderVisit.PlannedStartDateTime || contextData.ProviderVisit.ActualStartDateTime || '';
                currentVisitId = contextData.ProviderVisit.Id || '';
            }
            if (!accountId || !visitDate) {
                return { title: 'Duplicate check skipped - missing account or date', status: 'success' };
            }

            var dateOnly = visitDate.split('T')[0];
            var startOfDay = dateOnly + 'T00:00:00.000Z';
            var endOfDay = dateOnly + 'T23:59:59.000Z';

            var userId;
            try { userId = user.stringValue('Id'); } catch (e) { userId = null; }
            if (!userId) {
                return { title: 'Duplicate check skipped - no user ID', status: 'success' };
            }

            var existingVisits = await db.query(
                'ProviderVisit',
                await new ConditionBuilder('ProviderVisit',
                    new AndCondition([
                        new FieldCondition('AccountId', '=', accountId),
                        new FieldCondition('OwnerId', '=', userId),
                        new FieldCondition('PlannedStartDateTime', '>=', startOfDay),
                        new FieldCondition('PlannedStartDateTime', '<=', endOfDay),
                        new FieldCondition('Status', '=', 'Completed')
                    ])
                ).build(),
                ['Id']
            );

            var otherVisits = 0;
            for (var i = 0; i < (existingVisits || []).length; i++) {
                if (existingVisits[i].stringValue('Id') !== currentVisitId) {
                    otherVisits++;
                }
            }

            if (otherVisits > 0) {
                return {
                    title: 'A completed visit to this account already exists today. Please confirm this is not a duplicate.',
                    status: 'error'
                };
            }
            return { title: 'Duplicate visit check passed', status: 'success' };
        } catch (e) {
            return { title: 'Duplicate check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await duplicateVisitPrevention(contextData);
            var results = [result];
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
