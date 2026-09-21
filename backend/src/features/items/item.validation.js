import mongoose from 'mongoose';
import { ITEM_TYPES } from './item.model.js';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const itemTypes = new Set(ITEM_TYPES);

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
