import { asyncHandler } from '../../utils/asyncHandler.js';
import { getHabitAnalytics } from './analytics.service.js';

export const getHabitAnalyticsSummary = asyncHandler(async (req, res) => {
    const period = req.query.period === 'month' ? 'month' : 'week';
    const result = await getHabitAnalytics(req.user.id, { period });

    res.status(200).json({ data: result });
});
