/**
 * 09. Channel-Specific Validation — In-Person Visits Require Details
 *
 * In-Person visits must have at least one detailed product. Remote/virtual
 * visits are exempt from this requirement.
 *
 * Related objects: ProviderVisit, ProviderVisitProdDetailing
 * Pattern: parseContextData field check (synchronous)
 */
function inPersonRequiresDetails(contextData) {
    try {
        var visitChannel = '';
        if (contextData.ProviderVisit) {
            visitChannel = contextData.ProviderVisit.Channel || '';
        } else if (contextData.Visit) {
            visitChannel = contextData.Visit.channel || '';
        }

        if (visitChannel !== 'In-Person') {
            return { title: 'Channel check skipped — visit is ' + (visitChannel || 'unknown'), status: 'success' };
        }

        var detailData = getFieldData(contextData, 'ProviderVisitProdDetailing');
        var hasDetails = detailData && detailData.length > 0;

        if (!hasDetails) {
            return {
                title: 'In-Person visits must include at least one detailed product discussion.',
                status: 'error'
            };
        }
        return { title: 'In-Person detail check passed — ' + detailData.length + ' detail(s)', status: 'success' };
    } catch (e) {
        return { title: 'In-Person visits require at least one detailed product.', status: 'error' };
    }
}
