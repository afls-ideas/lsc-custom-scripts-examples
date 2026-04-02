/**
 * Simple Validation Example
 *
 * This is the simplest possible custom script validation example.
 * It demonstrates the basic structure and format for custom scripts.
 *
 * CUSTOM SCRIPT BASICS:
 * - Custom scripts are headless LWC components (no HTML template needed)
 * - They must have an @api execute() method that returns an array of results
 * - Each result is an object with: {title: string, status: string}
 * - Status can be: "success", "error", or "warning"
 *
 * OUTPUT FORMAT:
 * [{title: "message", status: "success"|"error"|"warning"}]
 *
 * STATUS MEANINGS (for checklists):
 * - success = green check mark (condition met)
 * - warning = yellow alert (something to review)
 * - error = red X (critical issue)
 */
import { LightningElement, api } from 'lwc';

export default class SimpleValidationExample extends LightningElement {
    // The @api record property provides access to the current record
    // You can use record.stringValue('FieldName') to get field values
    @api record;

    /**
     * The execute method is called by the custom script framework.
     * It must return an array of result objects.
     *
     * @returns {Array} Array of {title: string, status: string} objects
     */
    @api
    execute() {
        const results = [];

        // Example validation: Check if Status field is populated
        try {
            const status = this.record.stringValue('Status');

            if (status && status.trim().length > 0) {
                // Status is set - validation passes
                results.push({
                    title: `Status is set to: ${status}`,
                    status: 'success'
                });
            } else {
                // Status is empty - show warning
                results.push({
                    title: 'Status field is empty - please set a status value',
                    status: 'warning'
                });
            }
        } catch (error) {
            // If something goes wrong, show error
            results.push({
                title: `Error checking status: ${error.message}`,
                status: 'error'
            });
        }

        // Return the results array
        return results;
    }
}
