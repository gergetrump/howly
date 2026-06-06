import mongoose from 'mongoose';
import { ITEM_TYPES } from './item.model.js';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const itemTypes = new Set(ITEM_TYPES);

export function validateCreateItemInput(body = {}) {
    const errors = [];
    const name = isNonEmptyString(body.name) ? body.name.trim() : '';
    const type = isNonEmptyString(body.type) ? body.type.trim() : '';
    const assetKey = isNonEmptyString(body.assetKey) ? body.assetKey.trim() : '';
    const description = isNonEmptyString(body.description) ? body.description.trim() : undefined;
    const premiumOnly = typeof body.premiumOnly === 'boolean' ? body.premiumOnly : false;
    const price = Number(body.price);

    if (!name) {
        errors.push('name is required');
    } else if (name.length > 60) {
        errors.push('name must be 60 characters or less');
    }

    if (!itemTypes.has(type)) {
        errors.push(`type must be one of: ${ITEM_TYPES.join(', ')}`);
    }

    if (!Number.isFinite(price) || price < 0) {
        errors.push('price must be a non-negative number');
    }

    if (!assetKey) {
        errors.push('assetKey is required');
    } else if (assetKey.length > 80) {
        errors.push('assetKey must be 80 characters or less');
    }

    if (description && description.length > 240) {
        errors.push('description must be 240 characters or less');
    }

    if (errors.length) {
        return { error: errors.join(', ') };
    }

    return {
        value: {
            name,
            type,
            price,
            assetKey,
            premiumOnly,
            ...(description ? { description } : {}),
        },
    };
}

export function validateListItemsInput(query = {}) {
    const value = {};
    const errors = [];

    if (query.type !== undefined) {
        const type = isNonEmptyString(query.type) ? query.type.trim() : '';

        if (!itemTypes.has(type)) {
            errors.push(`type must be one of: ${ITEM_TYPES.join(', ')}`);
        } else {
            value.type = type;
        }
    }

    if (query.premiumOnly !== undefined) {
        if (query.premiumOnly !== 'true' && query.premiumOnly !== 'false') {
            errors.push('premiumOnly must be true or false');
        } else {
            value.premiumOnly = query.premiumOnly === 'true';
        }
    }

    if (errors.length) {
        return { error: errors.join(', ') };
    }

    return { value };
}

export function validateItemId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return { error: 'itemId must be a valid ObjectId' };
    }

    return { value: id };
}
