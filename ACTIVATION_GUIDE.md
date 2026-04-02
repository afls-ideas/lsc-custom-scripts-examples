# Custom Scripts Activation & Testing Guide

After deploying the custom scripts to your org, follow these steps to activate and test them.

## Prerequisites

- Salesforce org with Life Sciences Cloud or Life Sciences Cloud for Customer Engagement Add-on
- Life Sciences Customer Engagement managed package installed
- **Life Sciences Commercial Admin** permission set assigned to your user

## Step 1: Register Custom Scripts

### Option A: Automated (Recommended)

Register all 7 scripts at once using one of these methods:

**Using Salesforce CLI data import:**

```bash
sf data import tree --files data/LifeScienceCustomScripts.json --target-org <your-org>
```

**Using Anonymous Apex:**

```bash
sf apex run --file scripts/registerCustomScripts.apex --target-org <your-org>
```

Both methods create the following `LifeScienceCustomScript` records:

| Script Name | Component Name | Type |
|---|---|---|
| DEMO Visit Action Validation | `visitActionValidation` | VisitActionValidation |
| DEMO Inquiry Validation | `inquiryValidationScript` | Validation |
| DEMO Compliance Validation | `complianceValidationScript` | Validation |
| DEMO Visit Preparation Checklist | `visitPreparationChecklist` | Checklist |
| DEMO Inquiry Escalation Checklist | `inquiryEscalationChecklist` | Checklist |
| DEMO Simple Validation | `simpleValidationExample` | Validation |
| DEMO Simple Checklist | `simpleChecklistExample` | Checklist |

After importing, open **Admin Console** > **Workflow Configuration** > **Custom Scripts** and click **Refresh** to verify.

### Option B: Manual

1. Open **App Launcher** and navigate to **Admin Console**
2. Select **Workflow Configuration** > **Custom Scripts**
3. Click **New** for each script using the table above
4. Click **Save** after each one

> **Note:** If you redeploy updated LWC code, return to Custom Scripts and click **Refresh** to reload the latest version.

## Step 2: Assign Scripts to Stage Objects

This step applies to **Validation** and **Checklist** scripts only. Visit Action Validation scripts do not need stage object assignment.

1. In Admin Console, go to **Workflow Configuration** > **Stage Objects**
2. Find the object to apply scripts to (e.g., Inquiry, ProviderVisit) and click **Edit**
3. In the **Validation Script** field, select your validation script
4. In the **Checklist Script** field, select your checklist script
5. Click **Save**

> Stage objects are created automatically when you save a workflow path. Validations and checklists apply to all record types for that object.

### Recommended Assignments

| Object | Validation Script | Checklist Script |
|---|---|---|
| Inquiry | `inquiryValidationScript` | `inquiryEscalationChecklist` |
| ProviderVisit | `complianceValidationScript` | `visitPreparationChecklist` |
| Any object (starter) | `simpleValidationExample` | `simpleChecklistExample` |

## Step 3: Ensure a Workflow Path is Active

Scripts only run when the object has an active workflow path. If you don't already have one:

1. Go to **Workflow Configuration** > **Workflow Paths**
2. Click **New**, name it, and select the object and record type
3. Select the controlling picklist field (e.g., Status)
4. Click **Continue** to open the workflow builder
5. For each stage, add at least one **Stage Operation** with conditions and actions
6. Click **Activate** to make the workflow path active

## Testing Each Script Type

### Validation Scripts

**When they fire:** Every time a user performs a workflow action (clicking an action button on a record)

**How to test:**
1. Navigate to a record with an active workflow (e.g., an Inquiry record)
2. Click any **workflow action button** on the record
3. The validation script runs automatically:
   - `"success"` results — action proceeds silently
   - `"warning"` results — warning dialog appears, user can choose to continue
   - `"error"` results — error dialog appears, action is **blocked**

**Test scenarios for `inquiryValidationScript`:**
- Create an Inquiry with no Inquiry Questions, no Type, missing Subject/Priority/Account → expect errors blocking the action
- Add Inquiry Questions, set Type, fill all required fields → expect the action to proceed

**Test scenarios for `complianceValidationScript`:**
- Advance a record to "Approved" without an active Compliance Agreement → expect error
- Complete a record without a "Signed" signature status → expect error
- Advance to a status other than "Approved"/"Completed" → expect success (check skipped)

### Checklist Scripts

**When they fire:** When a user clicks the **info icon (i)** on a **Record Update** action

**How to test:**
1. Navigate to a record with an active workflow
2. Find a **Record Update** action in the workflow stage
3. Click the **info icon** next to the action
4. The checklist displays with visual indicators:
   - Green check = `"success"` (requirement met)
   - Yellow alert = `"warning"` (review needed)
   - Red X = `"error"` (critical issue)

**Test scenarios for `visitPreparationChecklist`:**
- Open a visit with no samples, no detailing, no notes → expect yellow warnings
- Add samples, product detailing, and notes → expect green checks
- Set compliance status to "Expired" → expect red X

**Test scenarios for `inquiryEscalationChecklist`:**
- Open an Inquiry with no questions → expect red X for responses
- Add questions without responses → expect yellow warning with count
- Assign to a non-specialist user → expect yellow warning to reassign

### Visit Action Validation

**When it fires:** When a user clicks **Sign** or **Submit** on a visit

**Important:** Only one Visit Action Validation script runs per org. If multiple exist, only the first (by ID/creation date) executes.

**How to test:**
1. Navigate to a **Visit** record (ProviderVisit)
2. Click **Sign** or **Submit**
3. The 6 validation rules execute:

| Rule | Trigger Error | Trigger Success |
|---|---|---|
| Sample Required | Submit with 0 samples | Add at least 1 ProductDisbursement |
| Sample + Detail Dependency | Add samples but no product detailing | Add both samples and detailing |
| Message per Detail | Field Sales Rep profile, In-Person channel, 0 messages on a detail | Add at least 1 message per detail |
| Sample Dependencies | Add Cholecap 20mg without Cardiostat 10mg | Add both dependent products |
| HCP Required for HCO | Visit for an HCO with no HCP attendees | Add at least 1 HCP attendee |
| Single HCO Attendee | Add 2+ HCO attendees | Have 0 or 1 HCO attendees |

## Troubleshooting

### Scripts don't appear to run

1. **Check registration** — Admin Console > Workflow Configuration > Custom Scripts. Click **Refresh** if you redeployed code
2. **Check assignment** — Admin Console > Workflow Configuration > Stage Objects. Confirm scripts are selected in the Validation/Checklist fields
3. **Check workflow is active** — Workflow Paths must be activated for scripts to execute
4. **Check permissions** — User needs Life Sciences Commercial Admin permission set

### Debugging in the browser

1. Open **Chrome Developer Tools** (F12)
2. **Console tab** — Review script output. Scripts log via `env.log()`, `console.log()`, `console.warn()`, `console.error()`
3. **Network tab** — Monitor async `db.query()` calls. Click a request to inspect headers, payload, and response
4. Filter console logs by Error, Warning, or Info to isolate specific issues

## Running Jest Tests Locally

```bash
cd Custom_Scripts
npm install
npm test
```

Jest tests validate script logic with mocked `record`, `db`, `env` objects without requiring a Salesforce org.
