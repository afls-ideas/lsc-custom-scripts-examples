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
    const getRecordId = () => {
        return record.stringValue("Id") || record.stringValue("uid");
    };

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

            if (!inquiryQuestions || inquiryQuestions.length === 0) {
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
            env.log("Error validating inquiry questions: " + error.message);
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
                title: "Inquiry Type: " + inquiryType,
                status: "success"
            };
        } catch (error) {
            env.log("Error validating inquiry type: " + error.message);
            return {
                title: "Error validating inquiry type",
                status: "error"
            };
        }
    }

    function validateRequiredFields() {
        try {
            const subject = record.stringValue("Subject");
            const priority = record.stringValue("Priority");
            const accountId = record.stringValue("AccountId");

            const missing = [];
            if (!subject) missing.push("Subject");
            if (!priority) missing.push("Priority");
            if (!accountId) missing.push("Account");

            if (missing.length > 0) {
                return {
                    title: "Required fields missing: " + missing.join(", "),
                    status: "error"
                };
            }

            return {
                title: "All required fields are present",
                status: "success"
            };
        } catch (error) {
            env.log("Error validating required fields: " + error.message);
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
