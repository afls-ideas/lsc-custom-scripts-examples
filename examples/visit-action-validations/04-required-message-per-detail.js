/**
 * 04. Required Message Per Detailed Product
 *
 * Each detailed product (ProviderVisitProdDetailing) must have at least
 * one product message (ProviderVisitDtlProductMsg) delivered. Ensures
 * reps deliver key brand messages during the call.
 *
 * Related objects: ProviderVisitProdDetailing, ProviderVisitDtlProductMsg
 * Pattern: parseContextData + nested getFieldData (synchronous)
 */
function requiredMessagePerDetail(contextData) {
    try {
        var visitDetails = getFieldData(contextData, 'ProviderVisitProdDetailing');
        if (!visitDetails || visitDetails.length === 0) {
            return { title: 'Message check passed — no details to validate', status: 'success' };
        }

        var detailsWithoutMessages = [];
        for (var i = 0; i < visitDetails.length; i++) {
            var detail = visitDetails[i];
            var messages = getFieldData(detail, 'ProviderVisitDtlProductMsg');
            if (!messages || messages.length === 0) {
                detailsWithoutMessages.push(i + 1);
            }
        }

        if (detailsWithoutMessages.length > 0) {
            return {
                title: 'At least one message must be delivered for each detailed product. Missing for detail(s): ' + detailsWithoutMessages.join(', '),
                status: 'error'
            };
        }
        return {
            title: 'All ' + visitDetails.length + ' detailed products have messages',
            status: 'success'
        };
    } catch (e) {
        return { title: 'Each detailed product must have at least one message.', status: 'error' };
    }
}
