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

    function getCustomField(queryResult, fieldName) {
        if (!queryResult) return null;
        // Web: use sObject property
        if (queryResult.sObject && queryResult.sObject[fieldName] !== undefined) {
            return queryResult.sObject[fieldName];
        }
        // iPad: use noNs_stringValue
        if (typeof queryResult.noNs_stringValue === 'function') {
            var val = queryResult.noNs_stringValue(fieldName);
            if (val !== undefined) return val;
        }
        return null;
    }

    async function accountCustomFieldCheck(contextData) {
        try {
            var visit = contextData.ProviderVisit || {};
            var accountId = visit.AccountId || visit.accountid;
            if (!accountId) {
                try { accountId = record.stringValue('AccountId'); } catch (e) {}
            }
            env.log('visitVal11 - accountId: ' + accountId);

            if (!accountId) {
                return { title: 'Account custom field check skipped - no AccountId', status: 'success' };
            }

            var accountResult = await db.query(
                'Account',
                await new ConditionBuilder(
                    'Account',
                    new FieldCondition('Id', '=', accountId)
                ).build(),
                ['Id', 'Name', 'FieldA__c', 'FieldB__c']
            );

            if (!accountResult || accountResult.length === 0) {
                return { title: 'Account not found', status: 'error' };
            }

            var acct = accountResult[0];
            var fieldA = getCustomField(acct, 'FieldA__c');
            var fieldB = getCustomField(acct, 'FieldB__c');

            env.log('visitVal11 - FieldA__c: ' + fieldA);
            env.log('visitVal11 - FieldB__c: ' + fieldB);

            if (!fieldA) {
                return {
                    title: 'Account is missing FieldA__c.',
                    status: 'error'
                };
            }
            if (!fieldB) {
                return {
                    title: 'Account is missing FieldB__c.',
                    status: 'error'
                };
            }
            return { title: 'Account custom field check passed', status: 'success' };
        } catch (e) {
            env.log('visitVal11 - ERROR: ' + e.message);
            return { title: 'Account custom field check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await accountCustomFieldCheck(contextData);
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
