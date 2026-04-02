import { CustomScript } from 'c/customScriptImports';

export default class ComplianceValidationScript extends CustomScript {
    onExecute({ api, record, env, db, moment, log }) {
        const validateCompliance = (() => {
            const validateComplianceAgreement = async () => {
                try {
                    const fromStatus = env.getOption('fromStatus');
                    const toStatus = env.getOption('toStatus');

                    if (toStatus !== "Approved" && toStatus !== "Completed") {
                        return {
                            title: "Compliance agreement check not required for this transition",
                            status: "success"
                        };
                    }

                    const recordId = record.stringValue("Id") || record.stringValue("uid");

                    const complianceAgreements = await db.query(
                        "ComplianceAgreement",
                        await new ConditionBuilder(
                            "ComplianceAgreement",
                            new AndCondition([
                                new FieldCondition("RelatedRecordId", "=", recordId),
                                new FieldCondition("Status", "=", "Active")
                            ])
                        ).build(),
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
                    log.error("Error validating compliance agreement", error);
                    return {
                        title: "Error validating compliance agreement",
                        status: "error"
                    };
                }
            };

            const validateSignatureRequired = () => {
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
                    log.error("Error validating signature", error);
                    return {
                        title: "Error validating signature",
                        status: "error"
                    };
                }
            };

            const validateAdverseEventReporting = async () => {
                try {
                    const recordId = record.stringValue("Id") || record.stringValue("uid");

                    const adverseEvents = await db.query(
                        "AdverseEvent",
                        await new ConditionBuilder(
                            "AdverseEvent",
                            new FieldCondition("RelatedRecordId", "=", recordId)
                        ).build(),
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
                    log.error("Error validating adverse event reporting", error);
                    return {
                        title: "Error validating adverse event reporting",
                        status: "error"
                    };
                }
            };

            return async () => {
                try {
                    const results = await Promise.all([
                        validateComplianceAgreement(),
                        Promise.resolve(validateSignatureRequired()),
                        validateAdverseEventReporting()
                    ]);

                    return results.flat();
                } catch (error) {
                    log.error("Error in compliance validation", error);
                    return [{
                        title: "Validation error occurred",
                        status: "error"
                    }];
                }
            };
        })();

        return [validateCompliance()];
    }
}
