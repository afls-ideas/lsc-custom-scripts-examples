/**
 * 19. Duplicate Visit Prevention
 *
 * Warns if the rep has already submitted a visit to the same account
 * on the same day. Prevents accidental duplicate call reports.
 *
 * Related objects: ProviderVisit (existing records)
 * Pattern: db.query date-range search (async)
 */
async function duplicateVisitPrevention(contextData) {
    try {
        var accountId = '';
        var visitDate = '';
        var currentVisitId = '';

        if (contextData.ProviderVisit) {
            accountId = contextData.ProviderVisit.AccountId || '';
            visitDate = contextData.ProviderVisit.PlannedStartDateTime || contextData.ProviderVisit.ActualStartDateTime || '';
            currentVisitId = contextData.ProviderVisit.Id || '';
        }
        if (!accountId || !visitDate) {
            return { title: 'Duplicate check skipped — missing account or date', status: 'success' };
        }

        // Extract just the date portion
        var dateOnly = visitDate.split('T')[0];
        var startOfDay = dateOnly + 'T00:00:00.000Z';
        var endOfDay = dateOnly + 'T23:59:59.000Z';

        var userId;
        try { userId = user.stringValue('Id'); } catch (e) { userId = null; }
        if (!userId) {
            return { title: 'Duplicate check skipped — no user ID', status: 'success' };
        }

        var existingVisits = await db.query(
            'ProviderVisit',
            await new ConditionBuilder('ProviderVisit',
                new AndCondition([
                    new FieldCondition('AccountId', '=', accountId),
                    new FieldCondition('OwnerId', '=', userId),
                    new FieldCondition('PlannedStartDateTime', '>=', startOfDay),
                    new FieldCondition('PlannedStartDateTime', '<=', endOfDay),
                    new FieldCondition('Status', '=', 'Completed')
                ])
            ).build(),
            ['Id']
        );

        // Exclude current visit from count
        var otherVisits = 0;
        for (var i = 0; i < (existingVisits || []).length; i++) {
            if (existingVisits[i].stringValue('Id') !== currentVisitId) {
                otherVisits++;
            }
        }

        if (otherVisits > 0) {
            return {
                title: 'A completed visit to this account already exists today. Please confirm this is not a duplicate.',
                status: 'error'
            };
        }
        return { title: 'Duplicate visit check passed', status: 'success' };
    } catch (e) {
        return { title: 'Duplicate check error: ' + e.message, status: 'error' };
    }
}
