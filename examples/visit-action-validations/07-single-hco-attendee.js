/**
 * 07. Single HCO Attendee Limit
 *
 * Only one HCO (Healthcare Organization) attendee can be added per visit.
 * Multiple HCP attendees are allowed, but only one institution.
 *
 * Related objects: Account, ChildVisit
 * Pattern: parseContextData + db.query (async)
 */
async function isMoreThanOneHCO(contextData) {
    try {
        var attendeeVisits = contextData['Visit.ParentVisitId'] || contextData['ChildVisit'];
        if (!attendeeVisits || attendeeVisits.length === 0) {
            return { title: 'HCO count check passed — no attendees', status: 'success' };
        }

        var attendeeAccountIds = [];
        for (var i = 0; i < attendeeVisits.length; i++) {
            var aid = attendeeVisits[i].AccountId || attendeeVisits[i].accountid;
            if (aid) attendeeAccountIds.push(aid);
        }
        if (attendeeAccountIds.length === 0) {
            return { title: 'HCO count check passed', status: 'success' };
        }

        var attendeeAccounts = await db.query(
            'Account',
            await new ConditionBuilder('Account', new SetCondition('Id', 'IN', attendeeAccountIds)).build(),
            ['Id', 'Name', 'IsPersonAccount']
        );

        var hcoCount = 0;
        for (var j = 0; j < (attendeeAccounts || []).length; j++) {
            if (!attendeeAccounts[j].boolValue('IsPersonAccount')) {
                hcoCount++;
            }
        }

        if (hcoCount > 1) {
            return {
                title: 'Only 1 HCO (Healthcare Organization) attendee can be added per visit. Found ' + hcoCount + '.',
                status: 'error'
            };
        }
        return { title: 'HCO count check passed — ' + hcoCount + ' HCO(s)', status: 'success' };
    } catch (e) {
        return { title: 'HCO count validation failed: ' + e.message, status: 'error' };
    }
}
