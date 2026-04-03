# Visit Context Data Reference

When a Visit Action Validation script calls `record.getContextData()`, the platform returns a JSON object containing the visit record and all its related child records. This document describes the structure of that context data on the **web** platform.

## How to Access Context Data

```javascript
function parseContextData(record) {
    try {
        if (!record || typeof record.getContextData !== 'function') return {};
        var contextData = record.getContextData();
        if (typeof contextData === 'string') return JSON.parse(contextData);
        if (typeof contextData === 'object' && contextData !== null) return contextData;
        return {};
    } catch (e) { return {}; }
}
```

## Top-Level Structure

The context data object uses relationship-style keys. On **web**, child records are keyed by `ObjectName.VisitId`. On **mobile**, they use just the object name.

```javascript
{
    "ProviderVisit": { ... },                              // The visit record
    "ProviderVisitProdDetailing.VisitId": [ ... ],         // Detailed products (web)
    "ProductDisbursement.VisitId": [ ... ],                // Samples left (web)
    "Visit.ParentVisitId": [ ... ],                        // Attendee child visits (web)
    "ProviderVisitDtlProductMsg.VisitId": [ ... ]          // Product messages (web)
}
```

Use this helper to handle both web and mobile keys:

```javascript
function getFieldData(contextData, baseFieldName) {
    return contextData[baseFieldName + '.VisitId'] || contextData[baseFieldName];
}
```

## Platform Detection

```javascript
var hasWebField = contextData['ProviderVisit'] !== undefined;
```

- **Web**: `ProviderVisit` key exists at the top level
- **Mobile**: `ProviderVisit` key does not exist; child records use base names only

## ProviderVisit (Visit Record)

The main visit record. Available fields include:

| Field | Type | Description |
|-------|------|-------------|
| `Id` | String | Visit record ID |
| `AccountId` | String | Account being visited |
| `OwnerId` | String | Visit owner (rep) |
| `Status` | String | Current status |
| `Channel` | String | Visit channel (e.g., `In-Person`, `Remote`) |
| `PlannedStartDateTime` | String | Planned start (ISO 8601) |
| `ActualStartDateTime` | String | Actual start (ISO 8601) |
| `ActualEndDateTime` | String | Actual end (ISO 8601) |
| `Description` | String | Visit notes |
| `SignatureImage` | String | Signature data (if captured) |

## ProviderVisitProdDetailing (Detailed Products)

Array of products detailed during the visit. Each record:

| Field | Type | Description |
|-------|------|-------------|
| `ProductId` | String | Product record ID |
| `ContextRecordId` | String | Context record ID |
| `IsGeneratedFromPresentation` | Boolean | Whether generated from CLM presentation |
| `Priority` | Number | Detail priority |
| `AdditionalInformation` | **String (JSON)** | Nested JSON with product metadata |
| `ProviderVisitDtlProductMsg.VisitId` | Array | Key messages for this detail |
| `ProviderVisitProdDiscussion.VisitId` | Array | Discussions for this detail |

### AdditionalInformation JSON

The `AdditionalInformation` field is a **JSON string** (not an object) that must be parsed separately. It contains product hierarchy information:

```json
{
    "LifeScienceMarketableProduct": {
        "Name": "Immunexis"
    },
    "Indication": {
        "Name": null
    },
    "Brand": {
        "Name": null
    },
    "TherapeuticArea": {
        "Name": null
    }
}
```

To extract the product name:

```javascript
var addlInfo = detailData[i].AdditionalInformation;
if (typeof addlInfo === 'string') {
    var parsed = JSON.parse(addlInfo);
    var productName = parsed.LifeScienceMarketableProduct && parsed.LifeScienceMarketableProduct.Name || '';
    var brandName = parsed.Brand && parsed.Brand.Name || '';
    var indicationName = parsed.Indication && parsed.Indication.Name || '';
    var therapeuticArea = parsed.TherapeuticArea && parsed.TherapeuticArea.Name || '';
}
```

## ProductDisbursement (Samples)

Array of samples left during the visit. Each record:

| Field | Type | Description |
|-------|------|-------------|
| `ProductItemId` / `productitemid` | String | Product item (lot) ID |
| `Quantity` / `quantity` | Number | Quantity left |

Note: Field names may be PascalCase or lowercase depending on web vs mobile.

## ChildVisit / Visit.ParentVisitId (Attendees)

Array of attendee child visit records:

| Field | Type | Description |
|-------|------|-------------|
| `AccountId` / `accountid` | String | Attendee account ID |

To determine if an attendee is an HCP (Person Account) or HCO (Business Account), you must query the `Account` object using `db.query`.

## Important Patterns

### Proxy Wrapping (Web)

On the web platform, Locker Service wraps return values in Proxy objects. The platform's `translateValidationResults` function cannot read Proxy-wrapped results. **You must unwrap them** before returning:

```javascript
function unwrapProxy(results) {
    return JSON.parse(JSON.stringify(results));
}

async function validateVisit() {
    var results = [ myValidation(contextData) ];

    if (hasWebField) {
        var resolved = await Promise.all(results);
        return unwrapProxy(resolved);     // <-- required
    }
    return unwrapProxy(results);          // <-- required
}
```

Without `unwrapProxy`, the platform shows `Error in translateValidationResults: Proxy(Object) {}` and silently allows the visit through.

### Data Available Without db.query (Sync)

These objects are included in the context payload:
- `ProviderVisit` fields
- `ProviderVisitProdDetailing` records (with `AdditionalInformation`)
- `ProductDisbursement` records
- `ProviderVisitDtlProductMsg` records
- `ProviderVisitProdDiscussion` records
- `ChildVisit` / `Visit.ParentVisitId` records

### Data Requiring db.query (Async)

These objects are NOT in the context and require `await db.query(...)`:
- `Account` (IsPersonAccount, Specialty, etc.)
- `Product2` (Brand, Name, custom fields)
- `ProductItem` (ExpirationDate, Product2Id)
- `UserAdditionalInfo` (ProfileIdentifier)
- `ObjectTerritory2Association` / `UserTerritory2Association`
- `IndividualConsent` or custom consent objects

### Field Name Variations

Web and mobile may use different casing for the same field:

| Web | Mobile |
|-----|--------|
| `ProductItemId` | `productitemid` |
| `AccountId` | `accountid` |
| `Quantity` | `quantity` |

Always check both: `record.ProductItemId || record.productitemid`
