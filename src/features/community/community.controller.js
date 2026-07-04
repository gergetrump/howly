import { asyncHandler } from '../../utils/asyncHandler.js';
import { getCommunityAnalytics } from './communityAnalytics.service.js';

export const getCommunityAnalyticsSummary = asyncHandler(async (req, res) => {
    const period = req.query.period === 'month' ? 'month' : 'week';
    const result = await getCommunityAnalytics({ period });

    res.status(200).json({ data: result });
});
