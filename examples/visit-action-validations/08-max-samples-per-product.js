/**
 * 08. Max Samples Per Product
 *
 * Limits the quantity of samples that can be left per product per visit.
 * Prevents reps from over-sampling a single product (regulatory compliance).
 *
 * Related objects: ProductDisbursement
 * Pattern: parseContextData + loop aggregation (synchronous)
 */
function maxSamplesPerProduct(contextData) {
    try {
        var MAX_QUANTITY = 3; // Customize per your org's policy
        var samples = getFieldData(contextData, 'ProductDisbursement');
        if (!samples || samples.length === 0) {
            return { title: 'Sample quantity check passed — no samples', status: 'success' };
        }

        // Aggregate quantity per product item
        var quantityByProduct = {};
        for (var i = 0; i < samples.length; i++) {
            var productItemId = samples[i].ProductItemId || samples[i].productitemid;
            var quantity = samples[i].Quantity || samples[i].quantity || 1;
            if (productItemId) {
                quantityByProduct[productItemId] = (quantityByProduct[productItemId] || 0) + quantity;
            }
        }

        for (var pid in quantityByProduct) {
            if (quantityByProduct[pid] > MAX_QUANTITY) {
                return {
                    title: 'Sample quantity exceeds maximum of ' + MAX_QUANTITY + ' per product per visit.',
                    status: 'error'
                };
            }
        }

        return { title: 'Sample quantity check passed', status: 'success' };
    } catch (e) {
        return { title: 'Sample quantity check error: ' + e.message, status: 'error' };
    }
}
