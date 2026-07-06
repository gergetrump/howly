import Habit from '../habits/habit.model.js';
import HabitCheckIn from '../analytics/habitCheckIn.model.js';
import CanonicalHabit from '../taxonomy/canonicalHabit.model.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const WEIGHT_RECENT_7D = 3.0;
const WEIGHT_RECENT_30D = 1.0;
const WEIGHT_EXISTS = 0.5;

const CANONICAL_WEIGHT = 10;
const SUBCATEGORY_WEIGHT = 5;
const CATEGORY_WEIGHT = 3;

function emptyScoreMap() {
    return {
        categoryScores: {},
        subcategoryScores: {},
        canonicalScores: {},
    };
}

function addToMap(map, key, amount) {
    if (!key) {
        return;
    }

    map[key] = (map[key] ?? 0) + amount;
}

function normalizeScoreMap(map) {
    const values = Object.values(map);
    const max = values.length ? Math.max(...values) : 0;

    if (max <= 0) {
        return map;
    }

    return Object.fromEntries(
        Object.entries(map).map(([key, value]) => [key, value / max]),
    );
}

function getMapValue(map, key) {
    if (!key) {
        return 0;
    }

    return map[key] ?? 0;
}

export async function buildUserHabitProfile(userId, { windowDays = 30 } = {}) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowDays * DAY_IN_MS);
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_IN_MS);

    const habits = await Habit.find({
        ownerId: userId,
        deletedAt: null,
        source: { $ne: 'challenge' },
        'taxonomy.canonicalHabitKey': { $nin: [null, ''] },
    })
        .select('taxonomy')
        .lean();

    if (!habits.length) {
        return emptyScoreMap();
    }

    const habitIds = habits.map((habit) => habit._id);
    const checkIns = await HabitCheckIn.find({
        user: userId,
        habit: { $in: habitIds },
        completedAt: { $gte: windowStart },
    })
        .select('habit completedAt categoryKey canonicalHabitKey')
        .sort({ completedAt: -1 })
        .lean();

    const latestCheckInByHabit = new Map();
    const hasCheckInWithin7d = new Set();
    const hasCheckInWithin30d = new Set();

    for (const checkIn of checkIns) {
        const habitId = checkIn.habit.toString();

        if (!latestCheckInByHabit.has(habitId)) {
            latestCheckInByHabit.set(habitId, checkIn);
        }

        hasCheckInWithin30d.add(habitId);

        if (checkIn.completedAt >= sevenDaysAgo) {
            hasCheckInWithin7d.add(habitId);
        }
    }

    const categoryScores = {};
    const subcategoryScores = {};
    const canonicalScores = {};

    for (const habit of habits) {
        const habitId = habit._id.toString();
        let weight = WEIGHT_EXISTS;

        if (hasCheckInWithin7d.has(habitId)) {
            weight = WEIGHT_RECENT_7D;
        } else if (hasCheckInWithin30d.has(habitId)) {
            weight = WEIGHT_RECENT_30D;
        }

        const latestCheckIn = latestCheckInByHabit.get(habitId);
        const categoryKey = latestCheckIn?.categoryKey ?? habit.taxonomy?.categoryKey;
        const canonicalHabitKey = latestCheckIn?.canonicalHabitKey ?? habit.taxonomy?.canonicalHabitKey;
        const subcategoryKey = habit.taxonomy?.subcategoryKey;

        addToMap(categoryScores, categoryKey, weight);
        addToMap(subcategoryScores, subcategoryKey, weight);
        addToMap(canonicalScores, canonicalHabitKey, weight);
    }

    return {
        categoryScores: normalizeScoreMap(categoryScores),
        subcategoryScores: normalizeScoreMap(subcategoryScores),
        canonicalScores: normalizeScoreMap(canonicalScores),
    };
}

export function scoreChallenge(challenge, profile) {
    const taxonomy = challenge.taxonomy;

    if (!taxonomy?.canonicalHabitKey) {
        return 0;
    }

    return (
        CANONICAL_WEIGHT * getMapValue(profile.canonicalScores, taxonomy.canonicalHabitKey)
        + SUBCATEGORY_WEIGHT * getMapValue(profile.subcategoryScores, taxonomy.subcategoryKey)
        + CATEGORY_WEIGHT * getMapValue(profile.categoryScores, taxonomy.categoryKey)
    );
}

function formatSubcategoryLabel(subcategoryKey) {
    if (!subcategoryKey) {
        return '';
    }

    return subcategoryKey.replace(/-/g, ' ');
}

