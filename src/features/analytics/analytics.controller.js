import { asyncHandler } from '../../utils/asyncHandler.js';
import { getChallengeAnalytics, getHabitAnalytics } from './analytics.service.js';

function parseAnalyticsPeriod(period) {
    return ['week', 'month', 'year'].includes(period) ? period : 'week';
}

export const getHabitAnalyticsSummary = asyncHandler(async (req, res) => {
    const period = parseAnalyticsPeriod(req.query.period);
    const result = await getHabitAnalytics(req.user.id, { period });

    res.status(200).json({ data: result });
});

export const getChallengeAnalyticsSummary = asyncHandler(async (req, res) => {
    const period = parseAnalyticsPeriod(req.query.period);
    const result = await getChallengeAnalytics(req.user.id, { period });

    res.status(200).json({ data: result });
});
