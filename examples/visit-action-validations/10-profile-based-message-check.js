/**
 * 10. Profile-Based Message Requirement
 *
 * Field Sales Representatives must deliver at least one key message per
 * detailed product on In-Person visits. Other profiles are exempt.
 * Uses UserAdditionalInfo to determine the user's profile.
 *
 * Related objects: UserAdditionalInfo, ProviderVisitProdDetailing, ProviderVisitDtlProductMsg
 * Pattern: db.query for user profile + context data check (async)
 */
async function profileBasedMessageCheck(contextData) {
    try {
        // Get user profile via UserAdditionalInfo
        var userId;
        try { userId = user.stringValue('Id'); } catch (e) { userId = null; }
        if (!userId) {
            return { title: 'Profile message check skipped — no user ID', status: 'success' };
        }

        // Replace with your Field Sales Representative profile ID
        var TARGET_PROFILE_ID = 'Profile_Id';

        var userInfo = await db.query(
            'UserAdditionalInfo',
            await new ConditionBuilder('UserAdditionalInfo', new FieldCondition('UserId', '=', userId)).build(),
            ['Id', 'ProfileIdentifier']
        );

        if (!userInfo || userInfo.length === 0) {
            return { title: 'Profile message check skipped — profile not found', status: 'success' };
        }

        var profileId = userInfo[0].stringValue('ProfileIdentifier');
        if (profileId !== TARGET_PROFILE_ID) {
            return { title: 'Profile message check skipped — not a Field Sales Rep', status: 'success' };
        }

        // Check channel
        var visitChannel = '';
        if (contextData.ProviderVisit) visitChannel = contextData.ProviderVisit.Channel || '';
        if (visitChannel !== 'In-Person') {
            return { title: 'Profile message check skipped — not In-Person', status: 'success' };
        }

        // Validate messages on each detail
        var visitDetails = getFieldData(contextData, 'ProviderVisitProdDetailing');
        if (!visitDetails || visitDetails.length === 0) {
            return { title: 'Profile message check passed — no details', status: 'success' };
        }

        for (var i = 0; i < visitDetails.length; i++) {
            var messages = getFieldData(visitDetails[i], 'ProviderVisitDtlProductMsg');
            if (!messages || messages.length === 0) {
                return {
                    title: 'Field Sales Reps must deliver at least one message per detailed product on In-Person visits.',
                    status: 'error'
                };
            }
        }
        return { title: 'All details have messages — profile check passed', status: 'success' };
    } catch (e) {
        return { title: 'Profile message check error: ' + e.message, status: 'error' };
    }
}
