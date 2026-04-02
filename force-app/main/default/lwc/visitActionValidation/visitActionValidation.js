/**
 * Visit Action Validation Custom Script for Life Sciences Cloud
 *
 * This is a headless Lightning Web Component that validates visit data when a user
 * clicks Sign or Submit on a visit. It implements pharma-specific validation rules
 * including sample requirements, HCP/HCO verification, and product dependencies.
 *
 * Platform Support: Web and Mobile
 * API Version: 62.0
 *
 * @author Salesforce Life Sciences Cloud
 * @version 1.0
 */

(() => {
    'use strict';

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    /**
     * Gets the action name from the environment context.
     * Only runs validation for Submit, Sign, and runCustomScriptValidations actions.
     *
     * @param {Object} env - Environment object containing action context
     * @returns {string} The action name, or empty string if unavailable
     */
    function getActionName(env) {
        try {
            const actionName = env.getOption('actionName');
            return actionName || '';
        } catch (error) {
            console.error('Error getting action name:', error);
            return '';
        }
    }

    /**
     * Safely extracts context data from the record.
     * Handles both JSON strings and Proxy objects returned by different platforms.
     *
     * @param {Object} record - The visit record object
     * @returns {Object} Parsed context data object, or empty object on error
     */
    function parseContextData(record) {
        try {
            const contextData = record.getContextData();

            // If it's already an object (Proxy), return as-is
            if (contextData && typeof contextData === 'object') {
                return contextData;
            }

            // If it's a JSON string, parse it
            if (typeof contextData === 'string') {
                return JSON.parse(contextData);
            }

            return {};
        } catch (error) {
            console.error('Error parsing context data:', error);
            return {};
        }
    }

    /**
     * Platform-aware field data retrieval.
     * Web uses qualified field names like "ProductDisbursement.VisitId"
     * Mobile uses simple field names like "ProductDisbursement"
     *
     * @param {Object} contextData - Parsed context data object
     * @param {string} baseFieldName - Base field name (e.g., "ProductDisbursement")
     * @returns {Array} Field data array, or empty array if not found
     */
    function getFieldData(contextData, baseFieldName) {
        try {
            // Try web format first (qualified field name)
            const webKey = `${baseFieldName}.VisitId`;
            if (contextData[webKey]) {
                return contextData[webKey];
            }

            // Fall back to mobile format (simple field name)
            if (contextData[baseFieldName]) {
                return contextData[baseFieldName];
            }

            return [];
        } catch (error) {
            console.error(`Error getting field data for ${baseFieldName}:`, error);
            return [];
        }
    }

    // ========================================================================
    // ACCOUNT DAO SINGLETON
    // ========================================================================

    /**
     * AccountDAO - Data Access Object for Account-related queries
     * Implements caching and reusable query methods for account data.
     * Uses IIFE module pattern for singleton behavior.
     */
    var accountDao = (() => {
        let _record = null;
        let _db = null;
        let _isPersonAccount = null;
        let _childCallAccounts = null;

        return {
            /**
             * Initializes the DAO with record and database context
             *
             * @param {Object} record - Visit record object
             * @param {Object} db - Database query interface
             * @returns {Promise<void>}
             */
            async initialize(record, db) {
                _record = record;
                _db = db;
                _isPersonAccount = null;
                _childCallAccounts = null;
            },

            /**
             * Checks if the primary account is a Person Account (HCP)
             * Result is cached after first query.
             *
             * @returns {Promise<boolean>} True if Person Account, false otherwise
             */
            async checkForPersonAccount() {
                try {
                    if (_isPersonAccount !== null) {
                        return _isPersonAccount;
                    }

                    const accountId = _record.stringValue('AccountId');
                    if (!accountId) {
                        console.warn('No AccountId found on record');
                        _isPersonAccount = false;
                        return false;
                    }

                    // Query Account to check IsPersonAccount field
                    const entity = 'Account';
                    const condition = new FieldCondition('Id', '=', accountId);
                    const fields = ['IsPersonAccount'];

                    const accounts = await _db.query(
                        entity,
                        await new ConditionBuilder(entity, condition).build(),
                        fields
                    );

                    if (accounts && accounts.length > 0) {
                        _isPersonAccount = accounts[0].boolValue('IsPersonAccount');
                    } else {
                        _isPersonAccount = false;
                    }

                    return _isPersonAccount;
                } catch (error) {
                    console.error('Error checking for person account:', error);
                    _isPersonAccount = false;
                    return false;
                }
            },

            /**
             * Checks if the primary account is an Institution (HCO)
             *
             * @returns {Promise<boolean>} True if Institution, false otherwise
             */
            async checkForInstitution() {
                try {
                    const isPersonAccount = await this.checkForPersonAccount();
                    return !isPersonAccount;
                } catch (error) {
                    console.error('Error checking for institution:', error);
                    return false;
                }
            },

            /**
             * Retrieves all child call accounts (attendees) for the visit
             * Result is cached after first query.
             *
             * @returns {Promise<Array>} Array of Account records for attendees
             */
            async selectChildCallAccountsById() {
                try {
                    if (_childCallAccounts !== null) {
                        return _childCallAccounts;
                    }

                    const contextData = parseContextData(_record);

                    // Get attendees from context data - try both web and mobile formats
                    const attendeeData = getFieldData(contextData, 'Visit.ParentVisitId');

                    if (!attendeeData || attendeeData.length === 0) {
                        console.log('No attendees found in context data');
                        _childCallAccounts = [];
                        return [];
                    }

                    // Extract AccountIds from attendee records
                    const attendeeAccountIds = attendeeData
                        .map(attendee => attendee.AccountId)
                        .filter(id => id !== null && id !== undefined);

                    if (attendeeAccountIds.length === 0) {
                        console.log('No valid AccountIds found in attendees');
                        _childCallAccounts = [];
                        return [];
                    }

                    // Query Account records for attendees
                    const entity = 'Account';
                    const condition = new SetCondition('Id', 'IN', attendeeAccountIds);
                    const fields = ['Id', 'Name', 'IsPersonAccount'];

                    _childCallAccounts = await _db.query(
                        entity,
                        await new ConditionBuilder(entity, condition).build(),
                        fields
                    );

                    return _childCallAccounts || [];
                } catch (error) {
                    console.error('Error selecting child call accounts:', error);
                    _childCallAccounts = [];
                    return [];
                }
            },

            /**
             * Gets cached Person Account status
             * @returns {boolean|null} Cached value or null if not yet queried
             */
            getIsPersonAccount() {
                return _isPersonAccount;
            },

            /**
             * Gets cached Institution status
             * @returns {boolean|null} Cached value or null if not yet queried
             */
            getIsInstitution() {
                return _isPersonAccount !== null ? !_isPersonAccount : null;
            },

            /**
             * Gets cached child call accounts
             * @returns {Array|null} Cached accounts or null if not yet queried
             */
            getChildCallAccounts() {
                return _childCallAccounts;
            }
        };
    })();

    // ========================================================================
    // VALIDATION RULES
    // ========================================================================

    /**
     * Validation Rule 1: At least one sample is required
     *
     * Checks that at least one ProductDisbursement record exists on the visit.
     * This is a basic requirement for visit completion in pharma scenarios.
     *
     * @param {Object} record - Visit record
     * @param {Object} user - Current user context
     * @param {Object} db - Database query interface
     * @param {Object} env - Environment context
     * @returns {Object} Validation result with title and status
     */
    function atLeastOneSampleIsRequired(record, user, db, env) {
        try {
            const contextData = parseContextData(record);
            const samples = getFieldData(contextData, 'ProductDisbursement');

            if (!samples || samples.length === 0) {
                return {
                    title: 'At least one sample must be added to the visit.',
                    status: 'error'
                };
            }

            return {
                title: `Found ${samples.length} sample(s)`,
                status: 'success'
            };
        } catch (error) {
            console.error('Error in atLeastOneSampleIsRequired:', error);
            return {
                title: 'Error validating samples: ' + error.message,
                status: 'error'
            };
        }
    }

    /**
     * Validation Rule 2: At least one detail and sample are required
     *
     * Ensures that the visit includes both product samples (ProductDisbursement)
     * and detailed products (ProviderVisitProdDetailing). This enforces that
     * representatives discuss products they sample.
     *
     * @param {Object} record - Visit record
     * @param {Object} user - Current user context
     * @param {Object} db - Database query interface
     * @param {Object} env - Environment context
     * @returns {Object} Validation result with title and status
     */
    function atLeastOneDetailAndSampleAreRequired(record, user, db, env) {
        try {
            const contextData = parseContextData(record);
            const samples = getFieldData(contextData, 'ProductDisbursement');
            const details = getFieldData(contextData, 'ProviderVisitProdDetailing');

            if ((!samples || samples.length === 0) || (!details || details.length === 0)) {
                return {
                    title: 'At least one sample and detailed product must be added to the visit.',
                    status: 'error'
                };
            }

            return {
                title: `Found ${samples.length} sample(s) and ${details.length} detailed product(s)`,
                status: 'success'
            };
        } catch (error) {
            console.error('Error in atLeastOneDetailAndSampleAreRequired:', error);
            return {
                title: 'Error validating samples and details: ' + error.message,
                status: 'error'
            };
        }
    }

    /**
     * Validation Rule 3: At least one message is required for each visit detail
     *
     * For Field Sales Representatives conducting In-Person visits, ensures that
     * each detailed product has at least one associated message. This enforces
     * proper documentation of product discussions.
     *
     * Only applies when:
     * - User has Field Sales Representative profile
     * - Visit channel is "In-Person"
     *
     * @param {Object} record - Visit record
     * @param {Object} user - Current user context
     * @param {Object} db - Database query interface
     * @param {Object} env - Environment context
     * @returns {Promise<Object>} Validation result with title and status
     */
    async function atLeastOneMessageIsRequiredForEachVisitDetail(record, user, db, env) {
        try {
            // Get user ID and query for profile
            const userId = user.stringValue('Id');
            if (!userId) {
                return {
                    title: 'User ID not found - skipping message validation',
                    status: 'success'
                };
            }

            // Query UserAdditionalInfo to get ProfileIdentifier
            const entity = 'UserAdditionalInfo';
            const condition = new FieldCondition('UserId', '=', userId);
            const fields = ['ProfileIdentifier'];

            const userInfos = await db.query(
                entity,
                await new ConditionBuilder(entity, condition).build(),
                fields
            );

            // Configurable target profile ID - adjust based on org configuration
            const targetProfileId = 'Profile_Id'; // Replace with actual Profile ID in production

            let isFieldSalesRep = false;
            if (userInfos && userInfos.length > 0) {
                const profileId = userInfos[0].stringValue('ProfileIdentifier');
                isFieldSalesRep = profileId === targetProfileId;
            }

            // Check if channel is In-Person
            const channel = record.stringValue('Channel');
            const isInPerson = channel === 'In-Person';

            // Only validate if user is Field Sales Rep AND channel is In-Person
            if (!isFieldSalesRep || !isInPerson) {
                return {
                    title: 'Message validation skipped - conditions not met',
                    status: 'success'
                };
            }

            // Get detailed products and their messages
            const contextData = parseContextData(record);
            const details = getFieldData(contextData, 'ProviderVisitProdDetailing');
            const messages = getFieldData(contextData, 'ProviderVisitDtlProductMsg');

            if (!details || details.length === 0) {
                return {
                    title: 'No detailed products found - skipping message validation',
                    status: 'success'
                };
            }

            // Check that each detail has at least one message
            for (const detail of details) {
                const detailId = detail.Id;
                const hasMessage = messages && messages.some(msg =>
                    msg.ProviderVisitProdDetailingId === detailId
                );

                if (!hasMessage) {
                    return {
                        title: 'At least one message is required for each detailed product when the channel is \'In-Person\' and the user has a \'Field Sales Representative\' profile.',
                        status: 'error'
                    };
                }
            }

            return {
                title: `All ${details.length} detailed product(s) have associated messages`,
                status: 'success'
            };
        } catch (error) {
            console.error('Error in atLeastOneMessageIsRequiredForEachVisitDetail:', error);
            return {
                title: 'Error validating messages: ' + error.message,
                status: 'error'
            };
        }
    }

    /**
     * Validation Rule 4: Specific sample dependency check
     *
     * Implements product co-dependency rules. If "Cholecap 20mg" is added to
     * a visit, "Cardiostat 10mg" must also be added. This enforces pharma
     * compliance requirements for related product sampling.
     *
     * @param {Object} record - Visit record
     * @param {Object} user - Current user context
     * @param {Object} db - Database query interface
     * @param {Object} env - Environment context
     * @returns {Promise<Object>} Validation result with title and status
     */
    async function specificSampleDependencyCheck(record, user, db, env) {
        try {
            const contextData = parseContextData(record);
            const samples = getFieldData(contextData, 'ProductDisbursement');

            if (!samples || samples.length === 0) {
                return {
                    title: 'No samples found - dependency check skipped',
                    status: 'success'
                };
            }

            // Extract ProductItemIds from samples
            const productItemIds = samples
                .map(sample => sample.ProductItemId)
                .filter(id => id !== null && id !== undefined);

            if (productItemIds.length === 0) {
                return {
                    title: 'No product items found - dependency check skipped',
                    status: 'success'
                };
            }

            // Query ProductItem to get Product2Id
            let entity = 'ProductItem';
            let condition = new SetCondition('Id', 'IN', productItemIds);
            let fields = ['Id', 'Product2Id'];

            const productItems = await db.query(
                entity,
                await new ConditionBuilder(entity, condition).build(),
                fields
            );

            if (!productItems || productItems.length === 0) {
                return {
                    title: 'No product items retrieved - dependency check skipped',
                    status: 'success'
                };
            }

            // Extract Product2Ids
            const product2Ids = productItems
                .map(item => item.stringValue('Product2Id'))
                .filter(id => id !== null && id !== undefined);

            if (product2Ids.length === 0) {
                return {
                    title: 'No products found - dependency check skipped',
                    status: 'success'
                };
            }

            // Query Product2 to get Names
            entity = 'Product2';
            condition = new SetCondition('Id', 'IN', product2Ids);
            fields = ['Id', 'Name'];

            const products = await db.query(
                entity,
                await new ConditionBuilder(entity, condition).build(),
                fields
            );

            if (!products || products.length === 0) {
                return {
                    title: 'No products retrieved - dependency check skipped',
                    status: 'success'
                };
            }

            // Check for specific products
            const productNames = products.map(p => p.stringValue('Name'));
            const hasCholecap = productNames.includes('Cholecap 20mg');
            const hasCardiostat = productNames.includes('Cardiostat 10mg');

            // Validation: if Cholecap 20mg is selected, Cardiostat 10mg must also be selected
            if (hasCholecap && !hasCardiostat) {
                return {
                    title: 'If Cholecap 20mg is added to a visit, Cardiostat 10mg must also be added.',
                    status: 'error'
                };
            }

            if (hasCholecap && hasCardiostat) {
                return {
                    title: 'Product dependency satisfied: Both Cholecap 20mg and Cardiostat 10mg are present',
                    status: 'success'
                };
            }

            if (!hasCholecap) {
                return {
                    title: 'Cholecap 20mg not present - dependency check not applicable',
                    status: 'success'
                };
            }

            return {
                title: 'Product dependency check passed',
                status: 'success'
            };
        } catch (error) {
            console.error('Error in specificSampleDependencyCheck:', error);
            return {
                title: 'Error checking product dependencies: ' + error.message,
                status: 'error'
            };
        }
    }

    /**
     * Validation Rule 5: At least one HCP is required
     *
     * Ensures that visits to Healthcare Organizations (HCOs/Institutions) include
     * at least one Healthcare Professional (HCP/Person Account) as an attendee.
     * Visits directly to HCPs pass automatically.
     *
     * @param {Object} record - Visit record
     * @param {Object} user - Current user context
     * @param {Object} db - Database query interface
     * @param {Object} env - Environment context
     * @returns {Promise<Object>} Validation result with title and status
     */
    async function isAtLeastOneHCP(record, user, db, env) {
        try {
            // Initialize account DAO if not already done
            await accountDao.initialize(record, db);

            // Check if primary account is a Person Account (HCP)
            const isPersonAccount = await accountDao.checkForPersonAccount();

            if (isPersonAccount) {
                return {
                    title: 'Visit is to an HCP - validation passed',
                    status: 'success'
                };
            }

            // If visiting an Institution (HCO), check for at least one HCP attendee
            const childAccounts = await accountDao.selectChildCallAccountsById();

            if (!childAccounts || childAccounts.length === 0) {
                return {
                    title: 'At least one HCP (Healthcare Professional) must be associated when creating a visit for an HCO (Healthcare Organization).',
                    status: 'error'
                };
            }

            // Check if at least one attendee is a Person Account
            const hasHCP = childAccounts.some(account =>
                account.boolValue('IsPersonAccount') === true
            );

            if (!hasHCP) {
                return {
                    title: 'At least one HCP (Healthcare Professional) must be associated when creating a visit for an HCO (Healthcare Organization).',
                    status: 'error'
                };
            }

            const hcpCount = childAccounts.filter(account =>
                account.boolValue('IsPersonAccount') === true
            ).length;

            return {
                title: `Found ${hcpCount} HCP attendee(s) for HCO visit`,
                status: 'success'
            };
        } catch (error) {
            console.error('Error in isAtLeastOneHCP:', error);
            return {
                title: 'Error validating HCP requirements: ' + error.message,
                status: 'error'
            };
        }
    }

    /**
     * Validation Rule 6: Only one HCO is allowed
     *
     * Ensures that a visit has at most one Healthcare Organization (HCO) attendee.
     * Multiple HCP attendees are allowed, but only one HCO can be associated.
     *
     * @param {Object} record - Visit record
     * @param {Object} user - Current user context
     * @param {Object} db - Database query interface
     * @param {Object} env - Environment context
     * @returns {Promise<Object>} Validation result with title and status
     */
    async function isMoreThanOneHCO(record, user, db, env) {
        try {
            // Initialize account DAO if not already done
            await accountDao.initialize(record, db);

            // Get child call accounts
            const childAccounts = await accountDao.selectChildCallAccountsById();

            if (!childAccounts || childAccounts.length === 0) {
                return {
                    title: 'No attendees found - HCO count validation skipped',
                    status: 'success'
                };
            }

            // Count non-Person Account attendees (HCOs)
            const hcoCount = childAccounts.filter(account =>
                account.boolValue('IsPersonAccount') === false
            ).length;

            if (hcoCount > 1) {
                return {
                    title: 'Only 1 HCO (Healthcare Organization) attendee can be added per visit.',
                    status: 'error'
                };
            }

            if (hcoCount === 1) {
                return {
                    title: 'HCO count validation passed: 1 HCO attendee',
                    status: 'success'
                };
            }

            return {
                title: 'HCO count validation passed: No HCO attendees',
                status: 'success'
            };
        } catch (error) {
            console.error('Error in isMoreThanOneHCO:', error);
            return {
                title: 'Error validating HCO count: ' + error.message,
                status: 'error'
            };
        }
    }

    // ========================================================================
    // MAIN VALIDATION ENTRY POINT
    // ========================================================================

    /**
     * Main validation function that orchestrates all validation rules
     *
     * @param {Object} record - Visit record
     * @param {Object} user - Current user context
     * @param {Object} db - Database query interface
     * @param {Object} env - Environment context
     * @returns {Promise<Array>} Array of validation results
     */
    async function validateVisit(record, user, db, env) {
        try {
            console.log('Starting visit validation');

            // Initialize account DAO for validation rules that need it
            await accountDao.initialize(record, db);

            // Platform detection - determine if we're on web or mobile
            const contextData = parseContextData(record);
            const hasWebField = contextData?.["ProviderVisit"] !== undefined;
            console.log('Platform detected:', hasWebField ? 'Web' : 'Mobile');

            // Define all validation rules
            const validations = [
                atLeastOneSampleIsRequired,
                atLeastOneDetailAndSampleAreRequired,
                atLeastOneMessageIsRequiredForEachVisitDetail,
                specificSampleDependencyCheck,
                isAtLeastOneHCP,
                isMoreThanOneHCO
            ];

            // Execute all validations in parallel
            const results = await Promise.all(
                validations.map(async (validationFn) => {
                    try {
                        const result = validationFn(record, user, db, env);
                        // Handle both sync and async validation functions
                        return result instanceof Promise ? await result : result;
                    } catch (error) {
                        console.error(`Error in validation ${validationFn.name}:`, error);
                        return {
                            title: `Error in ${validationFn.name}: ${error.message}`,
                            status: 'error'
                        };
                    }
                })
            );

            console.log('Validation completed with', results.length, 'results');
            return results;
        } catch (error) {
            console.error('Fatal error in validateVisit:', error);
            return [{
                title: 'Fatal error during validation: ' + error.message,
                status: 'error'
            }];
        }
    }

    // ========================================================================
    // SCRIPT ENTRY POINT
    // ========================================================================

    // Self-invoking function that runs when script is loaded
    try {
        // Get arguments passed by the platform
        const args = arguments;

        if (!args || args.length < 4) {
            console.error('Insufficient arguments provided to validation script');
            return [{
                title: 'Script initialization error: Missing required arguments',
                status: 'error'
            }];
        }

        const [record, user, db, env] = args;

        // Check if this action should trigger validation
        const actionName = getActionName(env);
        const allowedActions = ['Submit', 'Sign', 'runCustomScriptValidations'];

        if (!allowedActions.includes(actionName)) {
            console.log(`Action '${actionName}' does not require validation`);
            return [{
                title: 'Validation skipped for this action',
                status: 'success'
            }];
        }

        console.log(`Running validation for action: ${actionName}`);

        // Platform-specific return format
        // Web expects array wrapper, mobile expects direct promise
        const contextData = parseContextData(record);
        const hasWebField = contextData?.["ProviderVisit"] !== undefined;

        if (hasWebField) {
            // Web platform - wrap in array
            return [validateVisit(record, user, db, env)];
        } else {
            // Mobile platform - return promise directly
            return validateVisit(record, user, db, env);
        }
    } catch (error) {
        console.error('Fatal error in script entry point:', error);
        return [{
            title: 'Script execution error: ' + error.message,
            status: 'error'
        }];
    }
})();
