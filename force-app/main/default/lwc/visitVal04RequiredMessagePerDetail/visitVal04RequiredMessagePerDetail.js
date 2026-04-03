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

    function requiredMessagePerDetail(contextData) {
        try {
            var detailData = getFieldData(contextData, 'ProviderVisitProdDetailing');
            if (!detailData || detailData.length === 0) {
                return { title: 'Message check passed — no details', status: 'success' };
            }

            for (var i = 0; i < detailData.length; i++) {
                var messages = getFieldData(detailData[i], 'ProviderVisitDtlProductMsg');
                if (!messages || messages.length === 0) {
                    return {
                        title: 'Each detailed product must have at least one key message. Add messages to all detailed products.',
                        status: 'error'
                    };
                }
            }
            return { title: 'Message check passed — all details have messages', status: 'success' };
        } catch (e) {
            return { title: 'Message check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var results = [requiredMessagePerDetail(contextData)];
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
