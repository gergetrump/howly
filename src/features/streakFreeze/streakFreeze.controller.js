import { asyncHandler } from '../../utils/asyncHandler.js';
import { isCompletedForPeriod } from '../habits/habit.service.js';
import { getStreakCalendar } from '../analytics/analytics.service.js';
import {
    applyFreezeToHabit,
    applyFreezeToOverall,
    STREAK_FREEZE_ERROR_CODES,
} from './streakFreeze.service.js';

const statusByErrorCode = {
    [STREAK_FREEZE_ERROR_CODES.USER_NOT_FOUND]: 404,
    [STREAK_FREEZE_ERROR_CODES.HABIT_NOT_FOUND]: 404,
    [STREAK_FREEZE_ERROR_CODES.NOT_AT_RISK]: 400,
    [STREAK_FREEZE_ERROR_CODES.NO_SHIELDS]: 400,
};

function handleStreakFreezeError(res, serviceError) {
    if (serviceError.code && statusByErrorCode[serviceError.code]) {
        return res.status(statusByErrorCode[serviceError.code]).json({
            message: 'Streak freeze failed',
            code: serviceError.code,
        });
    }

    throw serviceError;
}

export const freezeHabitStreak = asyncHandler(async (req, res) => {
    try {
        const { streakShields, habit } = await applyFreezeToHabit(req.user.id, req.params.habitId);

        return res.status(200).json({
            streakShields,
            habit: {
                id: habit._id.toString(),
                streakCount: habit.streakCount,
                streakRepairDeadline: habit.streakRepairDeadline ?? null,
                isCompletedToday: isCompletedForPeriod(habit),
            },
        });
    } catch (serviceError) {
        return handleStreakFreezeError(res, serviceError);
    }
});

export const freezeOverallStreak = asyncHandler(async (req, res) => {
    try {
        const { streakShields, streak } = await applyFreezeToOverall(req.user.id);

        return res.status(200).json({ streakShields, streak });
    } catch (serviceError) {
        return handleStreakFreezeError(res, serviceError);
    }
});

export const getStreakCalendarSummary = asyncHandler(async (req, res) => {
    const data = await getStreakCalendar(req.user.id, { month: req.query.month });

    return res.status(200).json({ data });
});
