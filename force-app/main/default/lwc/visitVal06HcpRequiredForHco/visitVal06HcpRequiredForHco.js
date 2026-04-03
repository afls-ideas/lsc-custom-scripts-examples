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

    async function hcpRequiredForHco(contextData) {
        try {
            var accountId = record.stringValue('AccountId');
            if (!accountId) {
                accountId = contextData.ProviderVisit && contextData.ProviderVisit.AccountId;
            }
            if (!accountId) {
                return { title: 'HCP check skipped — no account', status: 'success' };
            }

            var accounts = await db.query(
                'Account',
                await new ConditionBuilder('Account', new FieldCondition('Id', '=', accountId)).build(),
                ['Id', 'IsPersonAccount']
            );
            if (accounts && accounts.length > 0 && accounts[0].boolValue('IsPersonAccount')) {
                return { title: 'HCP check passed — primary account is an HCP', status: 'success' };
            }

            var attendeeVisits = contextData['Visit.ParentVisitId'] || contextData['ChildVisit'];
            if (!attendeeVisits || attendeeVisits.length === 0) {
                return {
                    title: 'At least one HCP (Healthcare Professional) must be associated when visiting an HCO.',
                    status: 'error'
                };
            }

            var attendeeAccountIds = [];
            for (var i = 0; i < attendeeVisits.length; i++) {
                var aid = attendeeVisits[i].AccountId || attendeeVisits[i].accountid;
                if (aid) attendeeAccountIds.push(aid);
            }

            var attendeeAccounts = await db.query(
                'Account',
                await new ConditionBuilder('Account', new SetCondition('Id', 'IN', attendeeAccountIds)).build(),
                ['Id', 'IsPersonAccount']
            );

            var hasHCP = false;
            for (var j = 0; j < (attendeeAccounts || []).length; j++) {
                if (attendeeAccounts[j].boolValue('IsPersonAccount')) {
                    hasHCP = true;
                    break;
                }
            }

            if (!hasHCP) {
                return {
                    title: 'At least one HCP (Healthcare Professional) must be associated when visiting an HCO.',
                    status: 'error'
                };
            }
            return { title: 'HCP check passed', status: 'success' };
        } catch (e) {
            return { title: 'HCP validation failed: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await hcpRequiredForHco(contextData);
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
