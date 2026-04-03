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

    async function sampleDependencyCheck(contextData) {
        try {
            // Configure: these products must be sampled together
            var PRODUCT_A = 'Immunexis 10mg';
            var PRODUCT_B = 'Immunexis 15mg';

            var samples = getFieldData(contextData, 'ProductDisbursement');
            env.log('visitVal05 - samples: ' + JSON.stringify(samples));
            if (!samples || samples.length === 0) {
                return { title: 'At least one sample must be dropped before submitting.', status: 'error' };
            }

            var productItemIds = [];
            for (var i = 0; i < samples.length; i++) {
                var piId = samples[i].ProductItemId || samples[i].productitemid;
                if (piId && productItemIds.indexOf(piId) === -1) productItemIds.push(piId);
            }
            env.log('visitVal05 - productItemIds: ' + JSON.stringify(productItemIds));

            var productItems = await db.query(
                'ProductItem',
                await new ConditionBuilder('ProductItem', new SetCondition('Id', 'IN', productItemIds)).build(),
                ['Id', 'Product2Id']
            );
            env.log('visitVal05 - productItems count: ' + (productItems || []).length);

            var productIds = [];
            for (var j = 0; j < (productItems || []).length; j++) {
                var pid = productItems[j].stringValue('Product2Id');
                if (pid && productIds.indexOf(pid) === -1) productIds.push(pid);
            }
            env.log('visitVal05 - productIds: ' + JSON.stringify(productIds));

            var products = await db.query(
                'Product2',
                await new ConditionBuilder('Product2', new SetCondition('Id', 'IN', productIds)).build(),
                ['Id', 'Name']
            );

            var productNames = [];
            for (var k = 0; k < (products || []).length; k++) {
                productNames.push(products[k].stringValue('Name'));
            }
            env.log('visitVal05 - productNames: ' + JSON.stringify(productNames));

            var hasA = productNames.indexOf(PRODUCT_A) !== -1;
            var hasB = productNames.indexOf(PRODUCT_B) !== -1;

            if (hasA && !hasB) {
                return {
                    title: 'When sampling ' + PRODUCT_A + ', ' + PRODUCT_B + ' must also be sampled.',
                    status: 'error'
                };
            }
            return { title: 'Sample dependency check passed', status: 'success' };
        } catch (e) {
            return { title: 'Sample dependency check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await sampleDependencyCheck(contextData);
            var results = [result];
            if (hasWebField) { var resolved = await Promise.all(results); return unwrapProxy(resolved); }
            return unwrapProxy(results);
        } catch (error) {
            return [{ title: 'Validation error: ' + error.message, status: 'error' }];
        }
    }

    env.log('visitVal05 - script loaded');
    if (record && user && env && db) {
        env.log('visitVal05 - globals available, executing');
        var _cd = parseContextData(record);
        env.log('visitVal05 - contextData keys: ' + JSON.stringify(Object.keys(_cd)));
        var contextData = parseContextData(record);
        var hasWebField = contextData['ProviderVisit'] !== undefined;
        if (hasWebField) return [validateVisit()];
        else return validateVisit();
    }
})();
