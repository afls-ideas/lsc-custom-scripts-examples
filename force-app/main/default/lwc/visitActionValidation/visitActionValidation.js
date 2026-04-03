/**
 * Simple Visit Action Validation Script
 *
 * Minimal example of a Visit Action Validation custom script.
 * Demonstrates the required return format for web and mobile platforms.
 *
 * Type: VisitActionValidation
 * ObjectName: ProviderVisit
 * OperationEventType: OnUpdate
 *
 * Available globals: record, user, db, env
 */
(() => {
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
            // Add your validation logic here
            // This example always returns success
            const results = [{
                title: "Visit validation passed",
                status: "success"
            }];

            const contextData = parseContextData(record);
            const hasWebField = contextData?.["ProviderVisit"] !== undefined;

            if (hasWebField) {
                return await Promise.all(results);
            }
            return results;
        } catch (error) {
            return [{
                title: "Error in visit validation",
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
