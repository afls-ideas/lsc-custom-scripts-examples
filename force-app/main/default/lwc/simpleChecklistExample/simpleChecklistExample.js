/**
 * Simple Checklist Example
 *
 * Minimal starter template demonstrating the basic checklist script pattern.
 * Use this as a starting point for building custom checklist scripts.
 *
 * CUSTOM SCRIPT BASICS:
 * - Scripts use IIFE (Immediately Invoked Function Expression) pattern
 * - No imports needed - record, user, db, env are globally available
 * - Must return an array of result objects (or Promises that resolve to them)
 * - Each result: {title: string, status: "success"|"error"|"warning"}
 *
 * STATUS VISUAL INDICATORS (for checklists):
 * - "success" = green check mark (requirement met)
 * - "warning" = yellow alert triangle (review needed)
 * - "error"   = red X (critical issue blocking progress)
 *
 * Available globals: record, user, db, env
 */
(() => {
    function checkAccountName() {
        try {
            const accountName = record.stringValue("Name");

            if (accountName && accountName.trim().length > 0) {
                return {
                    title: "Account name is set",
                    status: "success"
                };
            }

            return {
                title: "Account name is required",
                status: "warning"
            };
        } catch (error) {
            return {
                title: `Error checking account name: ${error.message}`,
                status: "error"
            };
        }
    }

    function checkLastActivity() {
        try {
            const lastActivityDate = record.stringValue("LastActivityDate");

            if (lastActivityDate) {
                return {
                    title: "Last activity date is recorded",
                    status: "success"
                };
            }

            return {
                title: "No recent activity recorded",
                status: "warning"
            };
        } catch (error) {
            return {
                title: `Error checking activity date: ${error.message}`,
                status: "error"
            };
        }
    }

    return [
        checkAccountName(),
        checkLastActivity(),
        { title: "Record is ready for review", status: "success" }
    ];
})();
