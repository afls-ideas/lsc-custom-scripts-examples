/**
 * 05. Sample Dependency — If Product A Sampled, Product B Must Also Be Sampled
 *
 * Enforces business rules where sampling one product requires also sampling
 * a companion product. Example: If Immunexis 10mg is sampled, ADRAVIL Sample
 * Pack 5mg must also be sampled (co-promotion agreement).
 *
 * Related objects: ProductDisbursement, ProductItem, Product2
 * Pattern: parseContextData + db.query chain (async)
 */
async function sampleDependencyCheck(contextData) {
    try {
        var samples = getFieldData(contextData, 'ProductDisbursement');
        if (!samples || samples.length === 0) {
            return { title: 'Sample dependency check passed — no samples', status: 'success' };
        }

        // Get product item IDs from samples
        var productItemIds = [];
        for (var i = 0; i < samples.length; i++) {
            var id = samples[i].ProductItemId || samples[i].productitemid;
            if (id) productItemIds.push(id);
        }
        if (productItemIds.length === 0) {
            return { title: 'Sample dependency check passed', status: 'success' };
        }

        // Resolve ProductItem -> Product2 -> Name
        var productItems = await db.query(
            'ProductItem',
            await new ConditionBuilder('ProductItem', new SetCondition('Id', 'IN', productItemIds)).build(),
            ['Id', 'Product2Id']
        );
        var product2Ids = [];
        for (var j = 0; j < (productItems || []).length; j++) {
            var p2Id = productItems[j].stringValue('Product2Id');
            if (p2Id) product2Ids.push(p2Id);
        }

        var products = await db.query(
            'Product2',
            await new ConditionBuilder('Product2', new SetCondition('Id', 'IN', product2Ids)).build(),
            ['Id', 'Name']
        );
        var sampleNames = [];
        for (var k = 0; k < (products || []).length; k++) {
            sampleNames.push(products[k].stringValue('Name'));
        }

        // Define dependency rules — customize for your org
        var dependencies = [
            { ifSampled: 'Immunexis 10mg', thenAlsoRequired: 'ADRAVIL Sample Pack 5mg' },
            { ifSampled: 'Cholecap 20mg', thenAlsoRequired: 'Cardiostat 10mg' }
        ];

        for (var d = 0; d < dependencies.length; d++) {
            var rule = dependencies[d];
            if (sampleNames.indexOf(rule.ifSampled) >= 0 && sampleNames.indexOf(rule.thenAlsoRequired) < 0) {
                return {
                    title: 'If ' + rule.ifSampled + ' is sampled, ' + rule.thenAlsoRequired + ' must also be sampled.',
                    status: 'error'
                };
            }
        }

        return { title: 'Sample dependency check passed', status: 'success' };
    } catch (e) {
        return { title: 'Sample dependency check passed — technical error', status: 'success' };
    }
}
