import mongoose from 'mongoose';

const { Schema } = mongoose;

export const taxonomySchema = new Schema(
    {
        categoryKey: { type: String, default: null },
        subcategoryKey: { type: String, default: null },
        canonicalHabitKey: { type: String, default: null },
        score: { type: Number, default: null },
        assignedAt: { type: Date, default: null },
    },
    { _id: false },
);

export function toTaxonomyDto(taxonomy) {
    if (!taxonomy?.canonicalHabitKey) {
        return null;
    }

    return {
        categoryKey: taxonomy.categoryKey ?? null,
        subcategoryKey: taxonomy.subcategoryKey ?? null,
        canonicalHabitKey: taxonomy.canonicalHabitKey,
        score: taxonomy.score ?? null,
        assignedAt: taxonomy.assignedAt?.toISOString?.() ?? taxonomy.assignedAt ?? null,
    };
}
