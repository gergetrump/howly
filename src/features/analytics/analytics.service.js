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

function daysBetweenInclusive(start, end) {
    return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_IN_MS) + 1;
}

function toDateKey(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function toMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function addYearToSet(years, date) {
    if (!date) {
        return;
    }

    const parsedDate = new Date(date);

    if (!Number.isNaN(parsedDate.getTime())) {
        years.add(parsedDate.getFullYear());
    }
}

function serializeAvailableYears(years) {
    const currentYear = new Date().getFullYear();
    years.add(currentYear);

    return [...years]
        .filter((year) => Number.isInteger(year) && year <= currentYear)
        .sort((left, right) => right - left);
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

function buildPeriod(periodKey, year = new Date().getFullYear()) {
    const today = startOfDay(new Date());
    const normalizedPeriodKey = ['week', 'month', 'year'].includes(periodKey) ? periodKey : 'week';
    const currentYear = today.getFullYear();
    const selectedYear = Number.isInteger(year) && year <= currentYear ? year : currentYear;
    const start = normalizedPeriodKey === 'year'
        ? new Date(selectedYear, 0, 1)
        : addDays(today, -((normalizedPeriodKey === 'month' ? 30 : 7) - 1));
    const end = normalizedPeriodKey === 'year' && selectedYear < currentYear
        ? endOfDay(new Date(selectedYear, 11, 31))
        : endOfDay(today);
    const days = normalizedPeriodKey === 'year'
        ? daysBetweenInclusive(start, end)
        : normalizedPeriodKey === 'month' ? 30 : 7;
    const months = Array.from({ length: 12 }, (_, index) => {
        const date = new Date(selectedYear, index, 1);

        return {
            key: toMonthKey(date),
            label: date.toLocaleDateString('en-US', { month: 'short' }),
            expected: 0,
            completed: 0,
            completionRate: null,
        };
    });

    return {
        key: normalizedPeriodKey,
        year: selectedYear,
        days,
        start,
        end,
        months,
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

function buildEarlierThanComparison(currentAverageCompletionTime, peerAverageCompletionTimes) {
    if (!currentAverageCompletionTime?.label || !peerAverageCompletionTimes.length) {
        return null;
    }

    const earlierThanCount = peerAverageCompletionTimes
        .filter((peerAverageCompletionTime) => currentAverageCompletionTime.minutes < peerAverageCompletionTime.minutes)
        .length;

    return {
        earlierThanPercent: Math.round((earlierThanCount / peerAverageCompletionTimes.length) * 100),
        comparedUsers: peerAverageCompletionTimes.length,
    };
}

function completionRate(completed, expected) {
    if (!expected) {
        return null;
    }

    return Math.round((completed / expected) * 100);
}

function buildLabelsForPeriod(period) {
    if (period.labels?.length) {
        return period.labels;
    }

    const labels = [];
    let cursor = startOfDay(period.start);
    const endDay = startOfDay(period.end);

    while (cursor <= endDay) {
        labels.push({
            date: new Date(cursor),
            key: toDateKey(cursor),
            label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            weekday: cursor.getDay() || 7,
        });
        cursor = addDays(cursor, 1);
    }

    return labels;
}

function buildPeriodStartHabitFilter(periodStart) {
    return {
        source: { $ne: 'challenge' },
        ownerId: { $exists: true, $ne: null },
        createdAt: { $lte: periodStart },
        $or: [
            { deletedAt: null },
            { deletedAt: { $gt: periodStart } },
        ],
    };
}

function computePersonalCompletionRateFromData(period, habits, checkIns) {
    if (!habits.length) {
        return { expected: 0, completed: 0, completionRate: null };
    }

    const labels = buildLabelsForPeriod(period);
    const checkInsByHabit = new Map();

    for (const checkIn of checkIns) {
        const habitId = checkIn.habit.toString();
        if (!checkInsByHabit.has(habitId)) {
            checkInsByHabit.set(habitId, []);
        }
        checkInsByHabit.get(habitId).push(checkIn);
    }

    let totalExpected = 0;
    let totalCompleted = 0;

    for (const habit of habits) {
        const habitId = habit._id.toString();
        const habitCheckIns = checkInsByHabit.get(habitId) ?? [];
        const completedDateSet = new Set(habitCheckIns.map((checkIn) => toDateKey(checkIn.completedAt)));
        let expectedCount = 0;

        for (const day of labels) {
            if (isHabitExpectedOnDay(habit, day)) {
                expectedCount += 1;
            }
        }

        const completedCount = Math.min(completedDateSet.size, expectedCount || completedDateSet.size);
        totalExpected += expectedCount;
        totalCompleted += completedCount;
    }

    return {
        expected: totalExpected,
        completed: totalCompleted,
        completionRate: completionRate(totalCompleted, totalExpected),
    };
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
        subcategoryKey: habit.taxonomy?.subcategoryKey ?? null,
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
            $set: {
                completedAt,
            },
            $setOnInsert: {
                user: userId,
                habit: habit._id,
                periodKey: getPeriodKeyForHabit(habit, completedAt),
                ...buildCheckInTaxonomySnapshot(habit),
            },
        },
        { upsert: true, returnDocument: 'after' },
    );
}

function mergeCheckInsByLatestPeriodEvent(checkIns) {
    const checkInsByEventKey = new Map();

    for (const checkIn of checkIns) {
        const eventKey = `${checkIn.habit.toString()}:${checkIn.periodKey}`;
        const existingCheckIn = checkInsByEventKey.get(eventKey);

        if (!existingCheckIn || checkIn.completedAt > existingCheckIn.completedAt) {
            checkInsByEventKey.set(eventKey, checkIn);
        }
    }

    return [...checkInsByEventKey.values()]
        .sort((left, right) => left.completedAt.getTime() - right.completedAt.getTime());
}

async function getPeerAverageCompletionTimeComparison({
    userId,
    selectedPeriod,
    source,
    currentAverageCompletionTime,
}) {
    const habitSourceFilter = source === 'challenge'
        ? { source: 'challenge' }
        : { source: { $ne: 'challenge' } };
    const peerHabits = await Habit.find({
        ownerId: { $ne: userId },
        createdAt: { $lte: selectedPeriod.end },
        ...habitSourceFilter,
    })
        .select('_id ownerId frequency lastCompletedAt')
        .lean();
    const peerHabitIds = peerHabits.map((habit) => habit._id);
    const peerCheckIns = peerHabitIds.length
        ? await HabitCheckIn.find({
            habit: { $in: peerHabitIds },
            completedAt: { $gte: selectedPeriod.start, $lte: selectedPeriod.end },
        })
            .select('user habit periodKey completedAt')
            .lean()
        : [];
    const syntheticPeerCheckIns = peerHabits
        .filter((habit) => habit.lastCompletedAt
            && habit.lastCompletedAt >= selectedPeriod.start
            && habit.lastCompletedAt <= selectedPeriod.end)
        .map((habit) => ({
            user: habit.ownerId,
            habit: habit._id,
            periodKey: getPeriodKeyForHabit(habit, habit.lastCompletedAt),
            completedAt: habit.lastCompletedAt,
            synthetic: true,
        }));
    const mergedPeerCheckIns = mergeCheckInsByLatestPeriodEvent([
        ...peerCheckIns,
        ...syntheticPeerCheckIns,
    ]);
    const peerCompletionDatesByUser = new Map();

    for (const checkIn of mergedPeerCheckIns) {
        const checkInUserId = checkIn.user.toString();

        if (!peerCompletionDatesByUser.has(checkInUserId)) {
            peerCompletionDatesByUser.set(checkInUserId, []);
        }

        peerCompletionDatesByUser.get(checkInUserId).push(checkIn.completedAt);
    }

    const peerAverageCompletionTimes = [...peerCompletionDatesByUser.values()]
        .map((dates) => averageTimeOfDay(dates))
        .filter(Boolean);

    return buildEarlierThanComparison(currentAverageCompletionTime, peerAverageCompletionTimes);
}

async function getHabitAnalyticsAvailableYears(userId) {
    const years = new Set();
    const habits = await Habit.find({
        ownerId: userId,
        source: { $ne: 'challenge' },
    })
        .select('_id createdAt deletedAt lastCompletedAt')
        .lean();

    for (const habit of habits) {
        addYearToSet(years, habit.createdAt);
        addYearToSet(years, habit.deletedAt);
        addYearToSet(years, habit.lastCompletedAt);
    }

    const habitIds = habits.map((habit) => habit._id);
    const checkIns = habitIds.length
        ? await HabitCheckIn.find({
            user: userId,
            habit: { $in: habitIds },
        })
            .select('completedAt')
            .lean()
        : [];

    for (const checkIn of checkIns) {
        addYearToSet(years, checkIn.completedAt);
    }

    return serializeAvailableYears(years);
}

async function getChallengeAnalyticsAvailableYears(userId) {
    const years = new Set();
    const participants = await ChallengeParticipant.find({
        user: userId,
        status: { $ne: 'left' },
    })
        .populate('challenge')
        .select('challenge habit joinedAt lastCompletedAt rewardClaimedAt')
        .lean();

    for (const participant of participants) {
        addYearToSet(years, participant.joinedAt);
        addYearToSet(years, participant.lastCompletedAt);
        addYearToSet(years, participant.rewardClaimedAt);
        addYearToSet(years, participant.challenge?.startsAt);
        addYearToSet(years, participant.challenge?.endsAt);
    }

    const habitIds = participants
        .map((participant) => participant.habit)
        .filter(Boolean);
    const checkIns = habitIds.length
        ? await HabitCheckIn.find({
            user: userId,
            habit: { $in: habitIds },
        })
            .select('completedAt')
            .lean()
        : [];

    for (const checkIn of checkIns) {
        addYearToSet(years, checkIn.completedAt);
    }

    return serializeAvailableYears(years);
}

export async function removeHabitCheckInForCurrentPeriod({ userId, habit }) {
    await HabitCheckIn.findOneAndDelete({
        user: userId,
        habit: habit._id,
        periodKey: getPeriodKeyForHabit(habit),
    });
}

export async function getHabitAnalytics(userId, { period = 'week', year } = {}) {
    const selectedPeriod = buildPeriod(period, year);
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
        }));

    checkIns = mergeCheckInsByLatestPeriodEvent([...checkIns, ...syntheticCheckIns]);

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
    const monthlyTotals = selectedPeriod.months.map((month) => ({ ...month }));
    const monthlyTotalIndexByKey = new Map(
        monthlyTotals.map((month, index) => [month.key, index]),
    );

    const habitAnalytics = habits.map((habit) => {
        const habitId = habit._id.toString();
        const storedHabitCheckIns = checkInsByHabit.get(habitId) ?? [];
        const latestHabitCheckIn = habit.lastCompletedAt
            && habit.lastCompletedAt >= selectedPeriod.start
            && habit.lastCompletedAt <= selectedPeriod.end
            ? [{
                user: userId,
                habit: habit._id,
                periodKey: getPeriodKeyForHabit(habit, habit.lastCompletedAt),
                completedAt: habit.lastCompletedAt,
                synthetic: true,
            }]
            : [];
        const habitCheckIns = mergeCheckInsByLatestPeriodEvent([
            ...storedHabitCheckIns,
            ...latestHabitCheckIn,
        ]);
        const completedDateSet = new Set(habitCheckIns.map((checkIn) => toDateKey(checkIn.completedAt)));
        const daily = selectedPeriod.labels.map((day, index) => {
            const expected = isHabitExpectedOnDay(habit, day);
            const completedCount = habitCheckIns.filter((checkIn) => toDateKey(checkIn.completedAt) === day.key).length;

            if (expected) {
                dailyTotals[index].expected += 1;
                const monthlyIndex = monthlyTotalIndexByKey.get(toMonthKey(day.date));

                if (monthlyIndex !== undefined) {
                    monthlyTotals[monthlyIndex].expected += 1;
                }
            }

            if (completedCount > 0) {
                dailyTotals[index].completed += completedCount;
                const monthlyIndex = monthlyTotalIndexByKey.get(toMonthKey(day.date));

                if (monthlyIndex !== undefined) {
                    monthlyTotals[monthlyIndex].completed += completedCount;
                }
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
    for (const month of monthlyTotals) {
        month.completionRate = completionRate(month.completed, month.expected);
    }

    const totalExpected = habitAnalytics.reduce((sum, item) => sum + item.expected, 0);
    const totalCompleted = habitAnalytics.reduce((sum, item) => sum + item.completed, 0);
    const allCheckInDates = checkIns.map((checkIn) => checkIn.completedAt);
    const averageCompletionTime = averageTimeOfDay(allCheckInDates);
    const averageCompletionTimeComparison = await getPeerAverageCompletionTimeComparison({
        userId,
        selectedPeriod,
        source: 'habit',
        currentAverageCompletionTime: averageCompletionTime,
    });

    return {
        period: {
            key: selectedPeriod.key,
            year: selectedPeriod.year,
            days: selectedPeriod.days,
            start: selectedPeriod.start.toISOString(),
            end: selectedPeriod.end.toISOString(),
        },
        availableYears: await getHabitAnalyticsAvailableYears(userId),
        summary: {
            expected: totalExpected,
            completed: totalCompleted,
            completionRate: completionRate(totalCompleted, totalExpected),
            averageCompletionTime,
            averageCompletionTimeComparison,
        },
        dailyTotals,
        monthlyTotals,
        habits: habitAnalytics.sort((left, right) => {
            const leftRate = left.completionRate ?? -1;
            const rightRate = right.completionRate ?? -1;
            return rightRate - leftRate;
        }),
    };
}

export async function getChallengeAnalytics(userId, { period = 'week', year } = {}) {
    const selectedPeriod = buildPeriod(period, year);
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
        }));

    checkIns = mergeCheckInsByLatestPeriodEvent([...checkIns, ...syntheticChallengeCheckIns]);
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
    const monthlyTotals = selectedPeriod.months.map((month) => ({ ...month }));
    const monthlyTotalIndexByKey = new Map(
        monthlyTotals.map((month, index) => [month.key, index]),
    );

    const challengeAnalytics = activeParticipants.map((participant) => {
        const habitId = participant.habit._id.toString();
        const participantCheckIns = checkInsByHabit.get(habitId) ?? [];
        const monthly = selectedPeriod.months.map((month) => ({ ...month }));
        const monthlyIndexByKey = new Map(
            monthly.map((month, index) => [month.key, index]),
        );
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
                const monthKey = toMonthKey(day.date);
                const monthlyIndex = monthlyIndexByKey.get(monthKey);
                const monthlyTotalIndex = monthlyTotalIndexByKey.get(monthKey);

                if (monthlyIndex !== undefined) {
                    monthly[monthlyIndex].expected += 1;
                }

                if (monthlyTotalIndex !== undefined) {
                    monthlyTotals[monthlyTotalIndex].expected += 1;
                }
            }

            if (completedCount > 0) {
                dailyTotals[index].completed += completedCount;
                const monthKey = toMonthKey(day.date);
                const monthlyIndex = monthlyIndexByKey.get(monthKey);
                const monthlyTotalIndex = monthlyTotalIndexByKey.get(monthKey);

                if (monthlyIndex !== undefined) {
                    monthly[monthlyIndex].completed += completedCount;
                }

                if (monthlyTotalIndex !== undefined) {
                    monthlyTotals[monthlyTotalIndex].completed += completedCount;
                }
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

        for (const month of monthly) {
            month.completionRate = completionRate(month.completed, month.expected);
        }

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
            monthly,
        };
    });

    for (const day of dailyTotals) {
        day.completionRate = completionRate(day.completed, day.expected);
    }
    for (const month of monthlyTotals) {
        month.completionRate = completionRate(month.completed, month.expected);
    }

    const totalExpected = challengeAnalytics.reduce((sum, item) => sum + item.expected, 0);
    const totalCompleted = challengeAnalytics.reduce((sum, item) => sum + item.completed, 0);
    const totalProgressDays = challengeAnalytics.reduce((sum, item) => sum + item.participant.daysCompleted, 0);
    const totalChallengeDays = challengeAnalytics.reduce((sum, item) => sum + item.challenge.durationDays, 0);
    const averageCompletionTime = averageTimeOfDay(checkIns.map((checkIn) => checkIn.completedAt));
    const averageCompletionTimeComparison = await getPeerAverageCompletionTimeComparison({
        userId,
        selectedPeriod,
        source: 'challenge',
        currentAverageCompletionTime: averageCompletionTime,
    });

    return {
        period: {
            key: selectedPeriod.key,
            year: selectedPeriod.year,
            days: selectedPeriod.days,
            start: selectedPeriod.start.toISOString(),
            end: selectedPeriod.end.toISOString(),
        },
        availableYears: await getChallengeAnalyticsAvailableYears(userId),
        summary: {
            activeChallengeCount: challengeAnalytics
                .filter((item) => item.participant.status === 'active')
                .length,
            expected: totalExpected,
            completed: totalCompleted,
            completionRate: completionRate(totalCompleted, totalExpected),
            progressRate: completionRate(totalProgressDays, totalChallengeDays),
            averageCompletionTime,
            averageCompletionTimeComparison,
        },
        dailyTotals,
        monthlyTotals,
        challenges: challengeAnalytics.sort((left, right) => {
            const leftRate = left.completionRate ?? -1;
            const rightRate = right.completionRate ?? -1;
            return rightRate - leftRate;
        }),
    };
}

export {
    buildPeriod,
    startOfDay,
    endOfDay,
    buildLabelsForPeriod,
    buildPeriodStartHabitFilter,
    computePersonalCompletionRateFromData,
    completionRate,
    isHabitExpectedOnDay,
    toDateKey,
};
