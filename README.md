# Life Sciences Cloud - Custom Scripts Examples

<a href="https://githubsfdeploy.herokuapp.com?owner=afls-ideas&repo=lsc-custom-scripts-examples&ref=main">
  <img alt="Deploy to Salesforce" src="https://raw.githubusercontent.com/afawcett/githubsfdeploy/master/deploy.png">
</a>

A collection of small, focused example custom scripts for Life Sciences Cloud for Customer Engagement. Each example demonstrates one specific validation or checklist pattern that you can combine into your own scripts.

## How Custom Scripts Work

Custom scripts are headless LWC components deployed to your org. The platform stores the JavaScript in the `CodeText` field of `LifeScienceCustomScript` records and executes it from there — not from the deployed LWC directly. After updating an LWC, you must click **Refresh** in Admin Console to sync the code.

### Script Types

| Type | When it runs | How it's assigned |
|------|-------------|-------------------|
| **Validation** | Any workflow action (Record Update) | Assigned to Stage Objects |
| **Checklist** | User clicks info icon on Record Update actions | Assigned to Stage Objects |
| **Visit Action Validation** | User clicks Sign or Submit on a visit | Runs automatically (only one script runs — first by ID/creation date) |

### Important: Visit Action Validation

**Only one Visit Action Validation script runs per org.** If you create multiple scripts of this type, only the first one executes (based on ID or creation date). You must put all your validation rules in a single script and return multiple results in the array.

For Validation and Checklist scripts, you can assign different scripts to different Stage Objects.

## Required Record Fields

When creating `LifeScienceCustomScript` records:

| Field | Validation/Checklist | Visit Action Validation |
|-------|---------------------|------------------------|
| Name | Required | Required |
| ComponentName | LWC component name | LWC component name |
| Type | `Validation` or `Checklist` | `VisitActionValidation` |
| ObjectName | Not required | **`ProviderVisit`** (required!) |
| OperationEventType | Not required | **`OnUpdate`** (required!) |

Without `ObjectName` and `OperationEventType`, Visit Action Validation scripts silently don't execute.

## Confirmed Working Pattern (Web)

This is the pattern confirmed working on desktop/web. The key requirements:

1. IIFE returns `[validateVisit()]` — array wrapping a **called** async function (Promise)
2. `validateVisit()` returns an **array** of `{title, status}` objects
3. Platform detection via `parseContextData(record)` — check for `ProviderVisit` key
4. Web uses `Promise.all()` wrapping; mobile does not
5. Guard with `if (record && user && env && db)` before executing

```javascript
(() => {
    function parseContextData(record) {
        try {
            if (!record || typeof record.getContextData !== 'function') {
                return {};
            }
            var contextData = record.getContextData();
            if (typeof contextData === 'string') {
                return JSON.parse(contextData);
            } else if (typeof contextData === 'object' && contextData !== null) {
                return contextData;
            }
            return {};
        } catch (error) {
            return {};
        }
    }

    async function validateVisit() {
        try {
            // Your validation logic here
            var results = [
                { title: "Validation passed", status: "success" },
                { title: "Missing required data", status: "error" }
            ];

            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            if (hasWebField) {
                return await Promise.all(results);
            }
            return results;
        } catch (error) {
            return [{ title: 'Error: ' + error.message, status: 'error' }];
        }
    }

    if (record && user && env && db) {
        var contextData = parseContextData(record);
        var hasWebField = contextData['ProviderVisit'] !== undefined;
        if (hasWebField) {
            return [validateVisit()];
        } else {
            return validateVisit();
        }
    }
})();
```

### Validation Script Pattern (for Workflow)

Validation scripts use a simpler pattern — no platform detection needed:

```javascript
(() => {
    async function validateSomething() {
        try {
            // Your validation logic using record, db, env globals
            return { title: "Validation passed", status: "success" };
        } catch (error) {
            return { title: "Error: " + error.message, status: "error" };
        }
    }

    return [validateSomething()];
})();
```

## Examples

### Visit Action Validation

| Example | Description | Pattern |
|---------|-------------|---------|
| `visitSampleScript` | Checks for required samples and detailed products | `parseContextData` + `getFieldData` for web/mobile |
| `visitActionValidation` | Minimal working template | Simplest possible Visit Action Validation |

### Workflow Validation

| Example | Description | Pattern |
|---------|-------------|---------|
| `inquiryValidationScript` | Validates inquiry questions, type, required fields | `db.query` + `ConditionBuilder` + `env.getOption` |
| `complianceValidationScript` | Compliance agreements, signatures, adverse events | `AndCondition` + status transition checks |
| `simpleValidationExample` | Starter template | Minimal boilerplate |

