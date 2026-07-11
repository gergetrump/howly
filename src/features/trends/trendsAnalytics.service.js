import HabitCheckIn from '../analytics/habitCheckIn.model.js';
import CanonicalHabit from '../taxonomy/canonicalHabit.model.js';
import { buildPeriod, endOfDay, startOfDay } from '../analytics/analytics.service.js';
import { computeCompletionStanding } from './trendsCompletionBenchmark.service.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TRENDS_PERIOD = '7d';

const TRENDS_PERIOD_LABELS = {
    '24h': 'last 24 hours',
    '7d': 'last 7 days',
    '30d': 'last 30 days',
};

const TRENDS_COMPARISON_PERIOD_KEYS = {
    '24h': 'previous_24h',
    '7d': 'previous_7d',
    '30d': 'previous_30d',
};

const TRENDS_COMPARISON_PERIOD_LABELS = {
    '24h': 'previous 24 hours',
    '7d': 'previous 7 days',
    '30d': 'previous 30 days',
};

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
                'userDoc.ghostMode': { $ne: true },
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
                resolvedSubcategoryKey: {
                    $ifNull: [
                        '$subcategoryKey',
                        { $arrayElemAt: ['$habitDoc.taxonomy.subcategoryKey', 0] },
                    ],
                },
            },
        },
    ];
}

function formatSubcategoryLabel(subcategoryKey) {
    if (!subcategoryKey) {
        return '';
    }

    return subcategoryKey
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
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

function buildSubcategoryRows(subcategoryResults, totalClassifiedCheckIns) {
    return subcategoryResults.map((row) => ({
        categoryKey: row._id.categoryKey,
        subcategoryKey: row._id.subcategoryKey,
        subcategoryLabel: formatSubcategoryLabel(row._id.subcategoryKey),
        checkIns: row.checkIns,
        share: totalClassifiedCheckIns
            ? Math.round((row.checkIns / totalClassifiedCheckIns) * 100)
            : 0,
    }));
}

function groupSubcategoriesByCategory(subcategoryRows) {
    const grouped = new Map();

    for (const row of subcategoryRows) {
        if (!grouped.has(row.categoryKey)) {
            grouped.set(row.categoryKey, []);
        }

        grouped.get(row.categoryKey).push({
            subcategoryKey: row.subcategoryKey,
            subcategoryLabel: row.subcategoryLabel,
            checkIns: row.checkIns,
            share: row.share,
        });
    }

    return grouped;
}

function attachSubcategoriesToCategories(categories, subcategoryRows) {
    const grouped = groupSubcategoriesByCategory(subcategoryRows);

    return categories.map((category) => ({
        ...category,
        bySubcategory: grouped.get(category.categoryKey) ?? [],
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

function buildPulseSummary(currentStats, previousStats) {
    return {
        checkIns: currentStats.checkIns,
        checkInsTrend: buildTrendMetric(currentStats.checkIns, previousStats.checkIns),
        activeUsers: {
            count: currentStats.activeUsers ?? 0,
            trend: buildTrendMetric(currentStats.activeUsers, previousStats.activeUsers),
        },
    };
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

    const [summaryRows, categoryRows, subcategoryRows, trendingRows] = await Promise.all([
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
                    resolvedCategoryKey: { $nin: [null, ''] },
                    resolvedSubcategoryKey: { $nin: [null, ''] },
                },
            },
            {
                $group: {
                    _id: {
                        categoryKey: '$resolvedCategoryKey',
                        subcategoryKey: '$resolvedSubcategoryKey',
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
    const bySubcategory = buildSubcategoryRows(subcategoryRows, totalClassifiedCheckIns);
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
        bySubcategory,
        trendingHabits,
    };
}

function buildTrendsPeriod(periodKey) {
    if (periodKey === '24h') {
        const end = new Date();
        const start = new Date(end.getTime() - DAY_IN_MS);

        return {
            key: '24h',
            days: 1,
            start,
            end,
            label: TRENDS_PERIOD_LABELS['24h'],
        };
    }

    const trendsKey = periodKey === '30d' ? '30d' : '7d';
    const range = buildPeriod(trendsKey === '30d' ? 'month' : 'week');

    return {
        ...range,
        key: trendsKey,
        label: TRENDS_PERIOD_LABELS[trendsKey],
    };
}

function buildPreviousTrendsPeriod(periodKey) {
    if (periodKey === '24h') {
        const end = new Date(Date.now() - DAY_IN_MS);
        const start = new Date(end.getTime() - DAY_IN_MS);

        return {
            key: TRENDS_COMPARISON_PERIOD_KEYS['24h'],
            days: 1,
            start,
            end,
            label: TRENDS_COMPARISON_PERIOD_LABELS['24h'],
        };
    }

    const trendsKey = periodKey === '30d' ? '30d' : '7d';
    const current = buildTrendsPeriod(trendsKey);
    const previousEnd = endOfDay(addDays(current.start, -1));
    const previousStart = startOfDay(addDays(current.start, -current.days));

    return {
        key: TRENDS_COMPARISON_PERIOD_KEYS[trendsKey],
        days: current.days,
        start: previousStart,
        end: previousEnd,
        label: TRENDS_COMPARISON_PERIOD_LABELS[trendsKey],
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

export async function getTrendsAnalytics({ period = DEFAULT_TRENDS_PERIOD, userId } = {}) {
    const selectedPeriod = buildTrendsPeriod(period);
    const comparisonPeriod = buildPreviousTrendsPeriod(period);

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
            pulse: buildPulseSummary(stats, previousStats),
        },
        byCategory: attachSubcategoriesToCategories(
            attachCategoryTrends(stats.byCategory, previousStats.byCategory),
            stats.bySubcategory,
        ),
        trendingHabits: attachTrendingTrends(stats.trendingHabits, previousStats.trendingHabits),
    };
}
