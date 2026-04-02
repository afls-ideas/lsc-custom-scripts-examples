/**
 * Simple Checklist Example
 *
 * This is the simplest possible checklist custom script.
 * It demonstrates common checklist patterns with clear explanations.
 *
 * CUSTOM SCRIPT FRAMEWORK:
 * - Custom scripts are headless LWC components (only .js and .js-meta.xml files)
 * - They have an @api execute() method that returns results
 * - For async operations, execute() can return a Promise
 * - The @api record property gives you access to the current record data
 *
 * RESULT FORMAT:
 * [{title: "message", status: "success"|"error"|"warning"}]
 *
 * STATUS VISUAL INDICATORS:
 * - "success" = green check mark (requirement met)
 * - "warning" = yellow alert triangle (review needed)
 * - "error" = red X (critical issue blocking progress)
 *
 * CHECKLIST USE CASES:
 * - Show on info icon for Record Update actions
 * - Guide users through completion requirements
 * - Surface important warnings before proceeding
 * - Validate data quality before stage transitions
 */
import { LightningElement, api } from 'lwc';

export default class SimpleChecklistExample extends LightningElement {
    /**
     * The @api record property is automatically populated by the framework
     * with the current record's data. Access fields using:
     * - record.stringValue('FieldName') for text/picklist fields
     * - record.dateValue('FieldName') for date fields
     * - record.numberValue('FieldName') for number fields
     * - record.id for the record ID
     */
    @api record;

    /**
     * The execute method is the entry point for custom scripts.
     * This example is synchronous, but you can make it async if needed.
     *
     * @returns {Array} Array of result objects with title and status
     */
    @api
    execute() {
        const results = [];

        // Check 1: Verify a required field is populated
        try {
            const accountName = this.record.stringValue('Name');

            if (accountName && accountName.trim().length > 0) {
                results.push({
                    title: 'Account name is set',
                    status: 'success'
                });
            } else {
                results.push({
                    title: 'Account name is required',
                    status: 'warning'
                });
            }
        } catch (error) {
            results.push({
                title: `Error checking account name: ${error.message}`,
                status: 'error'
            });
        }

        // Check 2: Verify a date field is set
        try {
            const lastActivityDate = this.record.stringValue('LastActivityDate');

            if (lastActivityDate) {
                results.push({
                    title: 'Last activity date is recorded',
                    status: 'success'
                });
            } else {
                results.push({
                    title: 'No recent activity recorded',
                    status: 'warning'
                });
            }
        } catch (error) {
            results.push({
                title: `Error checking activity date: ${error.message}`,
                status: 'error'
            });
        }

        // Check 3: Show an informational message (always success)
        // This demonstrates that checklist items don't have to be validations
        // They can also provide helpful information or context
        results.push({
            title: 'Record is ready for review',
            status: 'success'
        });

        return results;
    }
}
