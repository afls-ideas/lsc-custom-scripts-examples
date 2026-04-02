# Life Sciences Cloud - Custom Scripts Examples

<a href="https://githubsfdeploy.herokuapp.com?owner=afls-ideas&repo=lsc-custom-scripts-examples&ref=main">
  <img alt="Deploy to Salesforce" src="https://raw.githubusercontent.com/afawcett/githubsfdeploy/master/deploy.png">
</a>

A collection of pharma-specific example custom scripts that can be deployed into a Salesforce org with Life Sciences Cloud. These examples demonstrate validation, checklist, and visit action patterns for Customer Engagement workflows.

## Overview

Custom scripts are programmatic tools for data validation across Life Sciences Cloud for Customer Engagement on desktop and mobile. They execute during workflow management and visit management to ensure data quality and guide users through business processes.

### Script Types

- **Validation Scripts** - Run on any workflow action, prevent incorrect actions or alert users about errors
- **Checklist Scripts** - Display on info icon for Record Update actions, showing steps to complete before advancing to next stage
- **Visit Action Validation Scripts** - Run when user clicks Sign or Submit on a visit, validating visit data before completion

## Prerequisites

- Salesforce org with Life Sciences Cloud or Life Sciences Cloud for Customer Engagement Add-on
- Life Sciences Customer Engagement managed package installed
- Life Sciences Commercial Admin permission set assigned
- Salesforce CLI (sf) installed
- Node.js and npm (for running tests)

## Project Structure

```
force-app/main/default/lwc/
├── visitActionValidation/        # Visit Action Validation - comprehensive pharma example
├── visitPreparationChecklist/    # Checklist - visit preparation steps
├── inquiryValidationScript/      # Validation - medical inquiry workflow
├── complianceValidationScript/   # Validation - compliance & adverse events
├── inquiryEscalationChecklist/   # Checklist - inquiry escalation steps
├── simpleValidationExample/      # Starter template - minimal validation
├── simpleChecklistExample/       # Starter template - minimal checklist
└── (each component includes .js, .js-meta.xml, and some include __tests__/)
```

## Examples Overview

### Visit Action Validation (`visitActionValidation`)

**Type:** Visit Action Validation | **Runs on:** Sign, Submit

Comprehensive example implementing 6 pharma-specific validation rules:

1. **Sample Required** - At least one sample must be distributed during the visit
2. **Sample Detail Dependency** - Samples require corresponding detailed product discussions
3. **Message Requirements** - Minimum number of messages per detail based on user profile and channel type
4. **Sample Dependencies** - Certain samples require other samples (e.g., Cholecap 20mg requires Cardiostat 10mg)
5. **HCP Required for HCO** - HCO visits must have at least one HCP attendee
6. **Single HCO Attendee** - Maximum one HCO attendee per visit

**Key patterns:** AccountDAO singleton pattern, platform-aware field access, db.query with ConditionBuilder

### Workflow Validation - Medical Inquiry (`inquiryValidationScript`)

**Type:** Validation | **Runs on:** Any workflow action

Validates medical inquiry records to ensure:
- Inquiry questions are documented
- Inquiry type is set
- Required fields are populated before advancing stages

**Key patterns:** Async database queries, record field validation

### Workflow Validation - Compliance (`complianceValidationScript`)

**Type:** Validation | **Runs on:** Any workflow action

Validates compliance requirements including:
- Compliance agreements signed
- Required signatures captured
- Adverse event reporting requirements met

**Key patterns:** env.getOption for status transitions, AndCondition for complex queries

### Visit Preparation Checklist (`visitPreparationChecklist`)

**Type:** Checklist | **Shows on:** Info icon for Record Update

Displays checklist items for visit preparation:
- Samples prepared and available
- Product detailing materials ready
- Visit notes and objectives documented
- Next visit scheduled
- Compliance status verified

**Key patterns:** DateTimeFieldCondition for date queries, mixed sync/async validation

### Inquiry Escalation Checklist (`inquiryEscalationChecklist`)

**Type:** Checklist | **Shows on:** Info icon for Record Update

Displays checklist items for inquiry escalation:
- Response documentation complete
- Priority level assigned
- Specialist assigned to inquiry
- Adverse event screening performed

**Key patterns:** Counting records with responses, user profile queries

### Simple Validation Example (`simpleValidationExample`)

Minimal starter template demonstrating the basic validation script pattern. Use this as a starting point for building custom validation scripts.

### Simple Checklist Example (`simpleChecklistExample`)

Minimal starter template demonstrating the basic checklist script pattern. Use this as a starting point for building custom checklist scripts.

## Quick Start

### Deploy All Examples

```bash
# Clone the repository
git clone <repo-url>
cd Custom_Scripts

# Deploy LWC components to your org
sf project deploy start --source-dir force-app

# Register custom scripts (creates LifeScienceCustomScript records)
sf data import tree --files data/LifeScienceCustomScripts.json --target-org <your-org>
```

### Deploy Individual Examples

```bash
# Deploy a specific example
sf project deploy start --source-dir force-app/main/default/lwc/simpleValidationExample

# Deploy visit action validation
sf project deploy start --source-dir force-app/main/default/lwc/visitActionValidation
```

## Register Custom Scripts

After deploying the LWC components, you must register them as custom scripts. Registration creates records in the **`LifeScienceCustomScript`** object, which maps each LWC component to a script type so the platform knows when to execute it.

