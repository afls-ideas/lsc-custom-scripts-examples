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

    async function formularyStatusWarning(contextData) {
        try {
            var samples = getFieldData(contextData, 'ProductDisbursement');
            if (!samples || samples.length === 0) {
                return { title: 'Formulary check passed — no samples', status: 'success' };
            }

            var accountId = '';
            if (contextData.ProviderVisit) {
                accountId = contextData.ProviderVisit.AccountId || '';
            }
            if (!accountId) {
                return { title: 'Formulary check skipped — no account', status: 'success' };
            }

            var accounts = await db.query(
                'Account',
                await new ConditionBuilder('Account', new FieldCondition('Id', '=', accountId)).build(),
                ['Id', 'IsPersonAccount']
            );
            if (accounts && accounts.length > 0 && accounts[0].boolValue('IsPersonAccount')) {
                return { title: 'Formulary check skipped — account is an HCP', status: 'success' };
            }

            var productItemIds = [];
            for (var i = 0; i < samples.length; i++) {
                var piId = samples[i].ProductItemId || samples[i].productitemid;
                if (piId && productItemIds.indexOf(piId) === -1) productItemIds.push(piId);
            }

            var productItems = await db.query(
                'ProductItem',
                await new ConditionBuilder('ProductItem', new SetCondition('Id', 'IN', productItemIds)).build(),
                ['Id', 'Product2Id']
            );

            var productIds = [];
            for (var j = 0; j < (productItems || []).length; j++) {
                var pid = productItems[j].stringValue('Product2Id');
                if (pid && productIds.indexOf(pid) === -1) productIds.push(pid);
            }
            if (productIds.length === 0) {
                return { title: 'Formulary check passed', status: 'success' };
            }

            var formularyProducts = await db.query(
                'FormularyProduct__c',
                await new ConditionBuilder('FormularyProduct__c',
                    new AndCondition([
                        new FieldCondition('AccountId__c', '=', accountId),
                        new SetCondition('Product2Id__c', 'IN', productIds),
                        new FieldCondition('Status__c', '=', 'Active')
                    ])
                ).build(),
                ['Id', 'Product2Id__c']
            );

            var onFormularyIds = [];
            for (var k = 0; k < (formularyProducts || []).length; k++) {
                onFormularyIds.push(formularyProducts[k].stringValue('Product2Id__c'));
            }

            var offFormulary = [];
            for (var m = 0; m < productIds.length; m++) {
                if (onFormularyIds.indexOf(productIds[m]) === -1) {
                    offFormulary.push(productIds[m]);
                }
            }

            if (offFormulary.length > 0) {
                return {
                    title: offFormulary.length + ' sampled product(s) are not on this institution\'s formulary. Remove non-formulary samples before submitting.',
                    status: 'error'
                };
            }
            return { title: 'Formulary check passed — all products on formulary', status: 'success' };
        } catch (e) {
            return { title: 'Formulary check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await formularyStatusWarning(contextData);
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
