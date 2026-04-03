/**
 * 18. Consent Verification Before Sampling
 *
 * If samples are being left, verifies that the HCP has an active
 * consent record on file. Required for PDMA compliance.
 *
 * Related objects: ProductDisbursement, IndividualConsent (or custom)
 * Pattern: db.query consent check (async)
 */
async function consentVerificationBeforeSampling(contextData) {
    try {
        var samples = getFieldData(contextData, 'ProductDisbursement');
        if (!samples || samples.length === 0) {
            return { title: 'Consent check passed — no samples', status: 'success' };
        }

        var accountId = '';
        if (contextData.ProviderVisit) {
            accountId = contextData.ProviderVisit.AccountId || '';
        }
        if (!accountId) {
            return { title: 'Consent check skipped — no account', status: 'success' };
        }

        // Query for active consent records for this HCP
        var consents = await db.query(
            'IndividualConsent__c',
            await new ConditionBuilder('IndividualConsent__c',
                new AndCondition([
                    new FieldCondition('AccountId__c', '=', accountId),
                    new FieldCondition('Status__c', '=', 'Active'),
                    new FieldCondition('ConsentType__c', '=', 'Sampling')
                ])
            ).build(),
            ['Id', 'ExpirationDate__c']
        );

        if (!consents || consents.length === 0) {
            return {
                title: 'No active sampling consent on file for this HCP. Obtain consent before leaving samples.',
                status: 'error'
            };
        }

        // Check consent expiration
        var today = new Date().toISOString().split('T')[0];
        var hasValidConsent = false;
        for (var i = 0; i < consents.length; i++) {
            var expDate = consents[i].stringValue('ExpirationDate__c');
            if (!expDate || expDate >= today) {
                hasValidConsent = true;
                break;
            }
        }

        if (!hasValidConsent) {
            return {
                title: 'Sampling consent has expired for this HCP. Please obtain renewed consent.',
                status: 'error'
            };
        }
        return { title: 'Consent verification passed', status: 'success' };
    } catch (e) {
        return { title: 'Consent check error: ' + e.message, status: 'error' };
    }
}
