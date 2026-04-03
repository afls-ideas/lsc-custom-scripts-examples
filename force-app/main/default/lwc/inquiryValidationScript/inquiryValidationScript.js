/**
 * Inquiry Validation Script
 *
 * Workflow Validation script for medical inquiry records.
 * Validates inquiry questions, type, and required fields before advancing stages.
 *
 * Type: Validation | Runs on: Any workflow action (RecordUpdate actions only)
 *
 * Based on the official LSC Custom Scripts documentation best practices example.
 * The IIFE returns an array of Promises, each resolving to a single {title, status} object.
 *
 * Available globals: record, user, db, env
 * Available classes: ConditionBuilder, FieldCondition, SetCondition, AndCondition, OrCondition
 */
(() => {
    function getRecordId() {
        let recordId = record.stringValue("Id");
        return recordId ? recordId : record.stringValue("uid");
    }

    async function validateInquiryQuestions() {
        try {
            const recordId = getRecordId();
            const entity = "InquiryQuestion";
            const condition = new FieldCondition("InquiryId", "=", recordId);

            const inquiryQuestions = await db.query(
                entity,
                await new ConditionBuilder(entity, condition).build(),
                ["Id", "Name"]
            );

            if (inquiryQuestions === null || inquiryQuestions === undefined || inquiryQuestions.length === 0) {
                return {
                    title: "No Inquiry Questions Found",
                    status: "error"
                };
            }

            return {
                title: "Inquiry Questions Added (" + inquiryQuestions.length + ")",
                status: "success"
            };
        } catch (error) {
            return {
                title: "Error validating inquiry questions",
                status: "error"
            };
        }
    }

    function validateInquiryType() {
        try {
            const inquiryType = record.stringValue("Type");

            if (!inquiryType) {
                return {
                    title: "Inquiry Type must be specified before proceeding.",
                    status: "error"
                };
            }

            return {
                title: "Inquiry Type is set: " + inquiryType,
                status: "success"
            };
        } catch (error) {
            return {
                title: "Error validating inquiry type",
                status: "error"
            };
        }
    }

    function validateRequiredFields() {
        try {
            const toStatus = env.getOption('toStatus');

            if (toStatus !== "Working" && toStatus !== "Escalated") {
                return {
                    title: "Required fields check not needed for this transition",
                    status: "success"
                };
            }

            const inquiryType = record.stringValue("Type");
            const priority = record.stringValue("Priority");

            if (!inquiryType || !priority) {
                const missing = [];
                if (!inquiryType) missing.push("Type");
                if (!priority) missing.push("Priority");
                return {
                    title: "Required fields missing: " + missing.join(", "),
                    status: "error"
                };
            }

            return {
                title: "All required fields are populated",
                status: "success"
            };
        } catch (error) {
            return {
                title: "Error validating required fields",
                status: "error"
            };
        }
    }

    return [
        validateInquiryQuestions(),
        validateInquiryType(),
        validateRequiredFields()
    ];
})();
