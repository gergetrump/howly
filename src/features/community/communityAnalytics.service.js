import HabitCheckIn from '../analytics/habitCheckIn.model.js';
import CanonicalHabit from '../taxonomy/canonicalHabit.model.js';
import { buildPeriod, endOfDay, startOfDay } from '../analytics/analytics.service.js';
import { computeCompletionStanding } from './communityCompletionBenchmark.service.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function addDays(date, days) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

function buildCheckInBasePipeline(start, end) {
    return [
        {
            $match: {
                completedAt: { $gte: start, $lte: end },
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'userDoc',
            },
        },
        { $unwind: '$userDoc' },
        {
            $match: {
                'userDoc.isDeleted': { $ne: true },
            },
        },
        {
            $lookup: {
                from: 'habits',
                localField: 'habit',
                foreignField: '_id',
                as: 'habitDoc',
            },
        },
        {
            $addFields: {
                resolvedCategoryKey: {
                    $ifNull: [
                        '$categoryKey',
                        { $arrayElemAt: ['$habitDoc.taxonomy.categoryKey', 0] },
                    ],
                },
                resolvedCategoryLabel: {
                    $ifNull: [
                        '$categoryLabel',
                        { $arrayElemAt: ['$habitDoc.category', 0] },
                    ],
                },
                resolvedCanonicalHabitKey: {
                    $ifNull: [
                        '$canonicalHabitKey',
                        { $arrayElemAt: ['$habitDoc.taxonomy.canonicalHabitKey', 0] },
                    ],
                },
            },
        },
    ];
}

function formatTopCategory(categoryRows) {
    if (!categoryRows.length) {
        return null;
    }

    return {
        categoryKey: categoryRows[0].categoryKey,
        categoryLabel: categoryRows[0].categoryLabel,
    };
}

function buildCategoryRows(categoryResults, totalClassifiedCheckIns) {
    return categoryResults.map((row) => ({
        categoryKey: row._id.categoryKey,
        categoryLabel: row._id.categoryLabel ?? row._id.categoryKey,
        checkIns: row.checkIns,
        share: totalClassifiedCheckIns
            ? Math.round((row.checkIns / totalClassifiedCheckIns) * 100)
            : 0,
    }));
}

function buildTrendMetric(current, previous) {
    const safeCurrent = current ?? 0;
    const safePrevious = previous ?? 0;

    if (safeCurrent === 0 && safePrevious === 0) {
        return null;
    }

    if (safePrevious === 0) {
        if (safeCurrent === 0) {
            return null;
        }

        return {
            changePercent: null,
            direction: 'up',
            display: 'new',
        };
    }

    const changePercent = Math.round(((safeCurrent - safePrevious) / safePrevious) * 100);

    return {
        changePercent,
        direction: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat',
        display: 'percent',
    };
}

function indexByKey(items, keyName) {
    return new Map(items.map((item) => [item[keyName], item]));
}

function attachCategoryTrends(currentCategories, previousCategories) {
    const previousByKey = indexByKey(previousCategories, 'categoryKey');

    return currentCategories.map((category) => ({
        ...category,
        trend: buildTrendMetric(
            category.checkIns,
            previousByKey.get(category.categoryKey)?.checkIns ?? 0,
        ),
    }));
}

function attachTrendingTrends(currentHabits, previousHabits) {
    const previousByKey = indexByKey(previousHabits, 'canonicalHabitKey');

    return currentHabits.map((habit) => ({
        ...habit,
        trend: buildTrendMetric(
            habit.checkIns,
            previousByKey.get(habit.canonicalHabitKey)?.checkIns ?? 0,
        ),
    }));
}

async function loadCanonicalLabels(keys) {
    if (!keys.length) {
        return new Map();
    }

    const docs = await CanonicalHabit.find({ key: { $in: keys } })
        .select('key label')
        .lean();

    return new Map(docs.map((doc) => [doc.key, doc.label]));
}

