/**
 * 06. HCP Required for HCO Visit
 *
 * When visiting an HCO (Healthcare Organization / Institution), at least
 * one HCP (Healthcare Professional / Person Account) attendee must be added.
 * Skips validation if the primary account is already an HCP.
 *
 * Related objects: Account, ChildVisit (attendees)
 * Pattern: db.query + ConditionBuilder (async)
 */
async function isAtLeastOneHCP(contextData) {
    try {
        var accountId = record.stringValue('AccountId');
        if (!accountId) {
            accountId = contextData.ProviderVisit && contextData.ProviderVisit.AccountId;
        }
        if (!accountId) {
            return { title: 'HCP check skipped — no account', status: 'success' };
        }

        // Check if primary account is a Person Account (HCP)
        var accounts = await db.query(
            'Account',
            await new ConditionBuilder('Account', new FieldCondition('Id', '=', accountId)).build(),
            ['Id', 'IsPersonAccount']
        );
        if (accounts && accounts.length > 0 && accounts[0].boolValue('IsPersonAccount')) {
            return { title: 'HCP check passed — primary account is an HCP', status: 'success' };
        }

        // Primary is HCO — check attendees for at least one HCP
        var attendeeVisits = contextData['Visit.ParentVisitId'] || contextData['ChildVisit'];
        if (!attendeeVisits || attendeeVisits.length === 0) {
            return {
                title: 'At least one HCP (Healthcare Professional) must be associated when visiting an HCO.',
                status: 'error'
            };
        }

        var attendeeAccountIds = [];
        for (var i = 0; i < attendeeVisits.length; i++) {
            var aid = attendeeVisits[i].AccountId || attendeeVisits[i].accountid;
            if (aid) attendeeAccountIds.push(aid);
        }

        var attendeeAccounts = await db.query(
            'Account',
            await new ConditionBuilder('Account', new SetCondition('Id', 'IN', attendeeAccountIds)).build(),
            ['Id', 'IsPersonAccount']
        );

        var hasHCP = false;
        for (var j = 0; j < (attendeeAccounts || []).length; j++) {
            if (attendeeAccounts[j].boolValue('IsPersonAccount')) {
                hasHCP = true;
                break;
            }
        }

        if (!hasHCP) {
            return {
                title: 'At least one HCP (Healthcare Professional) must be associated when visiting an HCO.',
                status: 'error'
            };
        }
        return { title: 'HCP check passed', status: 'success' };
    } catch (e) {
        return { title: 'HCP validation failed: ' + e.message, status: 'error' };
    }
}
