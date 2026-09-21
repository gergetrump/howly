import Habit from '../habits/habit.model.js';
import HabitCheckIn from '../analytics/habitCheckIn.model.js';
import User from '../users/user.model.js';
import {
    buildPeriodStartHabitFilter,
    computePersonalCompletionRateFromData,
} from '../analytics/analytics.service.js';

function toIdString(value) {
    if (!value) {
        return null;
    }

    return value.toString();
}

function computeAheadPercent(viewerRate, rates) {
    const eligibleRates = rates.filter((rate) => rate !== null);

    if (!eligibleRates.length) {
        return null;
    }

    const usersBelow = eligibleRates.filter((rate) => rate < viewerRate).length;

    return Math.floor((usersBelow / eligibleRates.length) * 100);
}

function buildStandingResult({ display, eligible = false, aheadPercent = null, userCompletionRate = null }) {
    return {
        eligible,
        display,
        aheadPercent,
        userCompletionRate,
    };
}

function computeRatesForUsers(habits, checkIns, period) {
    const habitsByUser = new Map();
    const checkInsByUser = new Map();

    for (const habit of habits) {
        const userId = toIdString(habit.ownerId);
        if (!userId) {
            continue;
        }
        if (!habitsByUser.has(userId)) {
            habitsByUser.set(userId, []);
        }
        habitsByUser.get(userId).push(habit);
    }

    for (const checkIn of checkIns) {
        const userId = toIdString(checkIn.user);
        if (!userId) {
            continue;
        }
        if (!checkInsByUser.has(userId)) {
            checkInsByUser.set(userId, []);
        }
        checkInsByUser.get(userId).push(checkIn);
    }

    const userIds = new Set([...habitsByUser.keys(), ...checkInsByUser.keys()]);
    const ratesByUser = new Map();

    for (const userId of userIds) {
        const userHabits = habitsByUser.get(userId) ?? [];
        const userCheckIns = checkInsByUser.get(userId) ?? [];
        const { expected, completionRate } = computePersonalCompletionRateFromData(
            period,
            userHabits,
            userCheckIns,
        );

        if (expected > 0) {
            ratesByUser.set(userId, completionRate);
        }
    }

    return ratesByUser;
}

export async function computeCompletionStanding(viewerUserId, period) {
    const viewerId = viewerUserId.toString();
    const habitFilter = buildPeriodStartHabitFilter(period.start);

    const [users, habits] = await Promise.all([
        User.find({ isDeleted: { $ne: true } }).select('_id').lean(),
        Habit.find(habitFilter).select('ownerId frequency customDays createdAt deletedAt').lean(),
    ]);

    const habitIds = habits.map((habit) => habit._id);
    const checkIns = habitIds.length
        ? await HabitCheckIn.find({
            habit: { $in: habitIds },
            completedAt: { $gte: period.start, $lte: period.end },
        }).select('user habit completedAt periodKey').lean()
        : [];

    const ratesByUser = computeRatesForUsers(habits, checkIns, period);
    const viewerRate = ratesByUser.get(viewerId) ?? null;
    const viewerQualifyingHabits = habits.filter(
        (habit) => toIdString(habit.ownerId) === viewerId,
    );

    if (!viewerQualifyingHabits.length) {
        return buildStandingResult({ display: 'no_habits' });
    }

    if (viewerRate === null) {
        return buildStandingResult({ display: 'not_eligible' });
    }

    const poolRates = [...users]
        .map((user) => ratesByUser.get(user._id.toString()) ?? null)
        .filter((rate) => rate !== null);

    const aheadPercent = computeAheadPercent(viewerRate, poolRates);

    return buildStandingResult({
        eligible: true,
        display: 'percent',
        aheadPercent,
        userCompletionRate: viewerRate,
    });
}
