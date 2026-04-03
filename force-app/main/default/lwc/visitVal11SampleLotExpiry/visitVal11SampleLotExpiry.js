(() => {
    function parseContextData(record) {
        try {
            if (!record || typeof record.getContextData !== 'function') return {};
            var contextData = record.getContextData();
            if (typeof contextData === 'string') return JSON.parse(contextData);
            if (typeof contextData === 'object' && contextData !== null) return contextData;
            return {};
        } catch (e) { return {}; }
    }

    function getFieldData(contextData, baseFieldName) {
        return contextData[baseFieldName + '.VisitId'] || contextData[baseFieldName];
    }

    function unwrapProxy(results) {
        return JSON.parse(JSON.stringify(results));
    }

    async function sampleLotExpiryCheck(contextData) {
        try {
            var samples = getFieldData(contextData, 'ProductDisbursement');
            if (!samples || samples.length === 0) {
                return { title: 'Lot expiry check passed - no samples', status: 'success' };
            }

            var lotIds = [];
            for (var i = 0; i < samples.length; i++) {
                var lotId = samples[i].ProductItemId || samples[i].productitemid;
                if (lotId && lotIds.indexOf(lotId) === -1) lotIds.push(lotId);
            }
            if (lotIds.length === 0) {
                return { title: 'Lot expiry check passed - no lot IDs', status: 'success' };
            }

            var lots = await db.query(
                'ProductItem',
                await new ConditionBuilder('ProductItem', new SetCondition('Id', 'IN', lotIds)).build(),
                ['Id', 'ExpirationDate']
            );

            var today = new Date().toISOString().split('T')[0];
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

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await sampleLotExpiryCheck(contextData);
            var results = [result];
            if (hasWebField) { var resolved = await Promise.all(results); return unwrapProxy(resolved); }
            return unwrapProxy(results);
        } catch (error) {
            return [{ title: 'Validation error: ' + error.message, status: 'error' }];
        }
    }

    if (record && user && env && db) {
        var contextData = parseContextData(record);
        var hasWebField = contextData['ProviderVisit'] !== undefined;
        if (hasWebField) return [validateVisit()];
        else return validateVisit();
    }
})();
