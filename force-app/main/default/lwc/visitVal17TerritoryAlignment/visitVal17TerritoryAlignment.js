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

    async function territoryAlignmentCheck(contextData) {
        try {
            var accountId = '';
            if (contextData.ProviderVisit) {
                accountId = contextData.ProviderVisit.AccountId || '';
            }
            if (!accountId) {
                return { title: 'Territory check skipped - no account', status: 'success' };
            }

            var accountTerritories = await db.query(
                'ObjectTerritory2Association',
                await new ConditionBuilder('ObjectTerritory2Association',
                    new FieldCondition('ObjectId', '=', accountId)
                ).build(),
                ['Id', 'Territory2Id']
            );

            if (!accountTerritories || accountTerritories.length === 0) {
                return { title: 'Territory check skipped - account has no territory', status: 'success' };
            }

            var userId;
            try { userId = user.stringValue('Id'); } catch (e) { userId = null; }
            if (!userId) {
                return { title: 'Territory check skipped - no user ID', status: 'success' };
            }

            var userTerritories = await db.query(
                'UserTerritory2Association',
                await new ConditionBuilder('UserTerritory2Association',
                    new FieldCondition('UserId', '=', userId)
                ).build(),
                ['Id', 'Territory2Id']
            );

            var userTerritoryIds = [];
            for (var i = 0; i < (userTerritories || []).length; i++) {
                userTerritoryIds.push(userTerritories[i].stringValue('Territory2Id'));
            }

            var isAligned = false;
            for (var j = 0; j < accountTerritories.length; j++) {
                var terrId = accountTerritories[j].stringValue('Territory2Id');
                if (userTerritoryIds.indexOf(terrId) !== -1) {
                    isAligned = true;
                    break;
                }
            }

            if (!isAligned) {
                return {
                    title: 'This account is not in your assigned territory. Contact your manager to log out-of-territory visits.',
                    status: 'error'
                };
            }
            return { title: 'Territory alignment check passed', status: 'success' };
        } catch (e) {
            return { title: 'Territory check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await territoryAlignmentCheck(contextData);
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
