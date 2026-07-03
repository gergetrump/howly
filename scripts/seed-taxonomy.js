import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import connectDB from '../src/config/database.js';
import mongoose from 'mongoose';
import CanonicalHabit from '../src/features/taxonomy/canonicalHabit.model.js';
import {
    buildCanonicalEmbedText,
    resetCanonicalStoreCache,
} from '../src/features/taxonomy/taxonomy.service.js';
import { generateEmbedding } from '../src/ai/ai.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.resolve(__dirname, '../../agents-knowledge-base/habit-taxonomy.seed.json');

function buildCategoryLabelMap(categories = []) {
    return Object.fromEntries(
        categories.map((category) => [category.key, category.label]),
    );
}

async function loadSeed() {
    const raw = await readFile(SEED_PATH, 'utf8');
    return JSON.parse(raw);
}

async function seedTaxonomy() {
    await connectDB();
    const seed = await loadSeed();
    const categoryLabels = buildCategoryLabelMap(seed.categories);

    let upserted = 0;

    for (const entry of seed.canonicalHabits ?? []) {
        if (entry.status && entry.status !== 'active') {
            continue;
        }

        const categoryLabel = categoryLabels[entry.categoryKey];
        if (!categoryLabel) {
            console.warn(`Skipping ${entry.key}: unknown categoryKey "${entry.categoryKey}"`);
            continue;
        }

        const embedText = buildCanonicalEmbedText(entry);
        const embedding = await generateEmbedding(embedText);

        await CanonicalHabit.findOneAndUpdate(
            { key: entry.key },
            {
                key: entry.key,
                label: entry.label,
                categoryKey: entry.categoryKey,
                subcategoryKey: entry.subcategoryKey,
                categoryLabel,
                description: entry.description ?? '',
                aliases: entry.aliases ?? [],
                status: entry.status ?? 'active',
                embedding,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        upserted += 1;
        console.log(`Seeded ${entry.key} (${upserted}/${seed.canonicalHabits.length})`);
    }

    resetCanonicalStoreCache();
    console.log(`Done. Upserted ${upserted} canonical habits.`);
}

seedTaxonomy()
    .catch((err) => {
        console.error('Seed failed:', err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
