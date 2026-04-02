/**
 * Simple Validation Example
 *
 * Minimal starter template demonstrating the basic validation script pattern.
 * Use this as a starting point for building custom validation scripts.
 *
 * CUSTOM SCRIPT BASICS:
 * - Scripts use IIFE (Immediately Invoked Function Expression) pattern
 * - No imports needed - record, user, db, env are globally available
 * - Must return an array of result objects (or Promises that resolve to them)
 * - Each result: {title: string, status: "success"|"error"|"warning"}
 *
 * STATUS MEANINGS (for validations):
 * - "success" = validation passes
 * - "warning" = shows warning dialog but allows user to proceed
 * - "error"   = blocks the action and shows error dialog
 *
 * Available globals: record, user, db, env
 */
(() => {
    function validateStatus() {
        try {
            const status = record.stringValue("Status");

            if (status && status.trim().length > 0) {
                return {
                    title: `Status is set to: ${status}`,
                    status: "success"
                };
            }

            return {
                title: "Status field is empty - please set a status value",
                status: "warning"
            };
        } catch (error) {
            return {
                title: `Error checking status: ${error.message}`,
                status: "error"
            };
        }
    }

    return [validateStatus()];
})();
