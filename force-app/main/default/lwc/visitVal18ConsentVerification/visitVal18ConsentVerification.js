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

    function getFieldData(contextData, baseFieldName) {
        return contextData[baseFieldName + '.VisitId'] || contextData[baseFieldName];
    }

    function unwrapProxy(results) {
        return JSON.parse(JSON.stringify(results));
    }

    async function consentVerificationBeforeSampling(contextData) {
        try {
            var samples = getFieldData(contextData, 'ProductDisbursement');
            if (!samples || samples.length === 0) {
                return { title: 'Consent check passed - no samples', status: 'success' };
            }

            var accountId = '';
            if (contextData.ProviderVisit) {
                accountId = contextData.ProviderVisit.AccountId || '';
            }
            if (!accountId) {
                return { title: 'Consent check skipped - no account', status: 'success' };
            }

            var consents = await db.query(
                'IndividualConsent__c',
                await new ConditionBuilder('IndividualConsent__c',
                    new AndCondition([
                        new FieldCondition('AccountId__c', '=', accountId),
                        new FieldCondition('Status__c', '=', 'Active'),
                        new FieldCondition('ConsentType__c', '=', 'Sampling')
                    ])
                ).build(),
                ['Id', 'ExpirationDate__c']
            );

            if (!consents || consents.length === 0) {
                return {
                    title: 'No active sampling consent on file for this HCP. Obtain consent before leaving samples.',
                    status: 'error'
                };
            }

            var today = new Date().toISOString().split('T')[0];
            var hasValidConsent = false;
            for (var i = 0; i < consents.length; i++) {
                var expDate = consents[i].stringValue('ExpirationDate__c');
                if (!expDate || expDate >= today) {
                    hasValidConsent = true;
                    break;
                }
            }

            if (!hasValidConsent) {
                return {
                    title: 'Sampling consent has expired for this HCP. Please obtain renewed consent.',
                    status: 'error'
                };
            }
            return { title: 'Consent verification passed', status: 'success' };
        } catch (e) {
            return { title: 'Consent check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await consentVerificationBeforeSampling(contextData);
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
