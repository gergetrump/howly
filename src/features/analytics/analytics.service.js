import Habit from '../habits/habit.model.js';
import ChallengeParticipant from '../challenges/challengeParticipant.model.js';
import HabitCheckIn from './habitCheckIn.model.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 7];

function startOfDay(date) {
    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
}

function endOfDay(date) {
    const nextDate = new Date(date);
    nextDate.setHours(23, 59, 59, 999);
    return nextDate;
}

function addDays(date, days) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

function toDateKey(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function getIsoWeekYear(date) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
    return utcDate.getUTCFullYear();
}

function getIsoWeek(date) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    return Math.ceil((((utcDate - yearStart) / DAY_IN_MS) + 1) / 7);
}

function getPeriodKeyForHabit(habit, date = new Date()) {
    if (habit.frequency === 'Weekly') {
        return `${getIsoWeekYear(date)}-W${String(getIsoWeek(date)).padStart(2, '0')}`;
    }

    if (habit.frequency === 'Monthly') {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    return toDateKey(date);
}

function buildPeriod(periodKey) {
    const today = startOfDay(new Date());
    const days = periodKey === 'month' ? 30 : 7;
    const start = addDays(today, -(days - 1));
    const end = endOfDay(today);

    return {
        key: periodKey === 'month' ? 'month' : 'week',
        days,
        start,
        end,
        labels: Array.from({ length: days }, (_, index) => {
            const date = addDays(start, index);
            return {
                date,
                key: toDateKey(date),
                label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                weekday: date.getDay() || 7,
            };
        }),
    };
}

function isHabitExpectedOnDay(habit, day) {
    const createdAt = startOfDay(habit.createdAt ?? day.date);

    if (day.date < createdAt) {
        return false;
    }

    if (habit.frequency === 'Daily') {
        return true;
    }

    if (habit.frequency === 'Custom') {
        const scheduledDays = habit.customDays?.length ? habit.customDays : WEEKDAY_VALUES;
        return scheduledDays.includes(day.weekday);
    }

    if (habit.frequency === 'Weekly') {
        const firstExpectedDay = habit.customDays?.[0] ?? 1;
        return day.weekday === firstExpectedDay;
    }

    if (habit.frequency === 'Monthly') {
        const createdDay = createdAt.getDate();
        return day.date.getDate() === Math.min(createdDay, 28);
    }

    return false;
}

function getMinutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
}

