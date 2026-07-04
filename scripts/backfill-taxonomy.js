import connectDB from '../src/config/database.js';
import mongoose from 'mongoose';
import Habit from '../src/features/habits/habit.model.js';
import Challenge from '../src/features/challenges/challenge.model.js';
import {
    applyTaxonomyToChallenge,
    applyTaxonomyToHabit,
    loadCanonicalStore,
    tryApplyTaxonomy,
} from '../src/features/taxonomy/taxonomy.service.js';

async function backfillTaxonomy() {
    await connectDB();

    const store = await loadCanonicalStore();
    if (!store.length) {
        throw new Error('No canonical habits with embeddings found. Run npm run seed:taxonomy first.');
    }

    const habits = await Habit.find({
        $or: [
            { 'taxonomy.canonicalHabitKey': { $exists: false } },
            { 'taxonomy.canonicalHabitKey': null },
        ],
    });

    for (const habit of habits) {
        await tryApplyTaxonomy(async () => {
            await applyTaxonomyToHabit(habit);
            await Habit.updateOne(
                { _id: habit._id },
                { $set: { taxonomy: habit.taxonomy, category: habit.category } },
            );
        });
        console.log(`Backfilled habit ${habit._id} (${habit.title}) -> ${habit.taxonomy?.canonicalHabitKey ?? 'none'}${habit.taxonomy?.score ? ` (${habit.taxonomy.score.toFixed(2)})` : ''}`);
    }

    const challenges = await Challenge.find({
        $or: [
            { 'taxonomy.canonicalHabitKey': { $exists: false } },
            { 'taxonomy.canonicalHabitKey': null },
        ],
    });

    for (const challenge of challenges) {
        await tryApplyTaxonomy(async () => {
            await applyTaxonomyToChallenge(challenge);
            await Challenge.updateOne(
                { _id: challenge._id },
                {
                    $set: {
                        taxonomy: challenge.taxonomy,
                        'habitTemplate.category': challenge.habitTemplate?.category ?? null,
                    },
                },
            );
        });
        console.log(`Backfilled challenge ${challenge._id} -> ${challenge.taxonomy?.canonicalHabitKey ?? 'none'}${challenge.taxonomy?.score ? ` (${challenge.taxonomy.score.toFixed(2)})` : ''}`);
    }

    console.log(`Done. Backfilled ${habits.length} habits and ${challenges.length} challenges.`);
}

backfillTaxonomy()
    .catch((err) => {
        console.error('Backfill failed:', err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
