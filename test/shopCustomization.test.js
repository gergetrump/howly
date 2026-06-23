import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getItemOwnershipSignature,
    normalizeItemCustomization,
} from '../src/components/shop/shopCustomization.js';

test('cup customization includes symbol in ownership signature', () => {
    const cup = {
        _id: 'cup-item-id',
        assetKey: 'cup',
    };

    assert.notEqual(
        getItemOwnershipSignature(cup, { color: '#E09AAB', symbol: 'eclipse' }),
        getItemOwnershipSignature(cup, { color: '#E09AAB', symbol: 'heart' }),
    );
});

test('cup customization defaults to eclipse symbol', () => {
    assert.equal(normalizeItemCustomization('cup', {}).symbol, 'eclipse');
});
