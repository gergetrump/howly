import { asyncHandler } from '../../utils/asyncHandler.js';
import { getChallengeAnalytics, getHabitAnalytics } from './analytics.service.js';

export const getHabitAnalyticsSummary = asyncHandler(async (req, res) => {
    const period = req.query.period === 'month' ? 'month' : 'week';
    const result = await getHabitAnalytics(req.user.id, { period });

    res.status(200).json({ data: result });
});

export const getChallengeAnalyticsSummary = asyncHandler(async (req, res) => {
    const period = req.query.period === 'month' ? 'month' : 'week';
    const result = await getChallengeAnalytics(req.user.id, { period });

    res.status(200).json({ data: result });
});
