/**
 * Visit Preparation Checklist
 *
 * Checklist script that validates whether a pharma rep visit is ready
 * to move to the next stage. Checks samples, product detailing, notes,
 * future visits, and compliance status.
 *
 * Type: Checklist | Shows on: Info icon for Record Update
 *
 * Key patterns demonstrated:
 * - DateTimeFieldCondition for date-based queries
 * - Mixed sync/async validation functions
 * - record.getContextData() for visit child data
 *
 * Available globals: record, user, db, env
 * Available classes: ConditionBuilder, FieldCondition, AndCondition, DateTimeFieldCondition
 */
(() => {
    /**
     * Helper to get field data from context, handling web vs mobile formats.
     * Web format: "ProviderVisit.VisitId" prefix
     * Mobile format: direct field name
     */
    function getContextItems(baseFieldName) {
        try {
            // Try web format first
            const webData = record.getContextData(`ProviderVisit.${baseFieldName}`);
            if (webData && webData.length > 0) return webData;
        } catch (e) { /* ignore */ }

        try {
            // Fall back to mobile format
            const mobileData = record.getContextData(baseFieldName);
            if (mobileData && mobileData.length > 0) return mobileData;
        } catch (e) { /* ignore */ }

        return [];
    }

    function checkSamplesAdded() {
        try {
            const samples = getContextItems("ProductDisbursement");

            if (samples.length > 0) {
                return {
                    title: `Samples added to visit (${samples.length} sample(s))`,
                    status: "success"
                };
            }

            return {
                title: "No samples have been added to this visit yet",
                status: "warning"
            };
        } catch (error) {
            env.log("Error checking samples: " + error.message);
            return {
                title: "Error checking samples",
                status: "error"
            };
        }
    }

    function checkDetailedProducts() {
        try {
            const detailedProducts = getContextItems("ProviderVisitProdDetailing");

            if (detailedProducts.length > 0) {
                return {
                    title: `Product detailing recorded (${detailedProducts.length} product(s))`,
                    status: "success"
                };
            }

            return {
                title: "No products have been detailed during this visit",
                status: "warning"
            };
        } catch (error) {
            env.log("Error checking product detailing: " + error.message);
            return {
                title: "Error checking product detailing",
                status: "error"
            };
        }
    }

    function checkVisitNotes() {
        try {
            const description = record.stringValue("Description");

            if (description && description.trim().length > 0) {
                return {
                    title: "Visit notes have been recorded",
                    status: "success"
                };
            }

            return {
                title: "Consider adding visit notes before completing",
                status: "warning"
            };
        } catch (error) {
            env.log("Error checking visit notes: " + error.message);
            return {
                title: "Error checking visit notes",
                status: "error"
            };
        }
    }

    async function checkNextVisitScheduled() {
        try {
            const accountId = record.stringValue("AccountId");

            if (!accountId) {
                return {
                    title: "Cannot check next visit - no account associated",
                    status: "warning"
                };
            }

            const entity = "ProviderVisit";
            const now = new Date().toISOString();
            const condition = new AndCondition([
                new FieldCondition("AccountId", "=", accountId),
                new FieldCondition("Status", "=", "Planned"),
                new DateTimeFieldCondition("PlannedVisitStartTime", ">", now)
            ]);

            const futureVisits = await db.query(
                entity,
                await new ConditionBuilder(entity, condition).build(),
                ["Id", "PlannedVisitStartTime"]
            );

            if (futureVisits && futureVisits.length > 0) {
                return {
                    title: "Next visit already scheduled",
                    status: "success"
                };
            }

            return {
                title: "No future visit scheduled - consider scheduling a follow-up",
                status: "warning"
            };
        } catch (error) {
            env.log("Error checking next visit: " + error.message);
            return {
                title: "Error checking next visit",
                status: "error"
            };
        }
    }

    function checkComplianceStatus() {
        try {
            const complianceStatus = record.stringValue("ComplianceAgreementStatus");

            if (complianceStatus === "Approved") {
                return {
                    title: "Compliance agreement is approved",
                    status: "success"
                };
            }

            if (complianceStatus === "Expired") {
                return {
                    title: "Compliance agreement has expired - must be renewed",
                    status: "error"
                };
            }

            return {
                title: `Compliance agreement status: ${complianceStatus || "Not set"}`,
                status: "warning"
            };
        } catch (error) {
            env.log("Error checking compliance: " + error.message);
            return {
                title: "Error checking compliance",
                status: "error"
            };
        }
    }

    return [
        Promise.resolve(checkSamplesAdded()),
        Promise.resolve(checkDetailedProducts()),
        Promise.resolve(checkVisitNotes()),
        checkNextVisitScheduled(),
        Promise.resolve(checkComplianceStatus())
    ];
})();
