import mongoose from 'mongoose';

const CUSTOMIZATION_COLOR_FIELDS = [
    'color',
    'stringColor',
    'textColor',
    'buttonColor',
    'pocketColor',
    'waveColor',
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
    'accentColor',
    'leafColor',
    'bowlColor',
    'matchaColor',
    'blossomColor',
    'branchColor',
    'coverColor',
    'bookmarkColor',
    'shellColor',
    'starfishColor',
    'pearlColor',
    'bandColor',
    'ribbonColor',
    'topColor',
    'middleColor',
    'bottomColor',
    'borderColor',
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

    // Only allow known HEX color fields. Unknown keys are ignored so the client
    // cannot store arbitrary customization data.
    CUSTOMIZATION_COLOR_FIELDS.forEach((field) => {
        const value = customization[field];

        if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.trim())) {
            sanitizedCustomization[field] = value.trim().toUpperCase();
        }
    });

    if (typeof customization.text === 'string') {
        // Empty text is allowed and saved as an intentional design choice.
        // Unsupported characters are stripped before ownership keys are built.
        const text = customization.text
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .trim()
            .slice(0, MAX_CUSTOM_TEXT_LENGTH)
            .toUpperCase();

        sanitizedCustomization.text = text;
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

    // Saving an outfit can only update placement. Color/text/symbol variants are
    // chosen at purchase time and belong to the owned inventory row.
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

export function validateUseInventoryItemInput(body = {}) {
    if (!mongoose.Types.ObjectId.isValid(body.habitId)) {
        return { error: 'habitId must be a valid ObjectId' };
    }

    return {
        value: {
            habitId: body.habitId,
        },
    };
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

    // Ignore invalid item ids instead of letting them reach the service layer.
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
