import mongoose from 'mongoose';

const CUSTOMIZATION_COLOR_FIELDS = [
    'color',
    'stringColor',
    'textColor',
    'buttonColor',
    'pocketColor',
    'jacketColor',
    'cordColor',
    'shirtColor',
    'tieColor',
    'tieStripeColor',
    'frameColor',
    'backgroundColor',
    'symbolColor',
    'flowerSet1Color',
    'flowerSet2Color',
    'furColor',
    'holderColor',
    'tapeColor',
    'strawColor',
    'strapColor',
    'lockColor',
    'flapClosureColor',
    'chainColor',
    'lacesColor',
    'stripeColor',
    'pompomColor',
    'pompom1Color',
    'pompom2Color',
    'line',
    'jacket',
];
const MAX_CUSTOM_TEXT_LENGTH = 20;
const ITEM_SIDES = new Set(['left', 'right']);
const ITEM_SYMBOLS = new Set(['bubble', 'diamond', 'eclipse', 'flower', 'heart', 'moon', '']);

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

    if (typeof customization.side === 'string') {
        const side = customization.side.trim().toLowerCase();

        if (ITEM_SIDES.has(side)) {
            sanitizedCustomization.side = side;
        }
    }

    if (typeof customization.symbol === 'string') {
        const symbol = customization.symbol.trim().toLowerCase();

        if (ITEM_SYMBOLS.has(symbol)) {
            sanitizedCustomization.symbol = symbol;
        }
    }

    return sanitizedCustomization;
}

function sanitizeOutfitCustomization(customization = {}) {
    if (!customization || typeof customization !== 'object' || Array.isArray(customization)) {
        return {};
    }

    const sanitizedCustomization = {};

    if (typeof customization.side === 'string') {
        const side = customization.side.trim().toLowerCase();

        if (ITEM_SIDES.has(side)) {
            sanitizedCustomization.side = side;
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

    const customizationUpdates = body.customizationUpdates && typeof body.customizationUpdates === 'object' && !Array.isArray(body.customizationUpdates)
        ? body.customizationUpdates
        : {};
    const sanitizedCustomizationUpdates = {};

    Object.entries(customizationUpdates).forEach(([userItemId, customization]) => {
        if (mongoose.Types.ObjectId.isValid(userItemId)) {
            sanitizedCustomizationUpdates[userItemId] = sanitizeOutfitCustomization(customization);
        }
    });

    return {
        value: {
            equippedUserItemIds: uniqueUserItemIds,
            customizationUpdates: sanitizedCustomizationUpdates,
        },
    };
}
