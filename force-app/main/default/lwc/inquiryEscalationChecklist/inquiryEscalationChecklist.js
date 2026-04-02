/**
 * Inquiry Escalation Checklist
 *
 * Checklist script that validates whether a medical inquiry is ready for escalation.
 * Checks responses, priority, specialist assignment, and adverse event screening.
 *
 * Type: Checklist | Shows on: Info icon for Record Update
 *
 * Key patterns demonstrated:
 * - Counting records with responses
 * - User profile queries via db.query
 * - record.stringValue() for field access
 *
 * Available globals: record, user, db, env
 * Available classes: ConditionBuilder, FieldCondition
 */
(() => {
    const getRecordId = () => {
        return record.stringValue("Id") || record.stringValue("uid");
    };

    async function checkResponseDocumented() {
        try {
            const recordId = getRecordId();
            const entity = "InquiryQuestion";
            const condition = new FieldCondition("InquiryId", "=", recordId);

            const questions = await db.query(
                entity,
                await new ConditionBuilder(entity, condition).build(),
                ["Id", "ResponseText"]
            );

            if (!questions || questions.length === 0) {
                return {
                    title: "No inquiry questions have been added",
                    status: "error"
                };
            }

            let missingResponses = 0;
            for (const question of questions) {
                const responseText = question.stringValue("ResponseText");
                if (!responseText || responseText.trim().length === 0) {
                    missingResponses++;
                }
            }

            if (missingResponses === 0) {
                return {
                    title: `All ${questions.length} inquiry questions have responses`,
                    status: "success"
                };
            }

            return {
                title: `${missingResponses} of ${questions.length} questions still need responses`,
                status: "warning"
            };
        } catch (error) {
            env.log("Error checking responses: " + error.message);
            return {
                title: "Error checking responses",
                status: "error"
            };
        }
    }

    function checkPrioritySet() {
        try {
            const priority = record.stringValue("Priority");

            if (priority && priority.trim().length > 0) {
                return {
                    title: `Priority level set to ${priority}`,
                    status: "success"
                };
            }

            return {
                title: "Priority level has not been set",
                status: "warning"
            };
        } catch (error) {
            env.log("Error checking priority: " + error.message);
            return {
                title: "Error checking priority",
                status: "error"
            };
        }
    }

    async function checkAssignedToSpecialist() {
        try {
            const ownerId = record.stringValue("OwnerId");

            if (!ownerId) {
                return {
                    title: "No owner assigned",
                    status: "warning"
                };
            }

            const entity = "User";
            const condition = new FieldCondition("Id", "=", ownerId);

            const users = await db.query(
                entity,
                await new ConditionBuilder(entity, condition).build(),
                ["Id", "Name", "ProfileIdentifier"]
            );

            if (!users || users.length === 0) {
                return {
                    title: "Could not verify owner information",
                    status: "warning"
                };
            }

            const ownerUser = users[0];
            const userName = ownerUser.stringValue("Name");
            const profile = ownerUser.stringValue("ProfileIdentifier") || "";

            if (profile.includes("Medical") || profile.includes("Specialist")) {
                return {
                    title: `Assigned to medical specialist: ${userName}`,
                    status: "success"
                };
            }

            return {
                title: "Consider reassigning to a medical specialist before escalation",
                status: "warning"
            };
        } catch (error) {
            env.log("Error checking specialist assignment: " + error.message);
            return {
                title: "Error checking specialist assignment",
                status: "error"
            };
        }
    }

    function checkAdverseEventScreening() {
        try {
            const adverseEventIndicator = record.stringValue("AdverseEventIndicator");

            if (adverseEventIndicator === "true" || adverseEventIndicator === "Yes") {
                return {
                    title: "Adverse event screening completed",
                    status: "success"
                };
            }

            return {
                title: "Adverse event screening has not been performed",
                status: "warning"
            };
        } catch (error) {
            env.log("Error checking adverse event screening: " + error.message);
            return {
                title: "Error checking adverse event screening",
                status: "error"
            };
        }
    }

    return [
        checkResponseDocumented(),
        Promise.resolve(checkPrioritySet()),
        checkAssignedToSpecialist(),
        Promise.resolve(checkAdverseEventScreening())
    ];
})();
