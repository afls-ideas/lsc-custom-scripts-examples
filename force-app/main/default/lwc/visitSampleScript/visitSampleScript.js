/**
 * Visit Action Validation Script (visitSampleScript)
 *
 * Validates business rules before a user can sign or submit a visit.
 * Based on the official LSC Custom Scripts documentation example.
 *
 * Type: VisitActionValidation
 * ObjectName: ProviderVisit
 * OperationEventType: OnUpdate
 *
 * Validation Rules:
 *   1. atLeastOneSampleIsRequired — visit must have at least one sample
 *   2. atLeastOneDetailAndSampleAreRequired — both sample and detailed product required
 *   3. atLeastOneMessageIsRequiredForEachVisitDetail — each detail needs a message (Field Sales Rep, In-Person only)
 *   4. specificSampleDependencyCheck — if Immunexis 10mg is added, ADRAVIL Sample Pack 5mg must also be added
 *   5. isAtLeastOneHCP — HCO visits must have at least one HCP attendee
 *   6. isMoreThanOneHCO — only one HCO attendee per visit
 *
 * Available globals: record, user, db, env
 * Available classes: ConditionBuilder, FieldCondition, SetCondition
 */
(() => {
    let hasWebField = false;

    function getActionName(env) {
        try {
            if (env && typeof env.getOption === 'function') {
                return env.getOption('actionName') || '';
            }
            return '';
        } catch (error) {
            return '';
        }
    }

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

    function getFieldData(contextData, baseFieldName) {
        const webField = `${baseFieldName}.VisitId`;
        const mobileField = baseFieldName;
        return contextData?.[webField] || contextData?.[mobileField];
    }

    // AccountDAO — singleton for account-related queries
    var accountDao = (function () {
        var instance;
        var currentRecord;
        var isPersonAccount;
        var isInstitution;
        var childCallAccounts;
        var accountCache = new Map();

        async function checkForPersonAccount() {
            let accountId = currentRecord.stringValue("AccountId");
            if (!accountId) {
                try {
                    const contextData = parseContextData(currentRecord);
                    accountId = contextData.ProviderVisit?.AccountId ||
                        contextData.Visit?.AccountId ||
                        contextData.AccountId;
                } catch (e) {
                    accountId = null;
                }
            }
            if (!accountId) return false;
            try {
                let account = await selectAccountById(accountId);
                return account && account.length > 0 ? account[0].boolValue("IsPersonAccount") : false;
            } catch (error) {
                return false;
            }
        }

        async function checkForInstitution() {
            let accountId = currentRecord.stringValue("AccountId");
            if (!accountId) {
                try {
                    const contextData = parseContextData(currentRecord);
                    accountId = contextData.ProviderVisit?.AccountId ||
                        contextData.Visit?.AccountId ||
                        contextData.AccountId;
                } catch (e) { /* continue */ }
            }
            if (!accountId) return false;
            try {
                let account = await selectAccountById(accountId);
                let personAccount = account && account.length > 0 ? account[0].boolValue("IsPersonAccount") : false;
                return !personAccount;
            } catch (error) {
                return false;
            }
        }

        async function selectChildCallAccountsById() {
            let contextData;
            try {
                contextData = parseContextData(currentRecord);
            } catch (error) {
                return [];
            }
            const attendeeVisits = contextData?.["Visit.ParentVisitId"] || contextData?.["ChildVisit"];
            if (!Array.isArray(attendeeVisits) || attendeeVisits.length === 0) return [];

            const attendeeAccountIds = attendeeVisits
                .map(visit => visit.AccountId || visit.accountid)
                .filter(accountId => accountId);
            if (attendeeAccountIds.length === 0) return [];

            let result = await db.query(
                "Account",
                await new ConditionBuilder(
                    "Account",
                    new SetCondition("Id", "IN", attendeeAccountIds)
                ).build(),
                ["Id", "Name", "IsPersonAccount"]
            );
            return result || [];
        }

        async function selectAccountById(accountId) {
            if (accountCache.has(accountId)) return accountCache.get(accountId);
            let accounts = await db.query(
                "Account",
                await new ConditionBuilder(
                    "Account",
                    new FieldCondition("Id", "=", accountId)
                ).build(),
                ["Id", "Name", "IsPersonAccount"]
            );
            accountCache.set(accountId, accounts);
            return accounts;
        }

        var initialize = async function(record) {
            currentRecord = record;
            accountCache.clear();
            isPersonAccount = await checkForPersonAccount();
            isInstitution = await checkForInstitution();
            childCallAccounts = await selectChildCallAccountsById();
        };

        var createInstance = function () {
            return {
                initialize: initialize,
                getIsPersonAccount: function () { return isPersonAccount; },
                getChildCallAccounts: function () { return childCallAccounts; },
                getIsInstitution: function () { return isInstitution; },
            };
        };

        return {
            getInstance: function () {
                return instance || (instance = createInstance());
            },
        };
    })();

    // --- Validation Rules ---

    function atLeastOneSampleIsRequired() {
        try {
            const contextData = parseContextData(record);
            const sampleData = getFieldData(contextData, "ProductDisbursement") || null;
            let sampleCount = 0;
            let hasSamples = false;
            if (sampleData) {
                try {
                    sampleCount = sampleData.length || 0;
                    hasSamples = sampleCount > 0;
                } catch (e) {
                    const keys = Object.keys(sampleData);
                    hasSamples = keys.length > 0;
                    sampleCount = keys.length;
                }
            }
            return {
                title: hasSamples ?
                    `Found ${sampleCount} sample(s)` :
                    "At least one sample must be added to the visit.",
                status: hasSamples ? "success" : "error"
            };
        } catch (e) {
            return { title: "At least one sample must be added to the visit.", status: "error" };
        }
    }

    function atLeastOneDetailAndSampleAreRequired() {
        try {
            const contextData = parseContextData(record);
            const productDisbursementData = getFieldData(contextData, "ProductDisbursement");
            const providerVisitProdDetailingData = getFieldData(contextData, "ProviderVisitProdDetailing");
            let sampleCount = 0;
            let detailCount = 0;
            let hasProductDisbursement = false;
            let hasProviderVisitProdDetailing = false;

            if (productDisbursementData) {
                try {
                    sampleCount = productDisbursementData.length || 0;
                    hasProductDisbursement = sampleCount > 0;
                } catch (e) {
                    sampleCount = Object.keys(productDisbursementData || {}).length;
                    hasProductDisbursement = sampleCount > 0;
                }
            }
            if (providerVisitProdDetailingData) {
                try {
                    detailCount = providerVisitProdDetailingData.length || 0;
                    hasProviderVisitProdDetailing = detailCount > 0;
                } catch (e) {
                    detailCount = Object.keys(providerVisitProdDetailingData).length;
                    hasProviderVisitProdDetailing = detailCount > 0;
                }
            }

            if (hasProductDisbursement && hasProviderVisitProdDetailing) {
                return {
                    title: `Found ${sampleCount} sample(s) and ${detailCount} detailed product(s)`,
                    status: "success"
                };
            }
            return {
                title: "At least one sample and detailed product must be added to the visit.",
                status: "error"
            };
        } catch (e) {
            return { title: "At least one sample and detailed product must be added to the visit.", status: "error" };
        }
    }

    async function atLeastOneMessageIsRequiredForEachVisitDetail() {
        try {
            let userId;
            if (user) {
                try { userId = user.stringValue('Id'); } catch (e) { userId = user.Id || user["Id"]; }
            }
            if (!userId) {
                return { title: 'Profile validation skipped - no userId available', status: "success" };
            }

            // Replace Profile_Id with the actual profile ID for Field Sales Representative
            let targetProfileId = 'Profile_Id';
            let userAdditionalInfoResults;
            let isFieldSalesRep = false;
            try {
                userAdditionalInfoResults = await db.query(
                    "UserAdditionalInfo",
                    await new ConditionBuilder(
                        "UserAdditionalInfo",
                        new FieldCondition("UserId", "=", userId)
                    ).build(),
                    ["Id", "ProfileIdentifier"]
                );
                if (userAdditionalInfoResults && userAdditionalInfoResults.length > 0) {
                    isFieldSalesRep = userAdditionalInfoResults[0].stringValue('ProfileIdentifier') === targetProfileId;
                } else {
                    return { title: 'Profile validation skipped - profile not found', status: "success" };
                }
            } catch (error) {
                return { title: 'Profile validation skipped - unable to query profile', status: "success" };
            }

            if (!isFieldSalesRep) {
                return { title: 'Profile validation skipped - user is not Field Sales Representative', status: "success" };
            }

            const visitData = parseContextData(record);
            const visitChannel = visitData?.Visit?.channel || visitData?.ProviderVisit?.Channel || '';
            if (visitChannel !== "In-Person") {
                return { title: `Message validation skipped - visit channel is "${visitChannel}", not "In-Person"`, status: "success" };
            }

            const visitDetails = getFieldData(visitData, "ProviderVisitProdDetailing");
            if (!Array.isArray(visitDetails) || visitDetails.length === 0) {
                return { title: 'Message validation passed - no visit details to validate', status: "success" };
            }

            let detailsWithoutMessages = [];
            visitDetails.forEach((detail, index) => {
                const messages = getFieldData(detail, "ProviderVisitDtlProductMsg");
                if (!Array.isArray(messages) || messages.length === 0) {
                    detailsWithoutMessages.push({ index: index + 1 });
                }
            });

            if (detailsWithoutMessages.length > 0) {
                return {
                    title: "At least one message is required for each detailed product when the channel is 'In-Person' and the user has a 'Field Sales Representative' profile.",
                    status: "error"
                };
            }
            return {
                title: `All ${visitDetails.length} detailed products have messages`,
                status: "success"
            };
        } catch (error) {
            return {
                title: "At least one message is required for each detailed product when the channel is 'In-Person' and the user has a 'Field Sales Representative' profile.",
                status: "error"
            };
        }
    }

    async function specificSampleDependencyCheck() {
        try {
            let visitData = parseContextData(record);
            let samples = getFieldData(visitData, "ProductDisbursement");
            let samplesCount = 0;
            if (samples) {
                try { samplesCount = samples.length || 0; } catch (e) { samplesCount = Object.keys(samples || {}).length; }
            }
            if (samplesCount === 0) {
                return { title: 'Sample dependency validation passed - no samples to validate', status: "success" };
            }

            let productItemIds = [];
            for (let i = 0; i < samplesCount; i++) {
                try {
                    const sample = samples[i];
                    if (sample) {
                        const productItemId = sample.ProductItemId || sample.productitemid;
                        productItemIds.push(productItemId);
                    }
                } catch (e) { /* skip */ }
            }
            if (productItemIds.length === 0) {
                return { title: 'Sample dependency validation passed - no product item IDs found', status: "success" };
            }

            let productItems = await db.query(
                "ProductItem",
                await new ConditionBuilder("ProductItem", new SetCondition("Id", "IN", productItemIds)).build(),
                ["Id", "Product2Id"]
            );

            let product2Ids = [];
            let productItemToProduct2Map = new Map();
            if (productItems && Array.isArray(productItems)) {
                productItems.forEach(item => {
                    const product2Id = item.stringValue("Product2Id");
                    if (product2Id) {
                        product2Ids.push(product2Id);
                        productItemToProduct2Map.set(item.stringValue("Id"), product2Id);
                    }
                });
            }

            let product2Items = await db.query(
                "Product2",
                await new ConditionBuilder("Product2", new SetCondition("Id", "IN", product2Ids)).build(),
                ["Id", "Name"]
            );
            let product2NameMap = new Map();
            if (product2Items && Array.isArray(product2Items)) {
                product2Items.forEach(item => product2NameMap.set(item.stringValue("Id"), item.stringValue("Name")));
            }

            let sampleNames = [];
            for (let i = 0; i < samplesCount; i++) {
                try {
                    const sample = samples[i];
                    if (sample) {
                        const productItemId = sample.ProductItemId || sample.productitemid;
                        const product2Id = productItemToProduct2Map.get(productItemId);
                        const productName = product2Id ? product2NameMap.get(product2Id) : null;
                        if (productName) sampleNames.push(productName);
                    }
                } catch (e) { /* skip */ }
            }

            const targetSample = "Immunexis 10mg";
            const requiredSample = "ADRAVIL Sample Pack 5mg";
            if (sampleNames.includes(targetSample)) {
                if (!sampleNames.includes(requiredSample)) {
                    return {
                        title: "If Immunexis 10mg is added to a visit, ADRAVIL Sample Pack 5mg must also be added.",
                        status: "error"
                    };
                }
                return { title: "Sample dependency validation passed - both required samples present", status: "success" };
            }
            return { title: "Sample dependency validation passed - no Immunexis 10mg found", status: "success" };
        } catch (error) {
            return { title: "Sample dependency validation passed - technical error occurred", status: "success" };
        }
    }

    async function isAtLeastOneHCP() {
        try {
            let isPersonAccount = await accountDao.getInstance().getIsPersonAccount();
            if (isPersonAccount) {
                return { title: "HCP validation passed - current account is a Person Account (HCP)", status: "success" };
            }

            let isInstitution = await accountDao.getInstance().getIsInstitution();
            if (!isInstitution) {
                return { title: "HCP validation skipped - account is not an Institution Account", status: "success" };
            }

            let childCallAccounts = await accountDao.getInstance().getChildCallAccounts();
            let hasHCP = false;
            let hcpAttendees = [];
            if (Array.isArray(childCallAccounts) && childCallAccounts.length > 0) {
                for (let i = 0; i < childCallAccounts.length; i++) {
                    if (childCallAccounts[i].boolValue("IsPersonAccount")) {
                        hasHCP = true;
                        hcpAttendees.push(childCallAccounts[i].stringValue("Name") || childCallAccounts[i].stringValue("Id"));
                    }
                }
            }
            if (!hasHCP) {
                return {
                    title: "At least one HCP (Healthcare Professional) must be associated when creating a visit for an HCO (Healthcare Organization).",
                    status: "error"
                };
            }
            return { title: `HCP validation passed - ${hcpAttendees.length} HCP attendee(s)`, status: "success" };
        } catch (error) {
            return { title: "HCP validation failed - error occurred during validation", status: "error" };
        }
    }

    async function isMoreThanOneHCO() {
        try {
            let counter = 0;
            let isPersonAccount = await accountDao.getInstance().getIsPersonAccount();
            let accsRelatedToChildCall = await accountDao.getInstance().getChildCallAccounts();

            if (isPersonAccount || accsRelatedToChildCall.length) {
                for (let i = 0; i < accsRelatedToChildCall.length; i++) {
                    if (!accsRelatedToChildCall[i].boolValue("IsPersonAccount")) {
                        counter++;
                    }
                }
            } else {
                counter++;
            }

            if (counter > 1) {
                return { title: "Only 1 HCO (Healthcare Organization) attendee can be added per visit.", status: "error" };
            }
            return { title: `HCO count validation passed - found ${counter} HCO account(s)`, status: "success" };
        } catch (error) {
            return { title: "HCO count validation failed - error occurred during validation", status: "error" };
        }
    }

    // --- Main validation orchestrator ---

    async function validateVisit() {
        try {
            if (!record) {
                return [{ title: "Error in validation", status: "error" }];
            }

            await accountDao.getInstance().initialize(record);

            const validationFunctions = [
                atLeastOneSampleIsRequired,
                atLeastOneDetailAndSampleAreRequired,
                atLeastOneMessageIsRequiredForEachVisitDetail,
                specificSampleDependencyCheck,
                isAtLeastOneHCP,
                isMoreThanOneHCO,
            ];

            const validationResults = validationFunctions.map((validationFn) => {
                try {
                    const result = validationFn();
                    if (result && typeof result.then === 'function') {
                        return result.catch(error => ({
                            title: `Error in ${validationFn.name}: ${error.message}`,
                            status: "error"
                        }));
                    }
                    return result;
                } catch (error) {
                    return { title: `Error in ${validationFn.name}: ${error.message}`, status: "error" };
                }
            });

            let resolvedResults;
            if (hasWebField) {
                resolvedResults = await Promise.all(validationResults);
            } else {
                resolvedResults = validationResults;
            }

            return Array.isArray(resolvedResults) ? resolvedResults : [resolvedResults];
        } catch (error) {
            return [{ title: "Error in validation", status: "error" }];
        }
    }

    // --- Entry point ---

    if (record && user && env && db) {
        const actionName = getActionName(env);
        const allowedActions = ['Submit', 'Sign', 'runCustomScriptValidations'];
        if (!allowedActions.includes(actionName)) {
            return [{ title: `Validation skipped - action is "${actionName}"`, status: 'success' }];
        }

        const contextData = parseContextData(record);
        hasWebField = contextData?.["ProviderVisit"] !== undefined;

        if (hasWebField) {
            return [validateVisit()];
        } else {
            return validateVisit();
        }
    }
})();
