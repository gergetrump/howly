import { asyncHandler } from '../../utils/asyncHandler.js';
import { getChallengeAnalytics, getHabitAnalytics } from './analytics.service.js';

function parseAnalyticsPeriod(period) {
    return ['week', 'month', 'year'].includes(period) ? period : 'week';
}

function parseAnalyticsYear(year) {
    const currentYear = new Date().getFullYear();
    const parsedYear = Number.parseInt(year, 10);

    if (!Number.isInteger(parsedYear) || parsedYear < 1970 || parsedYear > currentYear) {
        return currentYear;
    }

    return parsedYear;
}

export const getHabitAnalyticsSummary = asyncHandler(async (req, res) => {
    const period = parseAnalyticsPeriod(req.query.period);
    const year = parseAnalyticsYear(req.query.year);
    const result = await getHabitAnalytics(req.user.id, { period, year });

    res.status(200).json({ data: result });
});

export const getChallengeAnalyticsSummary = asyncHandler(async (req, res) => {
    const period = parseAnalyticsPeriod(req.query.period);
    const year = parseAnalyticsYear(req.query.year);
    const result = await getChallengeAnalytics(req.user.id, { period, year });

    res.status(200).json({ data: result });
});
