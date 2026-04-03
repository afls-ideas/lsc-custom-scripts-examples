/**
 * 03. Brand Exclusion — Competing Brands Cannot Be Detailed Together
 *
 * Prevents detailing products from competing brand families on the
 * same visit. Queries Product2 for the Brand field and checks against
 * a configurable exclusion list.
 *
 * Related objects: ProviderVisitProdDetailing, ProductItem, Product2
 * Pattern: db.query chain (async)
 */
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

    async function brandExclusionCheck(contextData) {
        try {
            // Define mutually exclusive brand pairs
            var EXCLUDED_PAIRS = [
                ['BrandA', 'BrandB'],
                ['BrandC', 'BrandD']
            ];

            var detailData = getFieldData(contextData, 'ProviderVisitProdDetailing');
            if (!detailData || detailData.length < 2) {
                return { title: 'Brand exclusion check passed', status: 'success' };
            }

            var productItemIds = [];
            for (var i = 0; i < detailData.length; i++) {
                var piId = detailData[i].ProductItemId || detailData[i].productitemid;
                if (piId && productItemIds.indexOf(piId) === -1) productItemIds.push(piId);
            }
            if (productItemIds.length < 2) {
                return { title: 'Brand exclusion check passed', status: 'success' };
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
                ['Id', 'Name', 'Brand__c']
            );

            var brands = [];
            for (var k = 0; k < (products || []).length; k++) {
                var brand = products[k].stringValue('Brand__c');
                if (brand && brands.indexOf(brand) === -1) brands.push(brand);
            }

            for (var p = 0; p < EXCLUDED_PAIRS.length; p++) {
                if (brands.indexOf(EXCLUDED_PAIRS[p][0]) !== -1 && brands.indexOf(EXCLUDED_PAIRS[p][1]) !== -1) {
                    return {
                        title: EXCLUDED_PAIRS[p][0] + ' and ' + EXCLUDED_PAIRS[p][1] + ' cannot be detailed on the same visit.',
                        status: 'error'
                    };
                }
            }
            return { title: 'Brand exclusion check passed', status: 'success' };
        } catch (e) {
            return { title: 'Brand exclusion check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await brandExclusionCheck(contextData);
            var results = [result];
            if (hasWebField) return await Promise.all(results);
            return results;
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
