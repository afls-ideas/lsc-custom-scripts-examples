(() => {
    function parseContextData(record) {
        try {
            if (!record || typeof record.getContextData !== 'function') return {};
            var contextData = record.getContextData();
            if (typeof contextData === 'string') return JSON.parse(contextData);
            if (typeof contextData === 'object' && contextData !== null) return contextData;
            return {};
        } catch (e) { return {}; }
    }

    function getFieldData(contextData, baseFieldName) {
        return contextData[baseFieldName + '.VisitId'] || contextData[baseFieldName];
    }

    function unwrapProxy(results) {
        return JSON.parse(JSON.stringify(results));
    }

    async function profileBasedMessageCheck(contextData) {
        try {
            var userId;
            try { userId = user.stringValue('Id'); } catch (e) { userId = null; }
            if (!userId) {
                return { title: 'Profile message check skipped - no user ID', status: 'success' };
            }

            // Replace with your Field Sales Representative profile ID
            var TARGET_PROFILE_ID = 'Profile_Id';

            var userInfo = await db.query(
                'UserAdditionalInfo',
                await new ConditionBuilder('UserAdditionalInfo', new FieldCondition('UserId', '=', userId)).build(),
                ['Id', 'ProfileIdentifier']
            );

            if (!userInfo || userInfo.length === 0) {
                return { title: 'Profile message check skipped - profile not found', status: 'success' };
            }

            var profileId = userInfo[0].stringValue('ProfileIdentifier');
            if (profileId !== TARGET_PROFILE_ID) {
                return { title: 'Profile message check skipped - not a Field Sales Rep', status: 'success' };
            }

            var visitChannel = '';
            if (contextData.ProviderVisit) visitChannel = contextData.ProviderVisit.Channel || '';
            if (visitChannel !== 'In-Person') {
                return { title: 'Profile message check skipped - not In-Person', status: 'success' };
            }

            var visitDetails = getFieldData(contextData, 'ProviderVisitProdDetailing');
            if (!visitDetails || visitDetails.length === 0) {
                return { title: 'Profile message check passed - no details', status: 'success' };
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
            return { title: 'All details have messages - profile check passed', status: 'success' };
        } catch (e) {
            return { title: 'Profile message check error: ' + e.message, status: 'error' };
        }
    }

    async function validateVisit() {
        try {
            var contextData = parseContextData(record);
            var hasWebField = contextData['ProviderVisit'] !== undefined;
            var result = await profileBasedMessageCheck(contextData);
            var results = [result];
            if (hasWebField) { var resolved = await Promise.all(results); return unwrapProxy(resolved); }
            return unwrapProxy(results);
        } catch (error) {
            return [{ title: 'Validation error: ' + error.message, status: 'error' }];
        }
    }

    if (record && user && env && db) {
        var contextData = parseContextData(record);
        var hasWebField = contextData['ProviderVisit'] !== undefined;
        if (hasWebField) return [validateVisit()];
        else return validateVisit();
    }
})();
