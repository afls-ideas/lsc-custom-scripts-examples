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

    async function controlledSubstanceSignature(contextData) {
        try {
            var samples = getFieldData(contextData, 'ProductDisbursement');
            if (!samples || samples.length === 0) {
                return { title: 'Controlled substance check passed — no samples', status: 'success' };
            }

            var productItemIds = [];
            for (var i = 0; i < samples.length; i++) {
                var piId = samples[i].ProductItemId || samples[i].productitemid;
                if (piId && productItemIds.indexOf(piId) === -1) productItemIds.push(piId);
            }
            if (productItemIds.length === 0) {
                return { title: 'Controlled substance check passed', status: 'success' };
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
                return { title: 'Controlled substance check passed', status: 'success' };
            }

            var products = await db.query(
                'Product2',
                await new ConditionBuilder('Product2', new SetCondition('Id', 'IN', productIds)).build(),
                ['Id', 'Name', 'IsControlledSubstance__c']
            );

            var hasControlled = false;
            for (var k = 0; k < (products || []).length; k++) {
                if (products[k].boolValue('IsControlledSubstance__c')) {
                    hasControlled = true;
                    break;
                }
            }

            if (!hasControlled) {
                return { title: 'Controlled substance check passed — no controlled products', status: 'success' };
            }

            var hasSignature = false;
            if (contextData.ProviderVisit) {
                hasSignature = !!contextData.ProviderVisit.SignatureImage;
            }

            if (!hasSignature) {
                return {
                    title: 'A signature is required when sampling controlled substances. Please capture a signature before submitting.',
                    status: 'error'
                };
            }
            return { title: 'Controlled substance check passed — signature captured', status: 'success' };
        } catch (e) {
            return { title: 'Controlled substance check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await controlledSubstanceSignature(contextData);
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
