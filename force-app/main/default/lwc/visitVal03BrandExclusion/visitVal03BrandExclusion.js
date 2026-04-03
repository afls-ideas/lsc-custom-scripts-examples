/**
 * 03. Brand Exclusion - Competing Brands Cannot Be Detailed Together
 *
 * Prevents detailing products from competing brand families on the
 * same visit. Reads product names from the AdditionalInformation JSON
 * on each ProviderVisitProdDetailing record.
 *
 * Related objects: ProviderVisitProdDetailing
 * Pattern: parseContextData + AdditionalInformation parsing (synchronous)
 */
(() => {
    console.log('[visitVal03] Script loaded');

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

    function brandExclusionCheck(contextData) {
        try {
            var EXCLUDED_PAIRS = [
                ['Immunexis', 'Cordim']
            ];

            var detailData = getFieldData(contextData, 'ProviderVisitProdDetailing');
            if (!detailData || detailData.length < 2) {
                return { title: 'Brand exclusion check passed', status: 'success' };
            }

            // Extract product name from AdditionalInformation JSON
            var productNames = [];
            for (var i = 0; i < detailData.length; i++) {
                var name = '';
                try {
                    var addlInfo = detailData[i].AdditionalInformation;
                    if (typeof addlInfo === 'string') {
                        var parsed = JSON.parse(addlInfo);
                        name = parsed.LifeScienceMarketableProduct && parsed.LifeScienceMarketableProduct.Name || '';
                    }
                } catch (e) { }
                if (name && productNames.indexOf(name) === -1) {
                    productNames.push(name);
                }
            }
            console.log('[visitVal03] productNames=' + JSON.stringify(productNames));

            for (var p = 0; p < EXCLUDED_PAIRS.length; p++) {
                var foundA = false;
                var foundB = false;
                for (var n = 0; n < productNames.length; n++) {
                    if (productNames[n].indexOf(EXCLUDED_PAIRS[p][0]) !== -1) foundA = true;
                    if (productNames[n].indexOf(EXCLUDED_PAIRS[p][1]) !== -1) foundB = true;
                }
                if (foundA && foundB) {
                    return {
                        title: EXCLUDED_PAIRS[p][0] + ' and ' + EXCLUDED_PAIRS[p][1] + ' cannot be detailed on the same visit.',
                        status: 'error'
                    };
                }
            }
            return { title: 'Brand exclusion check passed', status: 'success' };
        } catch (e) {
            return { title: 'Brand exclusion error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            console.log('[visitVal03] validateVisit called');
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;

            var results = [
                brandExclusionCheck(contextData)
            ];

            console.log('[visitVal03] results count=' + results.length);

            if (hasWebField) {
                var resolved = await Promise.all(results);
                return unwrapProxy(resolved);
            }
            return unwrapProxy(results);
        } catch (error) {
            console.log('[visitVal03] error: ' + error.message);
            return [{ title: 'Brand exclusion error: ' + error.message, status: 'error' }];
        }
    }

    if (record && user && env && db) {
        var contextData = parseContextData(record);
        var hasWebField = contextData['ProviderVisit'] !== undefined;
        if (hasWebField) return [validateVisit()];
        else return validateVisit();
    }
})();
