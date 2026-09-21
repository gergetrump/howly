import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.resolve(__dirname, '../../../data/habit-taxonomy.seed.json');

let cachedCategories = null;
let cachedCategoryKeySet = null;

function loadSeedCategories() {
    if (cachedCategories) {
        return cachedCategories;
    }

    const raw = readFileSync(SEED_PATH, 'utf8');
    const seed = JSON.parse(raw);

    cachedCategories = (seed.categories ?? [])
        .filter((category) => category.status === 'active')
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(({ key, label, sortOrder }) => ({ key, label, sortOrder }));

    cachedCategoryKeySet = new Set(cachedCategories.map((category) => category.key));

    return cachedCategories;
}

export function getTaxonomyCategories() {
    return loadSeedCategories();
}

export function getTaxonomyCategoryKeySet() {
    loadSeedCategories();
    return cachedCategoryKeySet;
}

export function isValidTaxonomyCategoryKey(categoryKey) {
    return getTaxonomyCategoryKeySet().has(categoryKey);
}
