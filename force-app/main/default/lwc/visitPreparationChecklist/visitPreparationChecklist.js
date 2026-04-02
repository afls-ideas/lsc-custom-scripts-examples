/**
 * Visit Preparation Checklist
 *
 * Custom script that validates whether a pharma rep visit is ready to move to the next stage.
 * Checks samples, product detailing, notes, future visits, and compliance status.
 *
 * Returns: Array of {title: string, status: "success"|"error"|"warning"}
 * - success: green check mark
 * - warning: yellow alert
 * - error: red X
 */
import { LightningElement, api } from 'lwc';
import {
    getDataService,
    parseContextData,
    getFieldData
} from 'c/lscCustomScriptUtils';

export default class VisitPreparationChecklist extends LightningElement {
    @api record;

    @api
    async execute() {
        return (async () => {
            const results = [];
            const contextData = parseContextData(this.record);

            // Check 1: Samples added to visit
            try {
                const samplesResult = this.checkSamplesAdded(contextData);
                results.push(samplesResult);
            } catch (error) {
                results.push({
                    title: `Error checking samples: ${error.message}`,
                    status: 'error'
                });
            }

            // Check 2: Product detailing recorded
            try {
                const detailingResult = this.checkDetailedProducts(contextData);
                results.push(detailingResult);
            } catch (error) {
                results.push({
                    title: `Error checking product detailing: ${error.message}`,
                    status: 'error'
                });
            }

            // Check 3: Visit notes recorded
            try {
                const notesResult = this.checkVisitNotes(contextData);
                results.push(notesResult);
            } catch (error) {
                results.push({
                    title: `Error checking visit notes: ${error.message}`,
                    status: 'error'
                });
            }

            // Check 4: Next visit scheduled (async)
            try {
                const nextVisitResult = await this.checkNextVisitScheduled();
                results.push(nextVisitResult);
            } catch (error) {
                results.push({
                    title: `Error checking next visit: ${error.message}`,
                    status: 'error'
                });
            }

            // Check 5: Compliance status
            try {
                const complianceResult = this.checkComplianceStatus(contextData);
                results.push(complianceResult);
            } catch (error) {
                results.push({
                    title: `Error checking compliance: ${error.message}`,
                    status: 'error'
                });
            }

            return results;
        })();
    }

    /**
     * Check if samples have been added to the visit
     * @param {Object} contextData - Parsed context data
     * @returns {Object} Result object with title and status
     */
    checkSamplesAdded(contextData) {
        const samples = getFieldData(contextData, 'ProductDisbursement') || [];

        if (samples.length > 0) {
            return {
                title: `Samples added to visit (${samples.length} sample(s))`,
                status: 'success'
            };
        }

        return {
            title: 'No samples have been added to this visit yet',
            status: 'warning'
        };
    }

    /**
     * Check if products have been detailed during the visit
     * @param {Object} contextData - Parsed context data
     * @returns {Object} Result object with title and status
     */
    checkDetailedProducts(contextData) {
        const detailedProducts = getFieldData(contextData, 'ProviderVisitProdDetailing') || [];

        if (detailedProducts.length > 0) {
            return {
                title: `Product detailing recorded (${detailedProducts.length} product(s))`,
                status: 'success'
            };
        }

        return {
            title: 'No products have been detailed during this visit',
            status: 'warning'
        };
    }

    /**
     * Check if visit notes have been recorded
     * @param {Object} contextData - Parsed context data
     * @returns {Object} Result object with title and status
     */
    checkVisitNotes(contextData) {
        const description = this.record.stringValue('Description') ||
                          contextData.ProviderVisit?.Description;

        if (description && description.trim().length > 0) {
            return {
                title: 'Visit notes have been recorded',
                status: 'success'
            };
        }

        return {
            title: 'Consider adding visit notes before completing',
            status: 'warning'
        };
    }

    /**
     * Check if a next visit is already scheduled for this account
     * @returns {Promise<Object>} Result object with title and status
     */
    async checkNextVisitScheduled() {
        const dataService = getDataService();
        const accountId = this.record.stringValue('AccountId');

        if (!accountId) {
            return {
                title: 'Cannot check next visit - no account associated',
                status: 'warning'
            };
        }

        const query = dataService.newQuery('ProviderVisit');

        // Build conditions: AccountId = current account AND Status = 'Planned' AND PlannedVisitStartTime > now
        const accountCondition = query.fields.stringField('AccountId').eq(accountId);
        const statusCondition = query.fields.stringField('Status').eq('Planned');
        const dateCondition = query.fields.dateTimeField('PlannedVisitStartTime').greaterThan(new Date());

        const andCondition = query.and([accountCondition, statusCondition, dateCondition]);
        query.where(andCondition);

        const results = await query.fetch();

        if (results.totalSize > 0) {
            return {
                title: 'Next visit already scheduled',
                status: 'success'
            };
        }

        return {
            title: 'No future visit scheduled for this account - consider scheduling a follow-up',
            status: 'warning'
        };
    }

    /**
     * Check the compliance agreement status
     * @param {Object} contextData - Parsed context data
     * @returns {Object} Result object with title and status
     */
    checkComplianceStatus(contextData) {
        const complianceStatus = contextData.ProviderVisit?.ComplianceAgreementStatus ||
                                this.record.stringValue('ComplianceAgreementStatus');

        if (complianceStatus === 'Approved') {
            return {
                title: 'Compliance agreement is approved',
                status: 'success'
            };
        }

        if (complianceStatus === 'Expired') {
            return {
                title: 'Compliance agreement has expired - must be renewed',
                status: 'error'
            };
        }

        return {
            title: `Compliance agreement status: ${complianceStatus || 'Not set'}`,
            status: 'warning'
        };
    }
}
