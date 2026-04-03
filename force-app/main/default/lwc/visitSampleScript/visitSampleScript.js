(() => {
    console.log('[visitSampleScript] Script loaded');

    function parseContextData(record) {
        try {
            if (!record || typeof record.getContextData !== 'function') {
                return {};
            }
            const contextData = record.getContextData();
            if (typeof contextData === 'string') {
                return JSON.parse(contextData);
            } else if (typeof contextData === 'object' && contextData !== null) {
                return contextData;
            }
            return {};
        } catch (error) {
            return {};
        }
    }

    async function validateVisit() {
        try {
            console.log('[visitSampleScript] validateVisit called');

            const contextData = parseContextData(record);
            const hasWebField = contextData?.["ProviderVisit"] !== undefined;
            console.log('[visitSampleScript] hasWebField=' + hasWebField);

            const results = [{
                title: "TEST: Visit sample script error - should block submit",
                status: "error"
            }];

            if (hasWebField) {
                return await Promise.all(results);
            }
            return results;
        } catch (error) {
            console.log('[visitSampleScript] error: ' + error.message);
            return [{
                title: "Script error occurred",
                status: "error"
            }];
        }
    }

    if (record && user && env && db) {
        const contextData = parseContextData(record);
        const hasWebField = contextData?.["ProviderVisit"] !== undefined;

        if (hasWebField) {
            return [validateVisit()];
        } else {
            return validateVisit();
        }
    }
})();
