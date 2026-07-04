import { asyncHandler } from '../../utils/asyncHandler.js';
import { getCommunityAnalytics } from './communityAnalytics.service.js';

export const getCommunityAnalyticsSummary = asyncHandler(async (req, res) => {
    const queryPeriod = req.query.period;
    const period = queryPeriod === '24h' || queryPeriod === 'today'
        ? '24h'
        : queryPeriod === 'month'
            ? 'month'
            : 'week';
    const result = await getCommunityAnalytics({ period, userId: req.user.id });

    res.status(200).json({ data: result });
});
