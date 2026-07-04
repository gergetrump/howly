import { asyncHandler } from '../../utils/asyncHandler.js';
import { getCommunityAnalytics } from './communityAnalytics.service.js';

export const getCommunityAnalyticsSummary = asyncHandler(async (req, res) => {
    const queryPeriod = req.query.period;
    const period = queryPeriod === 'today' || queryPeriod === 'month' ? queryPeriod : 'week';
    const result = await getCommunityAnalytics({ period });

    res.status(200).json({ data: result });
});