There are three ways to register:

1. **CLI Data Import** (recommended) — `sf data import tree --files data/LifeScienceCustomScripts.json --target-org <your-org>`
2. **Anonymous Apex** — `sf apex run --file scripts/registerCustomScripts.apex --target-org <your-org>`
3. **Admin Console UI** — **App Launcher** → **Admin Console** → **Workflow Configuration** → **Custom Scripts** → **New** for each script

After registering, assign validation and checklist scripts to stage objects:
- **Admin Console** → **Workflow Configuration** → **Stage Objects** → **Edit** → select scripts

See [ACTIVATION_GUIDE.md](ACTIVATION_GUIDE.md) for detailed step-by-step instructions and testing scenarios.

**Note:** If you update the LWC code, click **Refresh** on the Custom Scripts page in Admin Console to reload the latest version.

## Custom Script Format

All custom scripts must follow this format:

```javascript
(() => {
    // Custom script logic in a self-calling function
    
    async function validate() {
        // Validation logic using record, user, db, env
        return { 
            title: "Validation message", 
            status: "success" 
        };
    }
    
    // Return array of validation results
    return [validate()];
})();
```

## Output Format

Custom scripts must return an array of objects with the following structure:

```javascript
[
    {
        title: string,   // Message to display
        status: string   // One of: "success", "warning", "error"
    }
]
```

### Status Values

- **`success`** - Green check mark (checklist) / validation passes (validation)
- **`warning`** - Yellow alert icon (checklist) / shows warning dialog but allows proceed (validation)
- **`error`** - Red X icon (checklist) / blocks action and shows error dialog (validation)

## Available Variables

Custom scripts have access to the following global variables:

- **`record`** - Current record object with methods:
  - `stringValue(fieldName)`
  - `boolValue(fieldName)`
  - `numberValue(fieldName)`
  - `dateValue(fieldName)`
  - `getContextData(key)`

- **`user`** - Current user object with similar methods as record

- **`db`** - Database access object with methods:
  - `query(conditions, fields, entity)`
  - `rowById(recordId, fields, entity)`
  - `rowsByEntity(entity, fields)`
  - `bulkQuery(enhancedConditions, fields, entity)`

- **`env`** - Environment object with methods:
  - `getOption(key)`
  - `setOption(key, value)`
  - `log(message)`
  - `formatCustomLabel(labelName, params)`

## Available Classes

### Condition Builders

- **`ConditionBuilder`** - Build simple field conditions
- **`FieldCondition`** - Field-based conditions
- **`SetCondition`** - IN/NOT IN conditions
- **`AndCondition`** - Combine conditions with AND logic
- **`OrCondition`** - Combine conditions with OR logic
- **`GroupCondition`** - Group multiple conditions
- **`DateFieldCondition`** - Date-based conditions
- **`DateTimeFieldCondition`** - DateTime-based conditions
- **`ConditionEnhancedBuilder`** - For bulkQuery operations
- **`Query`** - For building subqueries

## Best Practices

### Async/Await Pattern

Always use async functions for all validations since database operations are asynchronous on desktop:

```javascript
async function validate() {
    const results = await db.query(conditions, fields, entity);
    // Process results
}
```

### Error Handling

Always wrap validations in try-catch blocks:

```javascript
async function validate() {
    try {
        // Validation logic
        return { title: "Success", status: "success" };
    } catch (error) {
        return { title: `Error: ${error.message}`, status: "error" };
    }
}
```

### Performance

- Always specify fields in db.query for better performance
- Filter in JavaScript rather than multiple WHERE clauses when possible
- Cache repeated queries using helper patterns like DAO singleton

### Cross-Platform Compatibility

- Use `getFieldData()` helper functions for web/mobile field access compatibility
- Test on both desktop and mobile platforms
- Be aware of platform-specific behavior differences

### Field Access

- Use `enableAccessErrors()` cautiously - it will throw errors for inaccessible fields
- Handle field access errors gracefully when accessing fields that may not be visible to all users

## Testing

Run the included Jest tests:

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

### Testing Pattern

Tests follow this pattern:

```javascript
const fs = require('fs');

test('validation script test', async () => {
    // Load script
    const scriptContent = fs.readFileSync('./path/to/script.js', 'utf8');
    
    // Create mocks
    const mockRecord = { /* mock data */ };
    const mockDb = { /* mock methods */ };
    
    // Execute script
    const scriptFunction = new Function('record', 'db', 'user', 'env', scriptContent);
    const results = await Promise.all(scriptFunction(mockRecord, mockDb, mockUser, mockEnv));
    
    // Assert results
    expect(results[0].status).toBe('success');
});
```

## Resources

- [Custom Scripts for Life Sciences](https://help.salesforce.com/s/articleView?id=sf.ls_custom_scripts.htm&type=5) - Salesforce Help documentation
- [LSStarterConfig](https://github.com/SalesforceLabs/LSStarterConfig) - Salesforce Labs starter config with visit sample script
- [Life Sciences Cloud Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.health_cloud.meta/health_cloud/) - Developer documentation

## License

This project is provided as example code for educational purposes. Use these examples as reference implementations for building custom scripts in your Life Sciences Cloud org.

## Support

These examples are provided as-is without official support. For questions about Life Sciences Cloud functionality, refer to Salesforce Help or contact Salesforce Support.
