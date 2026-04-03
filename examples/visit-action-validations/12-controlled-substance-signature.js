/**
 * 12. Controlled Substance Signature Required
 *
 * If any sampled product is flagged as a controlled substance,
 * the visit must have a signature captured before submission.
 * Queries Product2 for the IsControlledSubstance flag.
 *
 * Related objects: ProductDisbursement, ProductItem, Product2, ProviderVisit
 * Pattern: db.query chain (async)
 */
async function controlledSubstanceSignature(contextData) {
    try {
        var samples = getFieldData(contextData, 'ProductDisbursement');
        if (!samples || samples.length === 0) {
            return { title: 'Controlled substance check passed — no samples', status: 'success' };
        }

        // Collect product item IDs
        var productItemIds = [];
        for (var i = 0; i < samples.length; i++) {
            var piId = samples[i].ProductItemId || samples[i].productitemid;
            if (piId && productItemIds.indexOf(piId) === -1) {
                productItemIds.push(piId);
            }
        }
        if (productItemIds.length === 0) {
            return { title: 'Controlled substance check passed', status: 'success' };
        }

        // Get Product2Id from ProductItem
        var productItems = await db.query(
            'ProductItem',
            await new ConditionBuilder('ProductItem', new SetCondition('Id', 'IN', productItemIds)).build(),
            ['Id', 'Product2Id']
        );

        var productIds = [];
        for (var j = 0; j < (productItems || []).length; j++) {
            var pid = productItems[j].stringValue('Product2Id');
            if (pid && productIds.indexOf(pid) === -1) {
                productIds.push(pid);
            }
        }
        if (productIds.length === 0) {
            return { title: 'Controlled substance check passed', status: 'success' };
        }

        // Check if any product is controlled
        var products = await db.query(
            'Product2',
            await new ConditionBuilder('Product2', new SetCondition('Id', 'IN', productIds)).build(),
            ['Id', 'Name', 'IsControlledSubstance__c']
        );

        var hasControlled = false;
        for (var k = 0; k < (products || []).length; k++) {
            if (products[k].boolValue('IsControlledSubstance__c')) {
                hasControlled = true;
                break;
            }
        }

        if (!hasControlled) {
            return { title: 'Controlled substance check passed — no controlled products', status: 'success' };
        }

        // Check for signature on the visit
        var hasSignature = false;
        if (contextData.ProviderVisit) {
            hasSignature = !!contextData.ProviderVisit.SignatureImage;
        }

        if (!hasSignature) {
            return {
                title: 'A signature is required when sampling controlled substances. Please capture a signature before submitting.',
                status: 'error'
            };
        }
        return { title: 'Controlled substance check passed — signature captured', status: 'success' };
    } catch (e) {
        return { title: 'Controlled substance check error: ' + e.message, status: 'error' };
    }
}
