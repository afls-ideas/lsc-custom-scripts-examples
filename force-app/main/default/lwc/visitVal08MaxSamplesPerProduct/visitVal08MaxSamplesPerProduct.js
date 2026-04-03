(() => {
    console.log('[visitVal08] Script loaded');

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

    function maxSamplesPerProduct(contextData) {
        try {
            var MAX_QUANTITY = 3;
            var samples = getFieldData(contextData, 'ProductDisbursement');
            console.log('[visitVal08] sample count=' + (samples ? samples.length : 0));

            if (!samples || samples.length === 0) {
                return { title: 'Sample quantity check passed - no samples', status: 'success' };
            }

            var quantityByProduct = {};
            var productNames = {};
            for (var i = 0; i < samples.length; i++) {
                var productItemId = samples[i].ProductItemId || samples[i].productitemid;
                var quantity = samples[i].QuantityDisbursed || samples[i].quantitydisbursed || samples[i].Quantity || samples[i].quantity || 1;
                if (productItemId) {
                    quantityByProduct[productItemId] = (quantityByProduct[productItemId] || 0) + quantity;
                    if (!productNames[productItemId]) {
                        try {
                            var addlInfo = samples[i].AdditionalInformation;
                            if (typeof addlInfo === 'string') {
                                var parsed = JSON.parse(addlInfo);
                                productNames[productItemId] = parsed.Product2 && parsed.Product2.Name || '';
                            }
                        } catch (e) { }
                    }
                }
            }
            console.log('[visitVal08] quantityByProduct=' + JSON.stringify(quantityByProduct));

            for (var pid in quantityByProduct) {
                if (quantityByProduct[pid] > MAX_QUANTITY) {
                    var name = productNames[pid] || 'A product';
                    return {
                        title: name + ' exceeds maximum of ' + MAX_QUANTITY + ' samples per visit (found ' + quantityByProduct[pid] + ').',
                        status: 'error'
                    };
                }
            }
            return { title: 'Sample quantity check passed', status: 'success' };
        } catch (e) {
            return { title: 'Sample quantity error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            console.log('[visitVal08] validateVisit called');
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var results = [maxSamplesPerProduct(contextData)];

            if (hasWebField) { var resolved = await Promise.all(results); return unwrapProxy(resolved); }
            return unwrapProxy(results);
        } catch (error) {
            console.log('[visitVal08] error: ' + error.message);
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
