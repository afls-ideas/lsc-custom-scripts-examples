import { CustomScript } from 'c/customScriptImports';

export default class InquiryValidationScript extends CustomScript {
    onExecute({ api, record, env, db, moment, log }) {
        const validateInquiry = (() => {
            const getRecordId = (record) => {
                return record.stringValue("Id") || record.stringValue("uid");
            };

            const validateInquiryQuestions = async () => {
                try {
                    const recordId = getRecordId(record);
                    const inquiryQuestions = await db.query(
                        "InquiryQuestion",
                        await new ConditionBuilder(
                            "InquiryQuestion",
                            new FieldCondition("InquiryId", "=", recordId)
                        ).build(),
                        ["Id", "Name"]
                    );

                    if (!inquiryQuestions || inquiryQuestions.length === 0) {
                        return {
                            title: "No Inquiry Questions Found",
                            status: "error"
                        };
                    }

                    return {
                        title: "Inquiry Questions Added",
                        status: "success"
                    };
                } catch (error) {
                    log.error("Error validating inquiry questions", error);
                    return {
                        title: "Error validating inquiry questions",
                        status: "error"
                    };
                }
            };

            const validateInquiryType = () => {
                try {
                    const inquiryType = record.stringValue("Type");

                    if (!inquiryType) {
                        return {
                            title: "Inquiry Type must be specified before proceeding.",
                            status: "error"
                        };
                    }

                    return {
                        title: `Inquiry Type: ${inquiryType}`,
                        status: "success"
                    };
                } catch (error) {
                    log.error("Error validating inquiry type", error);
                    return {
                        title: "Error validating inquiry type",
                        status: "error"
                    };
                }
            };

            const validateRequiredFields = () => {
                try {
                    const subject = record.stringValue("Subject");
                    const priority = record.stringValue("Priority");
                    const accountId = record.stringValue("AccountId");

                    const errors = [];

                    if (!subject) {
                        errors.push({
                            title: "Subject is required",
                            status: "error"
                        });
                    }

                    if (!priority) {
                        errors.push({
                            title: "Priority is required",
                            status: "error"
                        });
                    }

                    if (!accountId) {
                        errors.push({
                            title: "Account is required",
                            status: "error"
                        });
                    }

                    if (errors.length > 0) {
                        return errors;
                    }

                    return {
                        title: "All required fields are present",
                        status: "success"
                    };
                } catch (error) {
                    log.error("Error validating required fields", error);
                    return {
                        title: "Error validating required fields",
                        status: "error"
                    };
                }
            };

            return async () => {
                try {
                    const results = await Promise.all([
                        validateInquiryQuestions(),
                        Promise.resolve(validateInquiryType()),
                        Promise.resolve(validateRequiredFields())
                    ]);

                    return results.flat();
                } catch (error) {
                    log.error("Error in inquiry validation", error);
                    return [{
                        title: "Validation error occurred",
                        status: "error"
                    }];
                }
            };
        })();

        return [validateInquiry()];
    }
}
