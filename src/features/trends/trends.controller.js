import { asyncHandler } from '../../utils/asyncHandler.js';
import { getTrendsAnalytics } from './trendsAnalytics.service.js';

const TRENDS_PERIODS = ['24h', '7d', '30d'];

export const getTrendsAnalyticsSummary = asyncHandler(async (req, res) => {
    const period = TRENDS_PERIODS.includes(req.query.period) ? req.query.period : '7d';
    const result = await getTrendsAnalytics({ period, userId: req.user.id });

    res.status(200).json({ data: result });
});
