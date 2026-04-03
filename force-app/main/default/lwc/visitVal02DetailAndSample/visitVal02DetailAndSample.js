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

    function atLeastOneDetailAndSample(contextData) {
        try {
            var sampleData = getFieldData(contextData, 'ProductDisbursement');
            var detailData = getFieldData(contextData, 'ProviderVisitProdDetailing');
            var hasSamples = sampleData && sampleData.length > 0;
            var hasDetails = detailData && detailData.length > 0;

            if (hasSamples && hasDetails) {
                return {
                    title: 'Found ' + sampleData.length + ' sample(s) and ' + detailData.length + ' detailed product(s)',
                    status: 'success'
                };
            }
            return {
                title: 'At least one sample and detailed product must be added to the visit.',
                status: 'error'
            };
        } catch (e) {
            return { title: 'At least one sample and detailed product must be added to the visit.', status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var results = [atLeastOneDetailAndSample(contextData)];
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
