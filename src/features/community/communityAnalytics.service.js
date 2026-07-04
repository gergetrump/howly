import HabitCheckIn from '../analytics/habitCheckIn.model.js';
import CanonicalHabit from '../taxonomy/canonicalHabit.model.js';
import { buildPeriod, endOfDay, startOfDay } from '../analytics/analytics.service.js';

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
        { $unwind: '$habitDoc' },
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
                    'habitDoc.taxonomy.categoryKey': { $nin: [null, ''] },
                },
            },
            {
                $group: {
                    _id: {
                        categoryKey: '$habitDoc.taxonomy.categoryKey',
                        categoryLabel: '$habitDoc.category',
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
                    'habitDoc.taxonomy.canonicalHabitKey': { $nin: [null, ''] },
                },
            },
            {
                $group: {
                    _id: '$habitDoc.taxonomy.canonicalHabitKey',
                    checkIns: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$user' },
                    categoryKey: { $first: '$habitDoc.taxonomy.categoryKey' },
                    categoryLabel: { $first: '$habitDoc.category' },
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

function buildCommunityPeriod(periodKey) {
    if (periodKey === 'today') {
        const start = startOfDay(new Date());
        const end = endOfDay(new Date());

        return {
            key: 'today',
            days: 1,
            start,
            end,
        };
    }

    return buildPeriod(periodKey === 'month' ? 'month' : 'week');
}

export async function getCommunityAnalytics({ period = 'week' } = {}) {
    const selectedPeriod = buildCommunityPeriod(period);
    const stats = await computeRangeAnalytics(selectedPeriod.start, selectedPeriod.end);

    return {
        period: {
            key: selectedPeriod.key,
            days: selectedPeriod.days,
            start: selectedPeriod.start.toISOString(),
            end: selectedPeriod.end.toISOString(),
        },
        summary: {
            activeUsers: stats.activeUsers,
            checkIns: stats.checkIns,
            topCategory: stats.topCategory,
        },
        byCategory: stats.byCategory,
        trendingHabits: stats.trendingHabits,
    };
}
