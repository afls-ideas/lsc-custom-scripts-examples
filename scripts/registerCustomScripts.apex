// Register DEMO custom scripts in LifeScienceCustomScript
// Run this in Developer Console > Execute Anonymous or via:
//   sf apex run --file scripts/registerCustomScripts.apex --target-org <your-org>

List<LifeScienceCustomScript> scripts = new List<LifeScienceCustomScript>{
    new LifeScienceCustomScript(
        Name = 'DEMO Visit Action Validation',
        ComponentName = 'visitActionValidation',
        Type = 'VisitActionValidation'
    ),
    new LifeScienceCustomScript(
        Name = 'DEMO Inquiry Validation',
        ComponentName = 'inquiryValidationScript',
        Type = 'Validation'
    ),
    new LifeScienceCustomScript(
        Name = 'DEMO Compliance Validation',
        ComponentName = 'complianceValidationScript',
        Type = 'Validation'
    ),
    new LifeScienceCustomScript(
        Name = 'DEMO Visit Preparation Checklist',
        ComponentName = 'visitPreparationChecklist',
        Type = 'Checklist'
    ),
    new LifeScienceCustomScript(
        Name = 'DEMO Inquiry Escalation Checklist',
        ComponentName = 'inquiryEscalationChecklist',
        Type = 'Checklist'
    ),
    new LifeScienceCustomScript(
        Name = 'DEMO Simple Validation',
        ComponentName = 'simpleValidationExample',
        Type = 'Validation'
    ),
    new LifeScienceCustomScript(
        Name = 'DEMO Simple Checklist',
        ComponentName = 'simpleChecklistExample',
        Type = 'Checklist'
    )
};

insert scripts;
System.debug('Inserted ' + scripts.size() + ' custom script records.');