### Checklists

| Example | Description | Pattern |
|---------|-------------|---------|
| `visitPreparationChecklist` | Visit preparation steps | Mixed sync/async |
| `inquiryEscalationChecklist` | Inquiry escalation steps | User profile queries |
| `simpleChecklistExample` | Starter template | Minimal boilerplate |

## Project Structure

```
force-app/main/default/lwc/
├── visitSampleScript/            # Visit Action Validation - sample & detail checks
├── visitActionValidation/        # Visit Action Validation - minimal template
├── inquiryValidationScript/      # Validation - medical inquiry workflow
├── complianceValidationScript/   # Validation - compliance & adverse events
├── visitPreparationChecklist/    # Checklist - visit preparation steps
├── inquiryEscalationChecklist/   # Checklist - inquiry escalation steps
├── simpleValidationExample/      # Starter template - validation
└── simpleChecklistExample/       # Starter template - checklist
```

## Quick Start

### Deploy

```bash
# Clone the repository
git clone <repo-url>
cd Custom_Scripts

# Deploy all LWC components
sf project deploy start --source-dir force-app

# Register custom scripts (creates LifeScienceCustomScript records)
sf data import tree --files data/LifeScienceCustomScripts.json --target-org <your-org>
```

### After Deploy

1. **Admin Console** > **Workflow Configuration** > **Custom Scripts** > click **Refresh** on each row
2. For Visit Action Validation: set `ObjectName=ProviderVisit` and `OperationEventType=OnUpdate` on the record
3. For Validation/Checklist: assign scripts to Stage Objects via **Workflow Configuration** > **Stage Objects** > **Edit**

### Sharing

The `LifeScienceCustomScript` object defaults to Private sharing. Rep users need record-level access to see custom script records. Change OWD to **Public Read Only** in Setup > Sharing Settings if reps can't see scripts.

## Output Format

```javascript
{
    title: string,   // Message displayed to the user
    status: string   // "success", "warning", or "error"
}
```

| Status | Checklist | Validation |
|--------|-----------|------------|
| `success` | Green check | Not displayed |
| `warning` | Yellow alert | Shows warning dialog, user can continue |
| `error` | Red X | Blocks action, shows error dialog |

## Available Globals

| Global | Description | Key Methods |
|--------|-------------|-------------|
| `record` | Current record | `stringValue(field)`, `boolValue(field)`, `getContextData()` |
| `user` | Current user | `stringValue(field)` |
| `db` | Database access | `query(entity, conditions, fields)` |
| `env` | Environment | `getOption(key)`, `log(message)` |

## Available Classes

`ConditionBuilder`, `FieldCondition`, `SetCondition`, `AndCondition`, `OrCondition`, `GroupCondition`, `DateFieldCondition`, `DateTimeFieldCondition`

## Gotchas

- **CodeText is the runtime source of truth.** The platform executes from the `CodeText` field, not the deployed LWC. Always click Refresh after deploying.
- **CodeText is read-only via API.** You cannot update it programmatically — only through the Refresh button.
- **Large scripts crash silently.** If a script is too large, Locker Service fails to evaluate it and the platform shows a generic error with no console output. Keep scripts small and focused.
- **Proxy wrapping.** Async function results get wrapped in Locker Service Proxy objects. Use the `Promise.all(results)` pattern inside `validateVisit()` for web.
- **Only one Visit Action Validation runs.** First by ID/creation date. Put all rules in one script.
- **ObjectName and OperationEventType required.** Without these on the LifeScienceCustomScript record, Visit Action Validation scripts silently don't execute.

## Testing

```bash
npm install
npm test
```

Tests use `new Function('env', 'record', 'db', 'ConditionBuilder', 'FieldCondition', ...)` to load scripts and mock globals. See `__tests__/` directories for examples.

## Workflow Paths

These examples work with the following workflow paths (configure in Admin Console > Workflow Configuration > Workflow Paths):

| Object | Controlling Field | Record Type |
|--------|------------------|-------------|
| Inquiry | Status | (default) |
| ProviderVisit | Status | (default) |

## Resources

- [Custom Scripts for Life Sciences](https://help.salesforce.com/s/articleView?id=sf.ls_custom_scripts.htm&type=5) - Salesforce Help
- [LSStarterConfig](https://github.com/SalesforceLabs/LSStarterConfig) - Salesforce Labs starter config
- [Life Sciences Cloud Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.health_cloud.meta/health_cloud/)

## License

Example code for educational purposes. Use as reference implementations for building custom scripts in your Life Sciences Cloud org.
