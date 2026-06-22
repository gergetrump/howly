export const MAX_CUSTOM_TEXT_LENGTH = 20;

export const ITEM_CUSTOMIZATION_CONFIG = {
    hoodie: {
        defaults: {
            color: '#C66E6E',
            stringColor: '#DADADA',
            textColor: '#FFFFFF',
            text: 'HOWLY',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'stringColor', label: 'Strings' },
            { key: 'textColor', label: 'Text' },
        ],
        text: {
            key: 'text',
            label: 'Hoodie text',
            placeholder: 'HOWLY',
        },
    },
    'cream-top': {
        defaults: {
            color: '#F4EFE5',
            buttonColor: '#B18167',
            pocketColor: '#DDCEAF',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'buttonColor', label: 'Buttons' },
            { key: 'pocketColor', label: 'Pockets' },
        ],
    },
    'warm-top': {
        defaults: {
            color: '#F4EFE5',
            buttonColor: '#B18167',
            pocketColor: '#DDCEAF',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'buttonColor', label: 'Buttons' },
            { key: 'pocketColor', label: 'Pockets' },
        ],
    },
    'cozy-jacket': {
        defaults: {
            jacketColor: '#4A6741',
            stringColor: '#DADADA',
            shirtColor: '#F4EFE5',
        },
        colorSlots: [
            { key: 'jacketColor', label: 'Jacket' },
            { key: 'stringColor', label: 'Strings' },
            { key: 'shirtColor', label: 'Shirt' },
        ],
    },
    suit: {
        defaults: {
            jacketColor: '#392E18',
            shirtColor: '#EEEEEE',
            tieColor: '#670000',
            tieStripeColor: '#FFC000',
        },
        colorSlots: [
            { key: 'jacketColor', label: 'Jacket' },
            { key: 'shirtColor', label: 'Shirt' },
            { key: 'tieColor', label: 'Tie' },
            { key: 'tieStripeColor', label: 'Tie stripe' },
        ],
    },
    cup: {
        defaults: {
            color: '#E09AAB',
            side: 'right',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
        ],
    },
    glasses: {
        defaults: {
            color: '#000000',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
        ],
    },
    phone: {
        defaults: {
            frameColor: '#D9D9D9',
            backgroundColor: '#575757',
            side: 'right',
        },
        colorSlots: [
            { key: 'frameColor', label: 'Frame' },
            { key: 'backgroundColor', label: 'Background' },
        ],
    },
    'warm-hat': {
        defaults: {
            color: '#4A6741',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
        ],
    },
    sneaker: {
        defaults: {
            color: '#1A1A1A',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
        ],
    },
};

export function normalizeHexInput(value) {
    const trimmedValue = value.trim();
    const hexValue = trimmedValue.startsWith('#') ? trimmedValue : `#${trimmedValue}`;

    return /^#[0-9A-Fa-f]{6}$/.test(hexValue) ? hexValue.toUpperCase() : null;
}

export function getCustomizationConfig(assetKey) {
    return ITEM_CUSTOMIZATION_CONFIG[assetKey] ?? null;
}

export function normalizeItemCustomization(itemOrAssetKey, customization = {}) {
    const assetKey = typeof itemOrAssetKey === 'string' ? itemOrAssetKey : itemOrAssetKey?.assetKey;
    const config = getCustomizationConfig(assetKey);

    if (!config) {
        return {};
    }

    return {
        ...config.defaults,
        ...customization,
    };
}

export function getItemOwnershipSignature(item, customization = {}) {
    const itemId = item?._id?.toString?.() ?? item?._id;

    if (!itemId) {
        return '';
    }

    const config = getCustomizationConfig(item.assetKey);

    if (!config) {
        return `${itemId}:default`;
    }

    const normalizedCustomization = normalizeItemCustomization(item, customization);
    const signatureParts = Object.keys(config.defaults).map((key) => normalizedCustomization[key]);

    return [itemId, ...signatureParts].join(':');
}

export function getInventoryEntryOwnershipSignature(entry) {
    return getItemOwnershipSignature(entry.item, entry.customization ?? {});
}
