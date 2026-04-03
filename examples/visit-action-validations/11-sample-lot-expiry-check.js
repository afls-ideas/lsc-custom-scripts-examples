/**
 * 11. Sample Lot Expiry Check
 *
 * Prevents reps from leaving samples whose lot has expired.
 * Queries the ProductItem (lot) record for each disbursement
 * and compares the ExpirationDate to today.
 *
 * Related objects: ProductDisbursement, ProductItem
 * Pattern: db.query + date comparison (async)
 */
async function sampleLotExpiryCheck(contextData) {
    try {
        var samples = getFieldData(contextData, 'ProductDisbursement');
        if (!samples || samples.length === 0) {
            return { title: 'Lot expiry check passed — no samples', status: 'success' };
        }

        var lotIds = [];
        for (var i = 0; i < samples.length; i++) {
            var lotId = samples[i].ProductItemId || samples[i].productitemid;
            if (lotId && lotIds.indexOf(lotId) === -1) {
                lotIds.push(lotId);
            }
        }
        if (lotIds.length === 0) {
            return { title: 'Lot expiry check passed — no lot IDs', status: 'success' };
        }

        var lots = await db.query(
            'ProductItem',
            await new ConditionBuilder('ProductItem', new SetCondition('Id', 'IN', lotIds)).build(),
            ['Id', 'ExpirationDate']
        );

        var today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        for (var j = 0; j < (lots || []).length; j++) {
            var expDate = lots[j].stringValue('ExpirationDate');
            if (expDate && expDate < today) {
                return {
                    title: 'Cannot leave samples from an expired lot (expired ' + expDate + '). Remove or replace the expired sample.',
                    status: 'error'
                };
            }
        }
        return { title: 'Lot expiry check passed', status: 'success' };
    } catch (e) {
        return { title: 'Lot expiry check error: ' + e.message, status: 'error' };
    }
}
