/**
 * Compliance Validation Script
 *
 * Workflow Validation script for compliance requirements.
 * Validates compliance agreements, signatures, and adverse event reporting.
 *
 * Type: Validation | Runs on: Any workflow action
 *
 * Key patterns demonstrated:
 * - env.getOption('fromStatus') / env.getOption('toStatus') for status transitions
 * - AndCondition for complex queries
 * - Conditional validation based on target status
 *
 * Available globals: record, user, db, env
 * Available classes: ConditionBuilder, FieldCondition, AndCondition
 */
(() => {
    const getRecordId = () => {
        return record.stringValue("Id") || record.stringValue("uid");
    };

    async function validateComplianceAgreement() {
        try {
            const toStatus = env.getOption('toStatus');

            if (toStatus !== "Approved" && toStatus !== "Completed") {
                return {
                    title: "Compliance agreement check not required for this transition",
                    status: "success"
                };
            }

            const recordId = getRecordId();
            const entity = "ComplianceAgreement";
            const condition = new AndCondition([
                new FieldCondition("RelatedRecordId", "=", recordId),
                new FieldCondition("Status", "=", "Active")
            ]);

            const complianceAgreements = await db.query(
                entity,
                await new ConditionBuilder(entity, condition).build(),
                ["Id", "Status"]
            );

            if (!complianceAgreements || complianceAgreements.length === 0) {
                return {
                    title: `An active Compliance Agreement is required before moving to ${toStatus} status.`,
                    status: "error"
                };
            }

            return {
                title: "Active compliance agreement found",
                status: "success"
            };
        } catch (error) {
            env.log("Error validating compliance agreement: " + error.message);
            return {
                title: "Error validating compliance agreement",
                status: "error"
            };
        }
    }

    function validateSignatureRequired() {
        try {
            const toStatus = env.getOption('toStatus');

            if (toStatus !== "Completed") {
                return {
                    title: "Signature check not required for this transition",
                    status: "success"
                };
            }

            const signatureStatus = record.stringValue("SignatureStatus");

            if (signatureStatus !== "Signed") {
                return {
                    title: "A valid signature is required before completing this record.",
                    status: "error"
                };
            }

            return {
                title: "Signature verified",
                status: "success"
            };
        } catch (error) {
            env.log("Error validating signature: " + error.message);
            return {
                title: "Error validating signature",
                status: "error"
            };
        }
    }

    async function validateAdverseEventReporting() {
        try {
            const recordId = getRecordId();
            const entity = "AdverseEvent";
            const condition = new FieldCondition("RelatedRecordId", "=", recordId);

            const adverseEvents = await db.query(
                entity,
                await new ConditionBuilder(entity, condition).build(),
                ["Id", "ReportedDate"]
            );

            if (!adverseEvents || adverseEvents.length === 0) {
                return {
                    title: "No adverse events to validate",
                    status: "success"
                };
            }

            const missingReportedDate = adverseEvents.some(ae => {
                const reportedDate = ae.stringValue("ReportedDate");
                return !reportedDate;
            });

            if (missingReportedDate) {
                return {
                    title: "All adverse events must have a reported date before proceeding.",
                    status: "error"
                };
            }

            return {
                title: "All adverse events have been reported",
                status: "success"
            };
        } catch (error) {
            env.log("Error validating adverse event reporting: " + error.message);
            return {
                title: "Error validating adverse event reporting",
                status: "error"
            };
        }
    }

    async function runAllValidations() {
        try {
            const results = await Promise.all([
                validateComplianceAgreement(),
                Promise.resolve(validateSignatureRequired()),
                validateAdverseEventReporting()
            ]);

            return results.flat();
        } catch (error) {
            env.log("Error in compliance validation: " + error.message);
            return [{
                title: "Validation error occurred",
                status: "error"
            }];
        }
    }

    return [runAllValidations()];
})();
