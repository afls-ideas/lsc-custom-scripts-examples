(() => {
    console.log('[visitSampleScript] Script loaded');

    function parseContextData(record) {
        try {
            if (!record || typeof record.getContextData !== 'function') {
                return {};
            }
            var contextData = record.getContextData();
            if (typeof contextData === 'string') {
                return JSON.parse(contextData);
            } else if (typeof contextData === 'object' && contextData !== null) {
                return contextData;
            }
            return {};
        } catch (error) {
            return {};
        }
    }

    function getFieldData(contextData, baseFieldName) {
        var webField = baseFieldName + '.VisitId';
        return contextData[webField] || contextData[baseFieldName];
    }

    function unwrapProxy(results) {
        return JSON.parse(JSON.stringify(results));
    }

    function atLeastOneSampleIsRequired(contextData) {
        try {
            var sampleData = getFieldData(contextData, 'ProductDisbursement');
            var hasSamples = false;
            var sampleCount = 0;
            if (sampleData) {
                try {
                    sampleCount = sampleData.length || 0;
                    hasSamples = sampleCount > 0;
                } catch (e) {
                    hasSamples = false;
                }
            }
            return {
                title: hasSamples
                    ? 'Found ' + sampleCount + ' sample(s)'
                    : 'At least one sample must be added to the visit.',
                status: hasSamples ? 'success' : 'error'
            };
        } catch (e) {
            return { title: 'At least one sample must be added to the visit.', status: 'error' };
        }
    }

    function atLeastOneDetailAndSampleAreRequired(contextData) {
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
            console.log('[visitSampleScript] validateVisit called');

            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            console.log('[visitSampleScript] hasWebField=' + hasWebField);

            var results = [
                atLeastOneSampleIsRequired(contextData),
                atLeastOneDetailAndSampleAreRequired(contextData)
            ];

            console.log('[visitSampleScript] results count=' + results.length);

            if (hasWebField) {
                var resolved = await Promise.all(results);
                return unwrapProxy(resolved);
            }
            return unwrapProxy(results);
        } catch (error) {
            console.log('[visitSampleScript] error: ' + error.message);
            return [{
                title: 'Validation error: ' + error.message,
                status: 'error'
            }];
        }
    }

    if (record && user && env && db) {
        var contextData = parseContextData(record);
        var hasWebField = contextData['ProviderVisit'] !== undefined;

        if (hasWebField) {
            return [validateVisit()];
        } else {
            return validateVisit();
        }
    }
})();