async function computeRangeAnalytics(start, end) {
    const basePipeline = buildCheckInBasePipeline(start, end);

    const [summaryRows, categoryRows, trendingRows] = await Promise.all([
        HabitCheckIn.aggregate([
            ...basePipeline,
            {
                $group: {
                    _id: null,
                    checkIns: { $sum: 1 },
                    users: { $addToSet: '$user' },
                },
            },
        ]),
        HabitCheckIn.aggregate([
            ...basePipeline,
            {
                $match: {
                    resolvedCategoryKey: { $nin: [null, ''] },
                },
            },
            {
                $group: {
                    _id: {
                        categoryKey: '$resolvedCategoryKey',
                        categoryLabel: '$resolvedCategoryLabel',
                    },
                    checkIns: { $sum: 1 },
                },
            },
            { $sort: { checkIns: -1 } },
        ]),
        HabitCheckIn.aggregate([
            ...basePipeline,
            {
                $match: {
                    resolvedCanonicalHabitKey: { $nin: [null, ''] },
                },
            },
            {
                $group: {
                    _id: '$resolvedCanonicalHabitKey',
                    checkIns: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$user' },
                    categoryKey: { $first: '$resolvedCategoryKey' },
                    categoryLabel: { $first: '$resolvedCategoryLabel' },
                },
            },
            { $sort: { checkIns: -1 } },
            { $limit: 10 },
        ]),
    ]);

    const summary = summaryRows[0] ?? { checkIns: 0, users: [] };
    const totalClassifiedCheckIns = categoryRows.reduce((sum, row) => sum + row.checkIns, 0);
    const byCategory = buildCategoryRows(categoryRows, totalClassifiedCheckIns);
    const canonicalLabels = await loadCanonicalLabels(trendingRows.map((row) => row._id));

    const trendingHabits = trendingRows.map((row) => ({
        canonicalHabitKey: row._id,
        label: canonicalLabels.get(row._id) ?? row._id,
        categoryKey: row.categoryKey ?? null,
        categoryLabel: row.categoryLabel ?? null,
        checkIns: row.checkIns,
        uniqueUsers: row.uniqueUsers.length,
    }));

    return {
        checkIns: summary.checkIns,
        activeUsers: summary.users.length,
        topCategory: formatTopCategory(byCategory),
        byCategory,
        trendingHabits,
    };
}

function normalizePeriodKey(periodKey) {
    if (periodKey === 'today' || periodKey === '24h') {
        return '24h';
    }

    if (periodKey === 'month') {
        return 'month';
    }

    return 'week';
}

function buildCommunityPeriod(periodKey) {
    const normalized = normalizePeriodKey(periodKey);

    if (normalized === '24h') {
        const end = new Date();
        const start = new Date(end.getTime() - DAY_IN_MS);

        return {
            key: '24h',
            days: 1,
            start,
            end,
            label: 'last 24 hours',
        };
    }

    return buildPeriod(normalized === 'month' ? 'month' : 'week');
}

function buildPreviousCommunityPeriod(periodKey) {
    const normalized = normalizePeriodKey(periodKey);

    if (normalized === '24h') {
        const end = new Date(Date.now() - DAY_IN_MS);
        const start = new Date(end.getTime() - DAY_IN_MS);

        return {
            key: 'previous_24h',
            days: 1,
            start,
            end,
            label: 'previous 24 hours',
        };
    }

    const current = buildCommunityPeriod(periodKey);
    const previousEnd = endOfDay(addDays(current.start, -1));
    const previousStart = startOfDay(addDays(current.start, -current.days));

    return {
        key: normalized === 'month' ? 'previous_30_days' : 'previous_7_days',
        days: current.days,
        start: previousStart,
        end: previousEnd,
        label: normalized === 'month' ? 'previous 30 days' : 'previous 7 days',
    };
}

function serializePeriod(period) {
    return {
        key: period.key,
        days: period.days,
        start: period.start.toISOString(),
        end: period.end.toISOString(),
        label: period.label ?? null,
    };
}

export async function getCommunityAnalytics({ period = 'week', userId } = {}) {
    const selectedPeriod = buildCommunityPeriod(period);
    const comparisonPeriod = buildPreviousCommunityPeriod(period);

    const [stats, previousStats, standing] = await Promise.all([
        computeRangeAnalytics(selectedPeriod.start, selectedPeriod.end),
        computeRangeAnalytics(comparisonPeriod.start, comparisonPeriod.end),
        userId ? computeCompletionStanding(userId, selectedPeriod) : null,
    ]);

    return {
        period: serializePeriod(selectedPeriod),
        comparisonPeriod: serializePeriod(comparisonPeriod),
        summary: {
            topCategory: stats.topCategory,
            standing,
        },
        byCategory: attachCategoryTrends(stats.byCategory, previousStats.byCategory),
        trendingHabits: attachTrendingTrends(stats.trendingHabits, previousStats.trendingHabits),
    };
}
