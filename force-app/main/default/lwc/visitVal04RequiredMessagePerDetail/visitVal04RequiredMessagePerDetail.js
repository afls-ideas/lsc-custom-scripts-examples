(() => {
    console.log('[visitVal04] Script loaded');

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

    function requiredMessagePerDetail(contextData) {
        try {
            var detailData = getFieldData(contextData, 'ProviderVisitProdDetailing');
            console.log('[visitVal04] detailData count=' + (detailData ? detailData.length : 0));

            if (!detailData || detailData.length === 0) {
                return { title: 'At least one detailed product with a key message is required.', status: 'error' };
            }

            for (var i = 0; i < detailData.length; i++) {
                var messages = detailData[i]['ProviderVisitDtlProductMsg.VisitId'] || detailData[i]['ProviderVisitDtlProductMsg'];
                console.log('[visitVal04] detail[' + i + '] messages count=' + (messages ? messages.length : 0));

                if (!messages || messages.length === 0) {
                    var productName = '';
                    try {
                        var addlInfo = detailData[i].AdditionalInformation;
                        if (typeof addlInfo === 'string') {
                            var parsed = JSON.parse(addlInfo);
                            productName = parsed.LifeScienceMarketableProduct && parsed.LifeScienceMarketableProduct.Name || '';
                        }
                    } catch (e) { }

                    var msg = productName
                        ? productName + ' is missing key messages. Add at least one message to each detailed product.'
                        : 'Each detailed product must have at least one key message. Add messages to all detailed products.';

                    return { title: msg, status: 'error' };
                }
            }
            return { title: 'Message check passed - all details have messages', status: 'success' };
        } catch (e) {
            return { title: 'Message check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            console.log('[visitVal04] validateVisit called');
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var results = [requiredMessagePerDetail(contextData)];

            if (hasWebField) { var resolved = await Promise.all(results); return unwrapProxy(resolved); }
            return unwrapProxy(results);
        } catch (error) {
            console.log('[visitVal04] error: ' + error.message);
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
