/**
 * 02. At Least One Detail and Sample Required
 *
 * Ensures the visit contains both a sample (ProductDisbursement) and
 * a detailed product (ProviderVisitProdDetailing).
 *
 * Related objects: ProductDisbursement, ProviderVisitProdDetailing
 * Pattern: parseContextData + getFieldData (synchronous)
 */
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
