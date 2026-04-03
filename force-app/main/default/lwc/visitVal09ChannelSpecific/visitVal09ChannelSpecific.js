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

    function inPersonRequiresDetails(contextData) {
        try {
            var visit = contextData.ProviderVisit || {};
            var visitChannel = visit.Channel || visit.channel || '';
            env.log('visitVal09 - Channel: ' + visitChannel);

            if (visitChannel !== 'In-Person') {
                return { title: 'Channel check skipped - visit is ' + (visitChannel || 'unknown'), status: 'success' };
            }

            var detailData = getFieldData(contextData, 'ProviderVisitProdDetailing');
            env.log('visitVal09 - detailData: ' + JSON.stringify(detailData));
            var hasDetails = detailData && detailData.length > 0;

            if (!hasDetails) {
                return {
                    title: 'In-Person visits must include at least one detailed product discussion.',
                    status: 'error'
                };
            }
            return { title: 'In-Person detail check passed - ' + detailData.length + ' detail(s)', status: 'success' };
        } catch (e) {
            return { title: 'In-Person visits require at least one detailed product: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var results = [inPersonRequiresDetails(contextData)];
            if (hasWebField) { var resolved = await Promise.all(results); return unwrapProxy(resolved); }
            return unwrapProxy(results);
        } catch (error) {
            return [{ title: 'Validation error: ' + error.message, status: 'error' }];
        }
    }

    env.log('visitVal09 - script loaded');
    if (record && user && env && db) {
        env.log('visitVal09 - globals available, executing');
        var contextData = parseContextData(record);
        var hasWebField = contextData['ProviderVisit'] !== undefined;
        if (hasWebField) return [validateVisit()];
        else return validateVisit();
    }
})();