export async function loadRecommendationLabels(keys = []) {
    const uniqueKeys = [...new Set(keys.filter(Boolean))];

    if (!uniqueKeys.length) {
        return {
            canonicalLabels: {},
            categoryLabels: {},
            subcategoryLabels: {},
        };
    }

    const [canonicalDocs, categoryDocs] = await Promise.all([
        CanonicalHabit.find({ key: { $in: uniqueKeys } })
            .select('key label categoryKey subcategoryKey categoryLabel')
            .lean(),
        CanonicalHabit.find({ categoryKey: { $in: uniqueKeys } })
            .select('categoryKey categoryLabel subcategoryKey')
            .lean(),
    ]);

    const canonicalLabels = {};
    const categoryLabels = {};
    const subcategoryLabels = {};

    for (const doc of canonicalDocs) {
        canonicalLabels[doc.key] = doc.label;

        if (doc.categoryKey && doc.categoryLabel) {
            categoryLabels[doc.categoryKey] = doc.categoryLabel;
        }

        if (doc.subcategoryKey) {
            subcategoryLabels[doc.subcategoryKey] = formatSubcategoryLabel(doc.subcategoryKey);
        }
    }

    for (const doc of categoryDocs) {
        if (doc.categoryKey && doc.categoryLabel) {
            categoryLabels[doc.categoryKey] = doc.categoryLabel;
        }

        if (doc.subcategoryKey && uniqueKeys.includes(doc.subcategoryKey)) {
            subcategoryLabels[doc.subcategoryKey] = formatSubcategoryLabel(doc.subcategoryKey);
        }
    }

    for (const key of uniqueKeys) {
        if (!subcategoryLabels[key] && !canonicalLabels[key] && !categoryLabels[key]) {
            subcategoryLabels[key] = formatSubcategoryLabel(key);
        }
    }

    return { canonicalLabels, categoryLabels, subcategoryLabels };
}

export function buildRecommendationReason(challenge, profile, labels = {}) {
    const taxonomy = challenge.taxonomy;
    const score = scoreChallenge(challenge, profile);

    if (!taxonomy?.canonicalHabitKey || score <= 0) {
        return null;
    }

    const {
        canonicalLabels = {},
        categoryLabels = {},
        subcategoryLabels = {},
    } = labels;

    const canonicalValue = getMapValue(profile.canonicalScores, taxonomy.canonicalHabitKey);

    if (canonicalValue > 0) {
        const label = canonicalLabels[taxonomy.canonicalHabitKey]
            ?? taxonomy.canonicalHabitKey.replace(/-/g, ' ');
        return `Because you track ${label}`;
    }

    const subcategoryValue = getMapValue(profile.subcategoryScores, taxonomy.subcategoryKey);

    if (subcategoryValue > 0) {
        const label = subcategoryLabels[taxonomy.subcategoryKey]
            ?? taxonomy.subcategoryKey?.replace(/-/g, ' ');
        return `Matches your ${label} habits`;
    }

    const categoryValue = getMapValue(profile.categoryScores, taxonomy.categoryKey);

    if (categoryValue > 0) {
        const label = categoryLabels[taxonomy.categoryKey]
            ?? taxonomy.categoryKey?.replace(/-/g, ' ');
        return `Based on your ${label} habits`;
    }

    return null;
}

function compareTiebreakers(left, right, participantCounts, now = new Date()) {
    const leftParticipants = participantCounts.get(left._id.toString()) ?? 0;
    const rightParticipants = participantCounts.get(right._id.toString()) ?? 0;

    if (leftParticipants !== rightParticipants) {
        return rightParticipants - leftParticipants;
    }

    const leftTimeRemaining = new Date(left.endsAt).getTime() - now.getTime();
    const rightTimeRemaining = new Date(right.endsAt).getTime() - now.getTime();

    if (leftTimeRemaining !== rightTimeRemaining) {
        return rightTimeRemaining - leftTimeRemaining;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function sortChallengeBucket(challenges, profile, participantCounts, now = new Date()) {
    return [...challenges].sort((left, right) => {
        const leftScore = scoreChallenge(left, profile);
        const rightScore = scoreChallenge(right, profile);

        if (leftScore !== rightScore) {
            return rightScore - leftScore;
        }

        return compareTiebreakers(left, right, participantCounts, now);
    });
}

export function sortChallengesByRecommendation(
    challenges,
    profile,
    participantCounts,
    viewerParticipations,
    now = new Date(),
) {
    const unjoined = [];
    const joined = [];

    for (const challenge of challenges) {
        const participation = viewerParticipations.get(challenge._id.toString());

        if (participation && participation.status !== 'left') {
            joined.push(challenge);
        } else {
            unjoined.push(challenge);
        }
    }

    return [
        ...sortChallengeBucket(unjoined, profile, participantCounts, now),
        ...sortChallengeBucket(joined, profile, participantCounts, now),
    ];
}

export function resolveDefaultChallengeSort(filters = {}) {
    if (filters.sort) {
        return filters.sort;
    }

    if (filters.scope === 'active') {
        return 'endsAt';
    }

    if (filters.scope === 'public' || filters.scope === 'friends') {
        return 'recommended';
    }

    return 'createdAt';
}
