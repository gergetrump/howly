export const MAX_CUSTOM_TEXT_LENGTH = 20;
const NON_OWNERSHIP_CUSTOMIZATION_KEYS = new Set(['side']);

const wholeColorCustomization = (color) => ({
    defaults: {
        color,
    },
    colorSlots: [
        { key: 'color', label: 'Whole' },
    ],
});

const flowerSymbolToggle = {
    key: 'symbol',
    label: 'Flower',
    options: [
        { value: 'flower', label: 'Flower', defaultColor: '#F6BBC7' },
    ],
};

const bubbleSymbolToggle = {
    key: 'symbol',
    label: 'Bubble',
    options: [
        { value: 'bubble', label: 'Bubble', defaultColor: '#0F0F0F' },
    ],
};

export const ITEM_CUSTOMIZATION_CONFIG = {
    ballerina: wholeColorCustomization('#F1EBDF'),
    'bambus-flute': wholeColorCustomization('#4A6741'),
    'bambus-shoes': wholeColorCustomization('#E1D3AE'),
    'cute-ballerinas': {
        defaults: {
            color: '#F1EBDF',
            stripeColor: '#B3A6C1',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'stripeColor', label: 'Stripe' },
        ],
    },
    hat: wholeColorCustomization('#4C4C4C'),
    'hogwarts-cape': wholeColorCustomization('#1A1A1A'),
    'hogwarts-scarf': {
        defaults: {
            color: '#822121',
            stripeColor: '#D19B26',
        },
        colorSlots: [
            { key: 'color', label: 'Main Color' },
            { key: 'stripeColor', label: 'Stripe Color' },
        ],
    },
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
    jersie: {
        defaults: {
            color: '#32326F',
            line: '#FFFFFF',
            textColor: '#FFFFFF',
            text: 'HOWLY',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'line', label: 'Lines' },
            { key: 'textColor', label: 'Text' },
        ],
        text: {
            key: 'text',
            label: 'Jersey text',
            placeholder: 'HOWLY',
        },
    },
    'sunset-jersey': {
        defaults: {
            color: '#3A2433',
            line: '#FB923C',
            textColor: '#FFE8B6',
            text: 'HOWLY',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'line', label: 'Lines' },
            { key: 'textColor', label: 'Text' },
        ],
        text: {
            key: 'text',
            label: 'Jersey text',
            placeholder: 'HOWLY',
        },
    },

    'magic-wand': wholeColorCustomization('#D4A373'),
    necklace: {
        defaults: {
            color: '#990000',
            symbol: 'heart',
            symbolColor: '#990000',
        },
        colorSlots: [
            { key: 'color', label: 'Pendant' },
        ],
        symbol: {
            key: 'symbol',
            label: 'Symbol',
            allowEmpty: false,
            colorKey: 'symbolColor',
            selectionColorKey: 'symbolColor',
            options: [
                { value: 'heart', label: 'Heart', defaultColor: '#990000' },
                { value: 'moon', label: 'Moon', defaultColor: '#FACC15' },
                { value: 'diamond', label: 'Diamond', defaultColor: '#90D5FF' },
            ],
        },
    },
    'sakura-outfit': {
        defaults: {
            color: '#FCE8EC',
            cordColor: '#E1D3AE',
            flowerSet1Color: '#F6BBC7',
            flowerSet2Color: '#FFFFFF',
            symbol: 'flower',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'cordColor', label: 'Cord' },
            { key: 'flowerSet1Color', label: 'Flower Set 1' },
            { key: 'flowerSet2Color', label: 'Flower Set 2' },
        ],
        symbol: flowerSymbolToggle,
    },
    scar: {
        defaults: {
            color: '#555353',
            side: 'right',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
        ],
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
    'bubble-tea': {
        defaults: {
            color: '#DDCEAF',
            strawColor: '#F4EFE5',
            symbol: 'bubble',
        },
        colorSlots: [
            { key: 'color', label: 'Drink' },
            { key: 'strawColor', label: 'Straw' }
        ],
        symbol: bubbleSymbolToggle,
    },
    'drink-togo': {
        defaults: {
            color: '#F6F3EB',
            holderColor: '#DDCEAF'
        },
        colorSlots: [
            { key: 'color', label: 'Cup' },
            { key: 'holderColor', label: 'Holder' }
        ],
    },
    'bag': {
        defaults: {
            color: '#F4EFE5',
            strapColor: '#DDCEAF',
            lockColor: '#CEB88B',
            flapClosureColor: '#D7C6A2'
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'strapColor', label: 'Strap' },
            { key: 'lockColor', label: 'Lock' },
            { key: 'flapClosureColor', label: 'Closure' }
        ],
    },
    'cute-hat': {
        defaults: {
            color: '#F1EBDF',
            stripeColor: '#B3A6C1',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'stripeColor', label: 'Stripe' },
        ],
    },
    'hat-with-pompom': {
        defaults: {
            color: '#32326F',
            pompomColor: '#32326F',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'pompomColor', label: 'Pompom' },
        ],
    },
    'sakura-neckclace': {
        defaults: {
            color: '#F6BBC7',
            chainColor: '#CEB88B',
        },
        colorSlots: [
            { key: 'color', label: 'Pendant' },
            { key: 'chainColor', label: 'Chain' },
        ],
    },
    'sakura-pouch': {
        defaults: {
            color: '#FCE8EC',
            holderColor: '#E1D3AE',
            tapeColor: '#E1D3AE',
            flowerSet1Color: '#F6BBC7',
            flowerSet2Color: '#FFFFFF',
            symbol: 'flower',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'holderColor', label: 'Holder' },
            { key: 'tapeColor', label: 'Tape' },
            { key: 'flowerSet1Color', label: 'Flower Set 1' },
            { key: 'flowerSet2Color', label: 'Flower Set 2' },
        ],
        symbol: flowerSymbolToggle,
    },
    'blossom-crown': {
        defaults: {
            color: '#FFE1EB',
            accentColor: '#FFF5F9',
            leafColor: '#A8C48A',
        },
        colorSlots: [
            { key: 'color', label: 'Blossoms' },
            { key: 'accentColor', label: 'Center bloom' },
            { key: 'leafColor', label: 'Band' },
        ],
    },

    balloon: wholeColorCustomization('#EF5A6F'),
    'matcha-bowl': {
        defaults: {
            bowlColor: '#E3D6C0',
            matchaColor: '#7CAD3E',
        },
        colorSlots: [
            { key: 'bowlColor', label: 'Bowl' },
            { key: 'matchaColor', label: 'Matcha' },
        ],
    },
    'sakura-branch': {
        defaults: {
            blossomColor: '#F6BBC7',
            branchColor: '#7A5A3E',
        },
        colorSlots: [
            { key: 'blossomColor', label: 'Blossoms' },
            { key: 'branchColor', label: 'Branch' },
        ],
    },
    eyepatch: {
        defaults: {
            color: '#26262B',
            side: 'right',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
        ],
    },
    book: {
        defaults: {
            coverColor: '#7D3A4A',
            bookmarkColor: '#E0B13A',
        },
        colorSlots: [
            { key: 'coverColor', label: 'Cover' },
            { key: 'bookmarkColor', label: 'Bookmark' },
        ],
    },

    'shell-crown': {
        defaults: {
            shellColor: '#F6CDBA',
            starfishColor: '#E8895A',
            pearlColor: '#FBF4EC',
            bandColor: '#7FB8AE',
        },
        colorSlots: [
            { key: 'shellColor', label: 'Shells' },
            { key: 'starfishColor', label: 'Starfish' },
            { key: 'pearlColor', label: 'Pearls' },
            { key: 'bandColor', label: 'Band' },
        ],
    },

    'straw-hat': {
        defaults: {
            strawColor: '#E8C88A',
            ribbonColor: '#E6947A',
        },
        colorSlots: [
            { key: 'strawColor', label: 'Straw' },
            { key: 'ribbonColor', label: 'Ribbon' },
        ],
    },

    'dango-skewer': {
        defaults: {
            topColor: '#F6BBC7',
            middleColor: '#FFFDF5',
            bottomColor: '#BFE0B2',
        },
        colorSlots: [
            { key: 'topColor', label: 'Top' },
            { key: 'middleColor', label: 'Middle' },
            { key: 'bottomColor', label: 'Bottom' },
        ],
    },

    'sensu-fan': {
        defaults: {
            color: '#F6BBC7',
            borderColor: '#FFF0F6',
            blossomColor: '#FFF5F9',
        },
        colorSlots: [
            { key: 'color', label: 'Fan' },
            { key: 'borderColor', label: 'Border' },
            { key: 'blossomColor', label: 'Blossoms' },
        ],
    },

    hairpin: {
        defaults: {
            color: '#FCE8EC',
            holderColor: '#EFE7D3',
        },
        colorSlots: [
            { key: 'color', label: 'Pendant' },
            { key: 'holderColor', label: 'Holder' },
        ],
    },

    dress: {
        defaults: {
            color: '#F2E6FF',
            lacesColor: '#F1EBDF',
            flowerSet1Color: '#DDCEAF',
            flowerSet2Color: '#FFFFFF',
            buttonColor: '#D9CAAA',
            symbol: 'flower',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'lacesColor', label: 'Laces' },
            { key: 'flowerSet1Color', label: 'Flower Set 1' },
            { key: 'flowerSet2Color', label: 'Flower Set 2' },
            {key: 'buttonColor', label: 'Buttons' },
        ],
        symbol: flowerSymbolToggle,
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
    'ocean-top': {
        defaults: {
            color: '#123A4A',
            waveColor: '#38BDF8',
            pocketColor: '#2DD4BF',
            buttonColor: '#DDF7FF',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'waveColor', label: 'Waves' },
            { key: 'pocketColor', label: 'Pockets' },
            { key: 'buttonColor', label: 'Buttons' },
        ],
    },
    summertop: {
        defaults: {
            shirtColor: '#FFFFFF',
            jacket: '#4B6942',
            stripeColor: '#FFFFFF',
        },
        colorSlots: [
            { key: 'shirtColor', label: 'Shirt' },
            { key: 'jacket', label: 'Jacket' },
            { key: 'stripeColor', label: 'Stripe' },
        ],
    },


    'warm-boots': wholeColorCustomization('#392E18'),
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
            symbol: 'eclipse',
            symbolColor: '#FFFF00',
            side: 'right',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
        ],
        symbol: {
            key: 'symbol',
            colorKey: 'symbolColor',
            label: 'Symbol',
            selectionColorKey: 'symbolColor',
            options: [
                { value: 'eclipse', label: 'Eclipse', defaultColor: '#FFFF00' },
                { value: 'heart', label: 'Heart', defaultColor: '#990000' },
                { value: 'flower', label: 'Flower', defaultColor: '#F6BBC7' },
            ],
        },
    },
    glasses: {
        defaults: {
            color: '#000000',
        },
        colorSlots: [
            { key: 'color', label: 'Frame' },
        ],
    },
    nerdglasses: {
        defaults: {
            color: '#4C4C4C',
        },
        colorSlots: [
            { key: 'color', label: 'Frame' },
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
    'warm-hat-2-pompom': {
    defaults: {
        color: '#392E18',
        pompom1Color: '#392E18',
        pompom2Color: '#392E18',
    },
    colorSlots: [
        { key: 'color', label: 'Whole' },
        { key: 'pompom1Color', label: 'Pompom 1' },
        { key: 'pompom2Color', label: 'Pompom 2' },
    ],
},
    'winter-jacket': {
        defaults: {
            jacketColor: '#392E18',
            shirtColor: '#394F32',
            furColor: '#E1D3AE',
        },
        colorSlots: [
            { key: 'jacketColor', label: 'Jacket' },
            { key: 'shirtColor', label: 'Shirt' },
            { key: 'furColor', label: 'Fur' },
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

    const normalizedCustomization = {
        ...config.defaults,
        ...customization,
    };

    return normalizedCustomization;
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
    const signatureParts = Object.keys(config.defaults)
        .filter((key) => !NON_OWNERSHIP_CUSTOMIZATION_KEYS.has(key))
        .map((key) => normalizedCustomization[key]);

    return [itemId, ...signatureParts].join(':');
}

export function getInventoryEntryOwnershipSignature(entry) {
    return getItemOwnershipSignature(entry.item, entry.customization ?? {});
}
