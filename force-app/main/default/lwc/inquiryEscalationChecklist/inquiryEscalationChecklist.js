/**
 * Inquiry Escalation Checklist
 *
 * Custom script that validates whether a medical inquiry is ready for escalation.
 * Checks that responses are documented, priority is set, assigned to specialist,
 * and adverse event screening is complete.
 *
 * Returns: Array of {title: string, status: "success"|"error"|"warning"}
 * - success: green check mark
 * - warning: yellow alert
 * - error: red X
 */
import { LightningElement, api } from 'lwc';
import { getDataService, parseContextData } from 'c/lscCustomScriptUtils';

export default class InquiryEscalationChecklist extends LightningElement {
    @api record;

    @api
    async execute() {
        return (async () => {
            const results = [];
            const contextData = parseContextData(this.record);

            // Check 1: Response documented for all inquiry questions (async)
            try {
                const responseResult = await this.checkResponseDocumented();
                results.push(responseResult);
            } catch (error) {
                results.push({
                    title: `Error checking responses: ${error.message}`,
                    status: 'error'
                });
            }

            // Check 2: Priority level set
            try {
                const priorityResult = this.checkPrioritySet();
                results.push(priorityResult);
            } catch (error) {
                results.push({
                    title: `Error checking priority: ${error.message}`,
                    status: 'error'
                });
            }

            // Check 3: Assigned to medical specialist (async)
            try {
                const specialistResult = await this.checkAssignedToSpecialist();
                results.push(specialistResult);
            } catch (error) {
                results.push({
                    title: `Error checking specialist assignment: ${error.message}`,
                    status: 'error'
                });
            }

            // Check 4: Adverse event screening
            try {
                const adverseEventResult = this.checkAdverseEventScreening(contextData);
                results.push(adverseEventResult);
            } catch (error) {
                results.push({
                    title: `Error checking adverse event screening: ${error.message}`,
                    status: 'error'
                });
            }

            return results;
        })();
    }

    /**
     * Check if all inquiry questions have responses documented
     * @returns {Promise<Object>} Result object with title and status
     */
    async checkResponseDocumented() {
        const dataService = getDataService();
        const inquiryId = this.record.id;

        const query = dataService.newQuery('InquiryQuestion');
        const inquiryCondition = query.fields.stringField('InquiryId').eq(inquiryId);
        query.where(inquiryCondition);

        const results = await query.fetch();

        if (results.totalSize === 0) {
            return {
                title: 'No inquiry questions have been added',
                status: 'error'
            };
        }

        let missingResponses = 0;
        for (const question of results.records) {
            const responseText = question.stringValue('ResponseText');
            if (!responseText || responseText.trim().length === 0) {
                missingResponses++;
            }
        }

        if (missingResponses === 0) {
            return {
                title: `All ${results.totalSize} inquiry questions have responses`,
                status: 'success'
            };
        }

        return {
            title: `${missingResponses} of ${results.totalSize} questions still need responses`,
            status: 'warning'
        };
    }

    /**
     * Check if priority level is set
     * @returns {Object} Result object with title and status
     */
    checkPrioritySet() {
        const priority = this.record.stringValue('Priority');

        if (priority && priority.trim().length > 0) {
            return {
                title: `Priority level set to ${priority}`,
                status: 'success'
            };
        }

        return {
            title: 'Priority level has not been set',
            status: 'warning'
        };
    }

    /**
     * Check if inquiry is assigned to a medical specialist
     * @returns {Promise<Object>} Result object with title and status
     */
    async checkAssignedToSpecialist() {
        const dataService = getDataService();
        const ownerId = this.record.stringValue('OwnerId');

        if (!ownerId) {
            return {
                title: 'No owner assigned',
                status: 'warning'
            };
        }

        const query = dataService.newQuery('User');
        const userCondition = query.fields.stringField('Id').eq(ownerId);
        query.where(userCondition);

        const results = await query.fetch();

        if (results.totalSize === 0) {
            return {
                title: 'Could not verify owner information',
                status: 'warning'
            };
        }

        const user = results.records[0];
        const userName = user.stringValue('Name');
        const profile = user.stringValue('Profile.Name') || '';

        if (profile.includes('Medical') || profile.includes('Specialist')) {
            return {
                title: `Assigned to medical specialist: ${userName}`,
                status: 'success'
            };
        }

        return {
            title: 'Consider reassigning to a medical specialist before escalation',
            status: 'warning'
        };
    }

    /**
     * Check if adverse event screening has been performed
     * @param {Object} contextData - Parsed context data
     * @returns {Object} Result object with title and status
     */
    checkAdverseEventScreening(contextData) {
        const adverseEventIndicator = this.record.stringValue('AdverseEventIndicator') ||
                                     contextData.Inquiry?.AdverseEventIndicator;

        if (adverseEventIndicator === 'true' || adverseEventIndicator === true) {
            return {
                title: 'Adverse event screening completed',
                status: 'success'
            };
        }

        return {
            title: 'Adverse event screening has not been performed',
            status: 'warning'
        };
    }
}
