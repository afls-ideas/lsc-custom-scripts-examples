/**
 * 03. Brand Exclusion — Certain Brands Cannot Be Detailed Together
 *
 * Prevents detailing competing brands on the same visit. For example,
 * Immunexis and Cardiostat are in the same therapeutic class and
 * should not be promoted together per compliance policy.
 *
 * Related objects: ProviderVisitProdDetailing, Product2
 * Pattern: parseContextData + db.query (async)
 */
async function brandExclusionCheck(contextData) {
    try {
        var detailData = getFieldData(contextData, 'ProviderVisitProdDetailing');
        if (!detailData || detailData.length === 0) {
            return { title: 'Brand exclusion check passed — no details to validate', status: 'success' };
        }

        // Extract product IDs from details
        var productIds = [];
        for (var i = 0; i < detailData.length; i++) {
            var prodId = detailData[i].ProductId || detailData[i].productid;
            if (prodId) productIds.push(prodId);
        }
        if (productIds.length < 2) {
            return { title: 'Brand exclusion check passed', status: 'success' };
        }

        // Query product names
        var products = await db.query(
            'Product2',
            await new ConditionBuilder('Product2', new SetCondition('Id', 'IN', productIds)).build(),
            ['Id', 'Name']
        );

        var productNames = [];
        if (products && products.length > 0) {
            for (var j = 0; j < products.length; j++) {
                productNames.push(products[j].stringValue('Name'));
            }
        }

        // Define exclusion pairs — customize these for your org
        var exclusionPairs = [
            ['Immunexis 10mg', 'Cardiostat 10mg'],
            ['ADRAVIL 20mg', 'Neurofen Plus']
        ];

        for (var p = 0; p < exclusionPairs.length; p++) {
            var brandA = exclusionPairs[p][0];
            var brandB = exclusionPairs[p][1];
            if (productNames.indexOf(brandA) >= 0 && productNames.indexOf(brandB) >= 0) {
                return {
                    title: brandA + ' and ' + brandB + ' cannot be detailed on the same visit.',
                    status: 'error'
                };
            }
        }

        return { title: 'Brand exclusion check passed', status: 'success' };
    } catch (e) {
        return { title: 'Brand exclusion check error: ' + e.message, status: 'error' };
    }
}
