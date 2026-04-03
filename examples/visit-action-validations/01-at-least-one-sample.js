/**
 * 01. At Least One Sample Required
 *
 * Ensures the visit contains at least one sample (ProductDisbursement).
 * Always runs on Submit/Sign.
 *
 * Related objects: ProductDisbursement
 * Pattern: parseContextData + getFieldData (synchronous)
 */
function atLeastOneSampleIsRequired(contextData) {
    try {
        var sampleData = getFieldData(contextData, 'ProductDisbursement');
        var sampleCount = sampleData ? sampleData.length || 0 : 0;
        var hasSamples = sampleCount > 0;
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
