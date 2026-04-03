(() => {
    console.log('[visitVal06] Script loaded');

    function parseContextData(record) {
        try {
            if (!record || typeof record.getContextData !== 'function') return {};
            var contextData = record.getContextData();
            if (typeof contextData === 'string') return JSON.parse(contextData);
            if (typeof contextData === 'object' && contextData !== null) return contextData;
            return {};
        } catch (e) { return {}; }
    }

    function getFieldData(contextData, baseFieldName) {
        return contextData[baseFieldName + '.VisitId'] || contextData[baseFieldName];
    }

    function unwrapProxy(results) {
        return JSON.parse(JSON.stringify(results));
    }

    async function hcpRequiredForHco(contextData) {
        try {
            var accountId = '';
            if (contextData.ProviderVisit) {
                accountId = contextData.ProviderVisit.AccountId || '';
            }
            if (!accountId) {
                try { accountId = record.stringValue('AccountId'); } catch (e) { }
            }
            if (!accountId) {
                return { title: 'HCP check skipped - no account', status: 'success' };
            }
            console.log('[visitVal06] accountId=' + accountId);

            var accounts = await db.query(
                'Account',
                await new ConditionBuilder('Account', new FieldCondition('Id', '=', accountId)).build(),
                ['Id', 'IsPersonAccount']
            );
            if (accounts && accounts.length > 0 && accounts[0].boolValue('IsPersonAccount')) {
                console.log('[visitVal06] primary account is HCP (person account)');
                return { title: 'HCP check passed - primary account is an HCP', status: 'success' };
            }
            console.log('[visitVal06] primary account is HCO, checking attendees');

            var attendeeVisits = contextData['Visit.ParentVisitId'] || contextData['ChildVisit'];
            console.log('[visitVal06] attendee count=' + (attendeeVisits ? attendeeVisits.length : 0));

            if (!attendeeVisits || attendeeVisits.length === 0) {
                return {
                    title: 'At least one HCP must be associated when visiting an HCO (institution).',
                    status: 'error'
                };
            }

            var attendeeAccountIds = [];
            for (var i = 0; i < attendeeVisits.length; i++) {
                var aid = attendeeVisits[i].AccountId || attendeeVisits[i].accountid;
                if (aid) attendeeAccountIds.push(aid);
            }

            if (attendeeAccountIds.length === 0) {
                return {
                    title: 'At least one HCP must be associated when visiting an HCO (institution).',
                    status: 'error'
                };
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
                    title: 'At least one HCP must be associated when visiting an HCO (institution).',
                    status: 'error'
                };
            }
            return { title: 'HCP check passed - HCO visit has HCP attendee', status: 'success' };
        } catch (e) {
            return { title: 'HCP check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            console.log('[visitVal06] validateVisit called');
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await hcpRequiredForHco(contextData);
            var results = [result];

            if (hasWebField) { var resolved = await Promise.all(results); return unwrapProxy(resolved); }
            return unwrapProxy(results);
        } catch (error) {
            console.log('[visitVal06] error: ' + error.message);
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
