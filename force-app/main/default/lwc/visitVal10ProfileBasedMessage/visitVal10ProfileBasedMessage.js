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
            var TARGET_PROFILE_NAME = 'Field Sales Representative';

            var userId;
            try { userId = user.stringValue('Id'); } catch (e) { userId = null; }
            if (!userId) {
                return { title: 'Profile message check skipped - no user ID', status: 'success' };
            }

            var profiles = await db.query(
                'Profile',
                await new ConditionBuilder('Profile', new FieldCondition('Name', '=', TARGET_PROFILE_NAME)).build(),
                ['Id', 'Name']
            );
            env.log('visitVal10 - profiles found: ' + (profiles || []).length);

            if (!profiles || profiles.length === 0) {
                return { title: 'Profile message check skipped - profile "' + TARGET_PROFILE_NAME + '" not found', status: 'success' };
            }

            var targetProfileId = profiles[0].stringValue('Id');
            env.log('visitVal10 - targetProfileId: ' + targetProfileId);

            var userInfo = await db.query(
                'UserAdditionalInfo',
                await new ConditionBuilder('UserAdditionalInfo', new FieldCondition('UserId', '=', userId)).build(),
                ['Id', 'ProfileIdentifier']
            );
            env.log('visitVal10 - userInfo found: ' + (userInfo || []).length);

            if (!userInfo || userInfo.length === 0) {
                return { title: 'Profile message check skipped - user profile not found', status: 'success' };
            }

            var userProfileId = userInfo[0].stringValue('ProfileIdentifier');
            env.log('visitVal10 - userProfileId: ' + userProfileId);

            if (userProfileId !== targetProfileId) {
                return { title: 'Profile message check skipped - not a ' + TARGET_PROFILE_NAME, status: 'success' };
            }

            var visit = contextData.ProviderVisit || {};
            var visitChannel = visit.Channel || visit.channel || '';
            env.log('visitVal10 - Channel: ' + visitChannel);

            if (visitChannel !== 'In-Person') {
                return { title: 'Profile message check skipped - not In-Person', status: 'success' };
            }

            var visitDetails = getFieldData(contextData, 'ProviderVisitProdDetailing');
            env.log('visitVal10 - visitDetails: ' + JSON.stringify(visitDetails));

            if (!visitDetails || visitDetails.length === 0) {
                return {
                    title: TARGET_PROFILE_NAME + 's must detail at least one product on In-Person visits.',
                    status: 'error'
                };
            }

            for (var i = 0; i < visitDetails.length; i++) {
                var messages = visitDetails[i]['ProviderVisitDtlProductMsg.VisitId'] || visitDetails[i]['ProviderVisitDtlProductMsg'];
                if (!messages || messages.length === 0) {
                    return {
                        title: TARGET_PROFILE_NAME + 's must deliver at least one message per detailed product on In-Person visits.',
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

    env.log('visitVal10 - script loaded');
    if (record && user && env && db) {
        env.log('visitVal10 - globals available, executing');
        var contextData = parseContextData(record);
        var hasWebField = contextData['ProviderVisit'] !== undefined;
        if (hasWebField) return [validateVisit()];
        else return validateVisit();
    }
})();
