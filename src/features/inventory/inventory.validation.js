import mongoose from 'mongoose';

const CUSTOMIZATION_COLOR_FIELDS = [
    'color',
    'stringColor',
    'textColor',
    'buttonColor',
    'pocketColor',
    'jacketColor',
    'shirtColor',
    'tieColor',
    'tieStripeColor',
];
const MAX_CUSTOM_TEXT_LENGTH = 20;

function sanitizeCustomization(customization = {}) {
    if (!customization || typeof customization !== 'object' || Array.isArray(customization)) {
        return {};
    }

    const sanitizedCustomization = {};

    CUSTOMIZATION_COLOR_FIELDS.forEach((field) => {
        const value = customization[field];

        if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.trim())) {
            sanitizedCustomization[field] = value.trim().toUpperCase();
        }
    });

    if (typeof customization.text === 'string') {
        const text = customization.text
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .trim()
            .slice(0, MAX_CUSTOM_TEXT_LENGTH)
            .toUpperCase();

        if (text) {
            sanitizedCustomization.text = text;
        }
    }

    return sanitizedCustomization;
}

export function validateBuyItemInput(body = {}) {
    if (!mongoose.Types.ObjectId.isValid(body.itemId)) {
        return { error: 'itemId must be a valid ObjectId' };
    }

    return {
        value: {
            itemId: body.itemId,
            customization: sanitizeCustomization(body.customization),
        },
    };
}

export function validateUserItemId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return { error: 'userItemId must be a valid ObjectId' };
    }

    return { value: id };
}

export function validateSaveOutfitInput(body = {}) {
    if (!Array.isArray(body.equippedUserItemIds)) {
        return { error: 'equippedUserItemIds must be an array' };
    }

    const uniqueUserItemIds = [...new Set(body.equippedUserItemIds)];
    const invalidId = uniqueUserItemIds.find((userItemId) => !mongoose.Types.ObjectId.isValid(userItemId));

    if (invalidId) {
        return { error: 'equippedUserItemIds must contain only valid ObjectIds' };
    }

    return { value: { equippedUserItemIds: uniqueUserItemIds } };
}
