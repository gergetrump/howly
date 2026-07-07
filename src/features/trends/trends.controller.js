import { asyncHandler } from '../../utils/asyncHandler.js';
import { getTrendsAnalytics } from './trendsAnalytics.service.js';

export const getTrendsAnalyticsSummary = asyncHandler(async (req, res) => {
    const queryPeriod = req.query.period;
    const period = queryPeriod === '24h' || queryPeriod === 'today'
        ? '24h'
        : queryPeriod === 'month'
            ? 'month'
            : 'week';
    const result = await getTrendsAnalytics({ period, userId: req.user.id });

    res.status(200).json({ data: result });
});
