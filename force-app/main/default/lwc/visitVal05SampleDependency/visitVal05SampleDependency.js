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
            // Configure: if TRIGGER product is sampled, REQUIRED product must also be sampled
            var TRIGGER_PRODUCT_NAME = 'Product A Starter Pack';
            var REQUIRED_PRODUCT_NAME = 'Product A Maintenance';

            var samples = getFieldData(contextData, 'ProductDisbursement');
            if (!samples || samples.length === 0) {
                return { title: 'Sample dependency check passed — no samples', status: 'success' };
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

            var products = await db.query(
                'Product2',
                await new ConditionBuilder('Product2', new SetCondition('Id', 'IN', productIds)).build(),
                ['Id', 'Name']
            );

            var productNames = [];
            for (var k = 0; k < (products || []).length; k++) {
                productNames.push(products[k].stringValue('Name'));
            }

            var hasTrigger = productNames.indexOf(TRIGGER_PRODUCT_NAME) !== -1;
            var hasRequired = productNames.indexOf(REQUIRED_PRODUCT_NAME) !== -1;

            if (hasTrigger && !hasRequired) {
                return {
                    title: 'When sampling ' + TRIGGER_PRODUCT_NAME + ', ' + REQUIRED_PRODUCT_NAME + ' must also be sampled.',
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

    if (record && user && env && db) {
        var contextData = parseContextData(record);
        var hasWebField = contextData['ProviderVisit'] !== undefined;
        if (hasWebField) return [validateVisit()];
        else return validateVisit();
    }
})();
