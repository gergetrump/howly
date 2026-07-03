import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildCanonicalEmbedText,
    buildEmbedText,
    cosineSimilarity,
    findNearestCanonical,
} from '../src/features/taxonomy/taxonomy.service.js';

const SAMPLE_STORE = [
    {
        key: 'run',
        categoryKey: 'movement',
        subcategoryKey: 'cardio',
        categoryLabel: 'Movement',
        embedding: [1, 0, 0],
    },
    {
        key: 'read',
        categoryKey: 'learning',
        subcategoryKey: 'reading',
        categoryLabel: 'Learning',
        embedding: [0, 1, 0],
    },
];

test('cosineSimilarity returns 1 for identical vectors', () => {
    const vector = [1, 2, 3];
    assert.equal(cosineSimilarity(vector, vector), 1);
});

test('cosineSimilarity returns 0 for orthogonal vectors', () => {
    assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test('buildEmbedText joins title and description', () => {
    assert.equal(
        buildEmbedText({ title: 'Morning Run', description: 'Before breakfast' }),
        'Morning Run. Before breakfast',
    );
});

test('buildCanonicalEmbedText includes aliases', () => {
    const text = buildCanonicalEmbedText({
        label: 'Run',
        description: 'Go running',
        aliases: ['jog', 'morning run'],
    });
    assert.match(text, /Run/);
    assert.match(text, /jog/);
});

test('findNearestCanonical picks nearest canonical habit', () => {
    const result = findNearestCanonical([0.99, 0.01, 0], SAMPLE_STORE, 0.50);
    assert.equal(result.canonicalHabitKey, 'run');
    assert.equal(result.categoryKey, 'movement');
    assert.equal(result.categoryLabel, 'Movement');
    assert.ok(result.score >= 0.50);
});

test('findNearestCanonical rejects low-confidence matches', () => {
    const result = findNearestCanonical([0, 1, 0], [
        {
            key: 'run',
            categoryKey: 'movement',
            subcategoryKey: 'cardio',
            categoryLabel: 'Movement',
            embedding: [1, 0, 0],
        },
    ], 0.50);
    assert.equal(result, null);
});
