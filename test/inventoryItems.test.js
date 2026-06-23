import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getEquippedItemConfigsFromInventory,
    itemMatchesCategory,
} from '../src/lib/inventoryItems.js';

test('frontend clothing category includes clothing and shoes only', () => {
    assert.equal(itemMatchesCategory({ type: 'clothing' }, 'clothing'), true);
    assert.equal(itemMatchesCategory({ type: 'shoes' }, 'clothing'), true);
    assert.equal(itemMatchesCategory({ type: 'accessory' }, 'clothing'), false);
});

test('equipped companion configs keep customization data for dashboard rendering', () => {
    const inventory = [
        {
            equipped: true,
            item: { assetKey: 'hoodie' },
            customization: { color: '#4F772D', text: 'FOREST' },
        },
        {
            equipped: true,
            item: { assetKey: 'glasses' },
            customization: { color: '#111827' },
        },
        {
            equipped: false,
            item: { assetKey: 'cup' },
            customization: { color: '#E09AAB' },
        },
    ];

    assert.deepEqual(getEquippedItemConfigsFromInventory(inventory), [
        {
            assetKey: 'hoodie',
            customization: { color: '#4F772D', text: 'FOREST' },
        },
        {
            assetKey: 'glasses',
            customization: { color: '#111827' },
        },
    ]);
});

test('equipped companion configs keep duplicate asset keys separate', () => {
    const inventory = [
        {
            _id: 'first-cup',
            equipped: true,
            item: { assetKey: 'cup' },
            customization: { color: '#E09AAB', side: 'right' },
        },
        {
            _id: 'second-cup',
            equipped: true,
            item: { assetKey: 'cup' },
            customization: { color: '#C084FC', side: 'left' },
        },
    ];

    assert.deepEqual(getEquippedItemConfigsFromInventory(inventory), [
        {
            renderKey: 'first-cup',
            assetKey: 'cup',
            customization: { color: '#E09AAB', side: 'right' },
        },
        {
            renderKey: 'second-cup',
            assetKey: 'cup',
            customization: { color: '#C084FC', side: 'left' },
        },
    ]);
});