function formatTime(minutes) {
    if (!Number.isFinite(minutes)) {
        return null;
    }

    const rounded = Math.round(minutes);
    const hours = Math.floor(rounded / 60) % 24;
    const mins = rounded % 60;

    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function averageTimeOfDay(dates) {
    if (!dates.length) {
        return null;
    }

    const fullCircle = 2 * Math.PI;
    const vectors = dates.reduce(
        (total, date) => {
            const angle = (getMinutesSinceMidnight(date) / 1440) * fullCircle;
            return {
                sin: total.sin + Math.sin(angle),
                cos: total.cos + Math.cos(angle),
            };
        },
        { sin: 0, cos: 0 },
    );
    const angle = Math.atan2(vectors.sin / dates.length, vectors.cos / dates.length);
    const normalizedAngle = angle < 0 ? angle + fullCircle : angle;
    const minutes = (normalizedAngle / fullCircle) * 1440;

    return {
        minutes,
        label: formatTime(minutes),
    };
}

function completionRate(completed, expected) {
    if (!expected) {
        return null;
    }

    return Math.round((completed / expected) * 100);
}

function serializeHabit(habit) {
    return {
        id: habit._id.toString(),
        title: habit.title,
        icon: habit.icon,
        frequency: habit.frequency,
        category: habit.category ?? null,
    };
}

function serializeChallenge(challenge) {
    return {
        id: challenge._id.toString(),
        title: challenge.title,
        habitTitle: challenge.habitTitle,
        status: challenge.status,
        visibility: challenge.visibility,
        durationDays: challenge.durationDays,
        coinReward: challenge.coinReward,
        startsAt: challenge.startsAt?.toISOString(),
        endsAt: challenge.endsAt?.toISOString(),
    };
}

function isWithinRange(day, startsAt, endsAt) {
    return day.date >= startOfDay(startsAt) && day.date <= endOfDay(endsAt);
}

function buildCheckInTaxonomySnapshot(habit) {
    return {
        categoryKey: habit.taxonomy?.categoryKey ?? null,
        categoryLabel: habit.category ?? null,
        canonicalHabitKey: habit.taxonomy?.canonicalHabitKey ?? null,
    };
}

export async function recordHabitCheckIn({ userId, habit, completedAt = new Date() }) {
    await HabitCheckIn.findOneAndUpdate(
        {
            user: userId,
            habit: habit._id,
            periodKey: getPeriodKeyForHabit(habit, completedAt),
        },
        {
            $setOnInsert: {
                user: userId,
                habit: habit._id,
                periodKey: getPeriodKeyForHabit(habit, completedAt),
                completedAt,
                ...buildCheckInTaxonomySnapshot(habit),
            },
        },
        { upsert: true, new: true },
    );
}

export async function removeHabitCheckInForCurrentPeriod({ userId, habit }) {
    await HabitCheckIn.findOneAndDelete({
        user: userId,
        habit: habit._id,
        periodKey: getPeriodKeyForHabit(habit),
    });
}

export async function getHabitAnalytics(userId, { period = 'week' } = {}) {
    const selectedPeriod = buildPeriod(period);
    const habits = await Habit.find({
        ownerId: userId,
        source: { $ne: 'challenge' },
        createdAt: { $lte: selectedPeriod.end },
    }).sort({ createdAt: 1 });
    const habitIds = habits.map((habit) => habit._id);
    let checkIns = habitIds.length
        ? await HabitCheckIn.find({
            user: userId,
            habit: { $in: habitIds },
            completedAt: { $gte: selectedPeriod.start, $lte: selectedPeriod.end },
        }).sort({ completedAt: 1 }).lean()
        : [];

    const existingEventKeys = new Set(
        checkIns.map((checkIn) => `${checkIn.habit.toString()}:${checkIn.periodKey}`),
    );
    const syntheticCheckIns = habits
        .filter((habit) => habit.lastCompletedAt
            && habit.lastCompletedAt >= selectedPeriod.start
            && habit.lastCompletedAt <= selectedPeriod.end)
        .map((habit) => ({
            user: userId,
            habit: habit._id,
            periodKey: getPeriodKeyForHabit(habit, habit.lastCompletedAt),
            completedAt: habit.lastCompletedAt,
            synthetic: true,
        }))
        .filter((checkIn) => !existingEventKeys.has(`${checkIn.habit.toString()}:${checkIn.periodKey}`));

    checkIns = [...checkIns, ...syntheticCheckIns]
        .sort((left, right) => left.completedAt.getTime() - right.completedAt.getTime());

    const checkInsByHabit = new Map();
    for (const checkIn of checkIns) {
        const habitId = checkIn.habit.toString();
        if (!checkInsByHabit.has(habitId)) {
            checkInsByHabit.set(habitId, []);
        }
        checkInsByHabit.get(habitId).push(checkIn);
    }

    const dailyTotals = selectedPeriod.labels.map((day) => ({
        date: day.key,
        label: day.label,
        expected: 0,
        completed: 0,
        completionRate: null,
    }));

    const habitAnalytics = habits.map((habit) => {
        const habitId = habit._id.toString();
        const habitCheckIns = checkInsByHabit.get(habitId) ?? [];
        const completedDateSet = new Set(habitCheckIns.map((checkIn) => toDateKey(checkIn.completedAt)));
        const daily = selectedPeriod.labels.map((day, index) => {
            const expected = isHabitExpectedOnDay(habit, day);
            const completedCount = habitCheckIns.filter((checkIn) => toDateKey(checkIn.completedAt) === day.key).length;

            if (expected) {
                dailyTotals[index].expected += 1;
            }

            if (completedCount > 0) {
                dailyTotals[index].completed += completedCount;
            }

            return {
                date: day.key,
                label: day.label,
                expected,
                completed: completedCount > 0,
                count: completedCount,
            };
        });
        const expectedCount = daily.filter((day) => day.expected).length;
        const completedCount = Math.min(completedDateSet.size, expectedCount || completedDateSet.size);
        const averageCompletionTime = averageTimeOfDay(habitCheckIns.map((checkIn) => checkIn.completedAt));

        return {
            habit: serializeHabit(habit),
            expected: expectedCount,
            completed: completedCount,
            completionRate: completionRate(completedCount, expectedCount),
            averageCompletionTime,
            daily,
        };
    });

    for (const day of dailyTotals) {
        day.completionRate = completionRate(day.completed, day.expected);
    }

    const totalExpected = habitAnalytics.reduce((sum, item) => sum + item.expected, 0);
    const totalCompleted = habitAnalytics.reduce((sum, item) => sum + item.completed, 0);
    const allCheckInDates = checkIns.map((checkIn) => checkIn.completedAt);

    return {
        period: {
            key: selectedPeriod.key,
            days: selectedPeriod.days,
            start: selectedPeriod.start.toISOString(),
            end: selectedPeriod.end.toISOString(),
        },
        summary: {
            expected: totalExpected,
            completed: totalCompleted,
            completionRate: completionRate(totalCompleted, totalExpected),
            averageCompletionTime: averageTimeOfDay(allCheckInDates),
        },
        dailyTotals,
        habits: habitAnalytics.sort((left, right) => {
            const leftRate = left.completionRate ?? -1;
            const rightRate = right.completionRate ?? -1;
            return rightRate - leftRate;
        }),
    };
}

export async function getChallengeAnalytics(userId, { period = 'week' } = {}) {
    const selectedPeriod = buildPeriod(period);
    const participants = await ChallengeParticipant.find({
        user: userId,
        status: { $ne: 'left' },
        joinedAt: { $lte: selectedPeriod.end },
    })
        .populate('challenge')
        .populate('habit')
        .sort({ joinedAt: -1 });
    const activeParticipants = participants.filter((participant) => (
        participant.challenge
        && participant.habit
        && participant.challenge.startsAt <= selectedPeriod.end
        && participant.challenge.endsAt >= selectedPeriod.start
    ));
    const habitIds = activeParticipants.map((participant) => participant.habit._id);
    let checkIns = habitIds.length
        ? await HabitCheckIn.find({
            user: userId,
            habit: { $in: habitIds },
            completedAt: { $gte: selectedPeriod.start, $lte: selectedPeriod.end },
        }).sort({ completedAt: 1 }).lean()
        : [];
    const existingChallengeEventKeys = new Set(
        checkIns.map((checkIn) => `${checkIn.habit.toString()}:${checkIn.periodKey}`),
    );
    const syntheticChallengeCheckIns = activeParticipants
        .filter((participant) => participant.lastCompletedAt
            && participant.lastCompletedAt >= selectedPeriod.start
            && participant.lastCompletedAt <= selectedPeriod.end)
        .map((participant) => ({
            user: userId,
            habit: participant.habit._id,
            periodKey: getPeriodKeyForHabit(participant.habit, participant.lastCompletedAt),
            completedAt: participant.lastCompletedAt,
            synthetic: true,
        }))
        .filter((checkIn) => !existingChallengeEventKeys.has(`${checkIn.habit.toString()}:${checkIn.periodKey}`));

    checkIns = [...checkIns, ...syntheticChallengeCheckIns]
        .sort((left, right) => left.completedAt.getTime() - right.completedAt.getTime());
    const checkInsByHabit = new Map();

    for (const checkIn of checkIns) {
        const habitId = checkIn.habit.toString();
        if (!checkInsByHabit.has(habitId)) {
            checkInsByHabit.set(habitId, []);
        }
        checkInsByHabit.get(habitId).push(checkIn);
    }

    const dailyTotals = selectedPeriod.labels.map((day) => ({
        date: day.key,
        label: day.label,
        expected: 0,
        completed: 0,
        completionRate: null,
    }));

    const challengeAnalytics = activeParticipants.map((participant) => {
        const habitId = participant.habit._id.toString();
        const participantCheckIns = checkInsByHabit.get(habitId) ?? [];
        const daily = selectedPeriod.labels.map((day, index) => {
            const expected = isWithinRange(
                day,
                participant.joinedAt > participant.challenge.startsAt
                    ? participant.joinedAt
                    : participant.challenge.startsAt,
                participant.challenge.endsAt,
            );
            const completedCount = participantCheckIns
                .filter((checkIn) => toDateKey(checkIn.completedAt) === day.key)
                .length;

            if (expected) {
                dailyTotals[index].expected += 1;
            }

            if (completedCount > 0) {
                dailyTotals[index].completed += completedCount;
            }

            return {
                date: day.key,
                label: day.label,
                expected,
                completed: completedCount > 0,
                count: completedCount,
            };
        });
        const expectedCount = daily.filter((day) => day.expected).length;
        const completedCount = daily.filter((day) => day.completed).length;
        const progressRate = completionRate(participant.daysCompleted, participant.challenge.durationDays);

        return {
            challenge: serializeChallenge(participant.challenge),
            habit: serializeHabit(participant.habit),
            participant: {
                id: participant._id.toString(),
                status: participant.status,
                joinedAt: participant.joinedAt.toISOString(),
                daysCompleted: participant.daysCompleted,
                rewardCoins: participant.rewardCoins,
                rewardClaimed: participant.rewardClaimed,
            },
            expected: expectedCount,
            completed: completedCount,
            completionRate: completionRate(completedCount, expectedCount),
            progressRate,
            averageCompletionTime: averageTimeOfDay(participantCheckIns.map((checkIn) => checkIn.completedAt)),
            daily,
        };
    });

    for (const day of dailyTotals) {
        day.completionRate = completionRate(day.completed, day.expected);
    }

    const totalExpected = challengeAnalytics.reduce((sum, item) => sum + item.expected, 0);
    const totalCompleted = challengeAnalytics.reduce((sum, item) => sum + item.completed, 0);
    const totalProgressDays = challengeAnalytics.reduce((sum, item) => sum + item.participant.daysCompleted, 0);
    const totalChallengeDays = challengeAnalytics.reduce((sum, item) => sum + item.challenge.durationDays, 0);

    return {
        period: {
            key: selectedPeriod.key,
            days: selectedPeriod.days,
            start: selectedPeriod.start.toISOString(),
            end: selectedPeriod.end.toISOString(),
        },
        summary: {
            activeChallengeCount: challengeAnalytics
                .filter((item) => item.participant.status === 'active')
                .length,
            expected: totalExpected,
            completed: totalCompleted,
            completionRate: completionRate(totalCompleted, totalExpected),
            progressRate: completionRate(totalProgressDays, totalChallengeDays),
            averageCompletionTime: averageTimeOfDay(checkIns.map((checkIn) => checkIn.completedAt)),
        },
        dailyTotals,
        challenges: challengeAnalytics.sort((left, right) => {
            const leftRate = left.completionRate ?? -1;
            const rightRate = right.completionRate ?? -1;
            return rightRate - leftRate;
        }),
    };
}

export { buildPeriod, startOfDay, endOfDay };
