/**
 * 21. Off-Label Product Prevention
 *
 * Prevents detailing products that are not approved for the
 * visited account's specialty. Queries the account's specialty
 * and validates against each detailed product's approved specialties.
 *
 * Related objects: ProviderVisitProdDetailing, Account, Product2
 * Pattern: db.query cross-reference (async)
 */
async function offLabelProductPrevention(contextData) {
    try {
        var detailData = getFieldData(contextData, 'ProviderVisitProdDetailing');
        if (!detailData || detailData.length === 0) {
            return { title: 'Off-label check passed — no details', status: 'success' };
        }

        // Get HCP's specialty
        var accountId = '';
        if (contextData.ProviderVisit) {
            accountId = contextData.ProviderVisit.AccountId || '';
        }
        if (!accountId) {
            return { title: 'Off-label check skipped — no account', status: 'success' };
        }

        var accounts = await db.query(
            'Account',
            await new ConditionBuilder('Account', new FieldCondition('Id', '=', accountId)).build(),
            ['Id', 'Specialty__c']
        );

        var hcpSpecialty = '';
        if (accounts && accounts.length > 0) {
            hcpSpecialty = accounts[0].stringValue('Specialty__c');
        }
        if (!hcpSpecialty) {
            return { title: 'Off-label check skipped — no specialty on account', status: 'success' };
        }

        // Get product IDs from details
        var productIds = [];
        for (var i = 0; i < detailData.length; i++) {
            var pid = detailData[i].Product2Id || detailData[i].product2id;
            if (pid && productIds.indexOf(pid) === -1) {
                productIds.push(pid);
            }
        }

        if (productIds.length === 0) {
            return { title: 'Off-label check passed', status: 'success' };
        }

        var products = await db.query(
            'Product2',
            await new ConditionBuilder('Product2', new SetCondition('Id', 'IN', productIds)).build(),
            ['Id', 'Name', 'ApprovedSpecialties__c']
        );

        // Check each product's approved specialties
        for (var j = 0; j < (products || []).length; j++) {
            var approved = products[j].stringValue('ApprovedSpecialties__c') || '';
            if (approved && approved.indexOf(hcpSpecialty) === -1) {
                return {
                    title: products[j].stringValue('Name') + ' is not approved for ' + hcpSpecialty + ' specialty. Remove this product or select an approved indication.',
                    status: 'error'
                };
            }
        }
        return { title: 'Off-label check passed — all products approved for specialty', status: 'success' };
    } catch (e) {
        return { title: 'Off-label check error: ' + e.message, status: 'error' };
    }
}
