import config from '../../../config.js';
import { generateEmbedding } from '../../ai/ai.service.js';
import CanonicalHabit from './canonicalHabit.model.js';
import Habit from '../habits/habit.model.js';
import Challenge from '../challenges/challenge.model.js';

let cachedStore = null;

export function buildEmbedText({ title, description }) {
    return [title, description].filter(Boolean).join('. ').trim();
}

export function buildCanonicalEmbedText({ label, description, aliases = [] }) {
    const aliasText = aliases.filter(Boolean).join(', ');
    return [label, description, aliasText].filter(Boolean).join('. ').trim();
}

export function cosineSimilarity(a, b) {
    if (!a?.length || !b?.length || a.length !== b.length) {
        return 0;
    }

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i += 1) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    if (magA === 0 || magB === 0) {
        return 0;
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function resetCanonicalStoreCache() {
    cachedStore = null;
}

export function setCanonicalStoreForTests(store) {
    cachedStore = store;
}

export async function loadCanonicalStore() {
    if (cachedStore) {
        return cachedStore;
    }

    const docs = await CanonicalHabit.find({
        status: 'active',
        embedding: { $exists: true, $ne: [] },
    }).lean();

    cachedStore = docs;
    return cachedStore;
}

export function findNearestCanonical(queryVector, store, minScore = config.taxonomy?.minScore ?? 0.50) {
    let best = null;

    for (const canonical of store) {
        const score = cosineSimilarity(queryVector, canonical.embedding);
        if (!best || score > best.score) {
            best = { canonical, score };
        }
    }

    if (!best || best.score < minScore) {
        return null;
    }

    return {
        categoryKey: best.canonical.categoryKey,
        subcategoryKey: best.canonical.subcategoryKey,
        canonicalHabitKey: best.canonical.key,
        categoryLabel: best.canonical.categoryLabel,
        score: best.score,
        assignedAt: new Date(),
    };
}

export async function assignTaxonomy(text) {
    const embedText = text?.trim();
    if (!embedText) {
        return null;
    }

    const store = await loadCanonicalStore();
    if (!store.length) {
        return null;
    }

    const queryVector = await generateEmbedding(embedText);
    return findNearestCanonical(queryVector, store);
}

function applyAssignment(target, assignment) {
    if (!assignment) {
        target.taxonomy = {
            categoryKey: null,
            subcategoryKey: null,
            canonicalHabitKey: null,
            score: null,
            assignedAt: null,
        };
        target.category = null;
        return;
    }

    target.taxonomy = {
        categoryKey: assignment.categoryKey,
        subcategoryKey: assignment.subcategoryKey,
        canonicalHabitKey: assignment.canonicalHabitKey,
        score: assignment.score,
        assignedAt: assignment.assignedAt,
    };
    target.category = assignment.categoryLabel;
}

export async function applyTaxonomyToHabit(habitDoc) {
    const assignment = await assignTaxonomy(buildEmbedText({
        title: habitDoc.title,
        description: habitDoc.description,
    }));
    applyAssignment(habitDoc, assignment);
    return habitDoc;
}

export async function applyCanonicalTaxonomyToHabit(habitDoc, canonicalHabitKey) {
    const canonical = await CanonicalHabit.findOne({
        key: canonicalHabitKey,
        status: 'active',
    }).lean();

    if (!canonical) {
        return false;
    }

    applyAssignment(habitDoc, {
        categoryKey: canonical.categoryKey,
        subcategoryKey: canonical.subcategoryKey,
        canonicalHabitKey: canonical.key,
        categoryLabel: canonical.categoryLabel,
        score: 1,
        assignedAt: new Date(),
    });
    await habitDoc.save();
    return true;
}

export async function applyTaxonomyToChallenge(challengeDoc) {
    const assignment = await assignTaxonomy(buildEmbedText({
        title: challengeDoc.habitTemplate?.title ?? challengeDoc.habitTitle,
        description: [
            challengeDoc.title,
            challengeDoc.description,
            challengeDoc.habitTemplate?.description,
        ].filter(Boolean).join('. '),
    }));

    applyAssignment(challengeDoc, assignment);

    if (assignment?.categoryLabel && challengeDoc.habitTemplate) {
        challengeDoc.habitTemplate.category = assignment.categoryLabel;
    } else if (challengeDoc.habitTemplate) {
        challengeDoc.habitTemplate.category = null;
    }

    return challengeDoc;
}

export function copyTaxonomyToHabit(habitDoc, sourceDoc) {
    if (!sourceDoc?.taxonomy?.canonicalHabitKey) {
        return habitDoc;
    }

    habitDoc.taxonomy = {
        categoryKey: sourceDoc.taxonomy.categoryKey,
        subcategoryKey: sourceDoc.taxonomy.subcategoryKey,
        canonicalHabitKey: sourceDoc.taxonomy.canonicalHabitKey,
        score: sourceDoc.taxonomy.score,
        assignedAt: sourceDoc.taxonomy.assignedAt,
    };
    habitDoc.category = sourceDoc.category ?? sourceDoc.habitTemplate?.category ?? null;
    return habitDoc;
}

export async function tryApplyTaxonomy(fn) {
    try {
        await fn();
    } catch (err) {
        console.error('Taxonomy assignment failed:', err.message);
    }
}

export function clearTaxonomyFields(doc) {
    doc.taxonomy = {
        categoryKey: null,
        subcategoryKey: null,
        canonicalHabitKey: null,
        score: null,
        assignedAt: null,
    };
    doc.category = null;
}

async function runHabitTaxonomyAssignment(habitId) {
    try {
        const habit = await Habit.findById(habitId);
        if (!habit) {
            return;
        }
        await applyTaxonomyToHabit(habit);
        await habit.save();
    } catch (err) {
        console.error(`Taxonomy assignment failed for habit ${habitId}:`, err.message);
    }
}

async function runChallengeTaxonomyAssignment(challengeId) {
    try {
        const challenge = await Challenge.findById(challengeId);
        if (!challenge) {
            return;
        }
        await applyTaxonomyToChallenge(challenge);
        await challenge.save();
    } catch (err) {
        console.error(`Taxonomy assignment failed for challenge ${challengeId}:`, err.message);
    }
}

/** Fire-and-forget taxonomy assignment for a habit (does not block the API response). */
export function scheduleTaxonomyForHabit(habitId) {
    void runHabitTaxonomyAssignment(habitId);
}

/** Fire-and-forget taxonomy assignment for a challenge (does not block the API response). */
export function scheduleTaxonomyForChallenge(challengeId) {
    void runChallengeTaxonomyAssignment(challengeId);
}
