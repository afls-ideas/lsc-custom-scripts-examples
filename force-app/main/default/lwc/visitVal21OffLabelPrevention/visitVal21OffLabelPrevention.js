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

    async function offLabelProductPrevention(contextData) {
        try {
            var detailData = getFieldData(contextData, 'ProviderVisitProdDetailing');
            if (!detailData || detailData.length === 0) {
                return { title: 'Off-label check passed — no details', status: 'success' };
            }

            var accountId = '';
            if (contextData.ProviderVisit) {
                accountId = contextData.ProviderVisit.AccountId || '';
            }
            if (!accountId) {
                return { title: 'Off-label check skipped — no account', status: 'success' };
            }

            var accounts = await db.query(
                'Account',
                await new ConditionBuilder('Account', new FieldCondition('Id', '=', accountId)).build(),
                ['Id', 'Specialty__c']
            );

            var hcpSpecialty = '';
            if (accounts && accounts.length > 0) {
                hcpSpecialty = accounts[0].stringValue('Specialty__c');
            }
            if (!hcpSpecialty) {
                return { title: 'Off-label check skipped — no specialty on account', status: 'success' };
            }

            var productIds = [];
            for (var i = 0; i < detailData.length; i++) {
                var pid = detailData[i].Product2Id || detailData[i].product2id;
                if (pid && productIds.indexOf(pid) === -1) productIds.push(pid);
            }
            if (productIds.length === 0) {
                return { title: 'Off-label check passed', status: 'success' };
            }

            var products = await db.query(
                'Product2',
                await new ConditionBuilder('Product2', new SetCondition('Id', 'IN', productIds)).build(),
                ['Id', 'Name', 'ApprovedSpecialties__c']
            );

            for (var j = 0; j < (products || []).length; j++) {
                var approved = products[j].stringValue('ApprovedSpecialties__c') || '';
                if (approved && approved.indexOf(hcpSpecialty) === -1) {
                    return {
                        title: products[j].stringValue('Name') + ' is not approved for ' + hcpSpecialty + ' specialty. Remove this product or select an approved indication.',
                        status: 'error'
                    };
                }
            }
            return { title: 'Off-label check passed — all products approved for specialty', status: 'success' };
        } catch (e) {
            return { title: 'Off-label check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await offLabelProductPrevention(contextData);
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
