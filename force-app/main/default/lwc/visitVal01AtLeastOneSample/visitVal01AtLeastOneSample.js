/**
 * 01. At Least One Sample Required
 *
 * Ensures the rep has added at least one sample (ProductDisbursement)
 * before submitting the visit.
 *
 * Related objects: ProductDisbursement
 * Pattern: parseContextData + getFieldData (synchronous)
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

    function atLeastOneSampleIsRequired(contextData) {
        try {
            var sampleData = getFieldData(contextData, 'ProductDisbursement');
            var hasSamples = sampleData && sampleData.length > 0;
            return {
                title: hasSamples
                    ? 'Found ' + sampleData.length + ' sample(s)'
                    : 'At least one sample must be added to the visit.',
                status: hasSamples ? 'success' : 'error'
            };
        } catch (e) {
            return { title: 'At least one sample must be added to the visit.', status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var results = [atLeastOneSampleIsRequired(contextData)];
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
