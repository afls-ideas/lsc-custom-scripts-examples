/**
 * Inquiry Validation Script
 *
 * Workflow Validation script for medical inquiry records.
 * Validates inquiry questions, type, and required fields before advancing stages.
 *
 * Type: Validation | Runs on: Any workflow action (RecordUpdate actions only)
 *
 * IMPORTANT: The returned array must contain individual promises, each resolving
 * to a single {title, status} object. Do NOT wrap multiple results in one promise.
 *
 * Available globals: record, user, db, env
 * Available classes: ConditionBuilder, FieldCondition, SetCondition, AndCondition, OrCondition
 */
(() => {
    return [
        {
            label: "TEST: This hardcoded error should block the action",
            title: "TEST: This hardcoded error should block the action",
            status: "error"
        }
    ];
})();
