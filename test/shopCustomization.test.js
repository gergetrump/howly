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

test('cup customization can store no symbol', () => {
    const cup = {
        _id: 'cup-item-id',
        assetKey: 'cup',
    };

    const noSymbolCustomization = normalizeItemCustomization('cup', { symbol: '' });

    assert.equal(noSymbolCustomization.symbol, '');
    assert.notEqual(
        getItemOwnershipSignature(cup, { color: '#E09AAB', symbol: '' }),
        getItemOwnershipSignature(cup, { color: '#E09AAB', symbol: 'eclipse' }),
    );
});
