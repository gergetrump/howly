import User from '../users/user.model.js';
import Item from '../items/item.model.js';
import UserItem from './inventory.model.js';
import { getPlanForUser } from '../../config/plans.js';

export const INVENTORY_ERROR_CODES = {
    ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
    USER_ITEM_NOT_FOUND: 'USER_ITEM_NOT_FOUND',
    ITEM_ALREADY_OWNED: 'ITEM_ALREADY_OWNED',
    PREMIUM_REQUIRED: 'PREMIUM_REQUIRED',
    NOT_ENOUGH_COINS: 'NOT_ENOUGH_COINS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    OUTFIT_ITEM_NOT_OWNED: 'OUTFIT_ITEM_NOT_OWNED',
    OUTFIT_ITEM_TYPE_CONFLICT: 'OUTFIT_ITEM_TYPE_CONFLICT',
};

const SINGLE_EQUIP_ITEM_TYPES = new Set(['clothing', 'shoes']);
const SINGLE_EQUIP_SLOTS = new Set(['body', 'face', 'head', 'neck']);
const EQUIP_SLOTS_BY_ASSET_KEY = {
    bag: 'body',
    'bambus-flute': 'hand',
    'bubble-tea': 'hand',
    cup: 'hand',
    'cute-hat': 'head',
    'drink-togo': 'hand',
    glasses: 'face',
    hairpin: 'head',
    hat: 'head',
    'hat-with-pompom': 'head',
    'magic-wand': 'hand',
    necklace: 'neck',
    nerdglasses: 'face',
    phone: 'hand',
    'sakura-neckclace': 'neck',
    'sakura-pouch': 'hand',
    'warm-hat': 'head',
    'warm-hat-2-pompom': 'head',
};
const NON_OWNERSHIP_CUSTOMIZATION_FIELDS = new Set(['side']);
const wholeColorCustomization = (color) => ({ color });
const CUSTOMIZABLE_ITEM_DEFAULTS = {
    ballerina: wholeColorCustomization('#F1EBDF'),
    'bambus-flute': wholeColorCustomization('#4A6741'),
    'bambus-shoes': wholeColorCustomization('#E1D3AE'),
    'cute-ballerinas': wholeColorCustomization('#F1EBDF'),
    hairpin: {
        defaults: {
            color: '#FCE8EC',
            holder: '#EFE7D3'

        },
        colorSlots: [
            { key: 'color', label: 'Pendant' },
            { key: 'holderColor', label: 'Holder' },
        ],
    },
    hat: wholeColorCustomization('#4C4C4C'),
    'hogwarts-cape': wholeColorCustomization('#1A1A1A'),
    hoodie: {
        color: '#C66E6E',
        stringColor: '#DADADA',
        textColor: '#FFFFFF',
        text: 'HOWLY',
    },
    jersie: wholeColorCustomization('#32326F'),
    'magic-wand': wholeColorCustomization('#D4A373'),
    necklace: wholeColorCustomization('#990000'),
    'sakura-outfit': wholeColorCustomization('#FCE8EC'),
    scar: {
        color: '#555353',
        side: 'right',
    },
    'cream-top': {
        color: '#F4EFE5',
        buttonColor: '#B18167',
        pocketColor: '#DDCEAF',
    },
    'warm-top': {
        color: '#F4EFE5',
        buttonColor: '#B18167',
        pocketColor: '#DDCEAF',
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
        jacketColor: '#4A6741',
        stringColor: '#DADADA',
        shirtColor: '#F4EFE5',
    },
    'sakura-pouch': {
        defaults: {
            color: '#FCE8EC',
            holderColor: '#E1D3AE',
            tapeColor: '#E1D3AE',
            flowerSet1Color: '#F6BBC7',
            flowerSet2Color: '#FFFFFF',

        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'holderColor', label: 'Holder' },
            { key: 'tapeColor', label: 'Tape' },
            { key: 'flowerSet1Color', label: 'Flower Set 1' },
            { key: 'flowerSet2Color', label: 'Flower Set 2' },
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
    suit: {
        jacketColor: '#392E18',
        shirtColor: '#EEEEEE',
        tieColor: '#670000',
        tieStripeColor: '#FFC000',
    },
    cup: {
        color: '#E09AAB',
        symbol: 'eclipse',
        symbolColor: '#FFFF00',
        side: 'right',
    },
    glasses: {
        color: '#000000',
    },
    nerdglasses: {
        defaults: {
            color: '#4C4C4C',
        },
        colorSlots: [
            { key: 'color', label: 'Frame' },
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
    dress: {
        defaults: {
            color: '#F2E6FF',
            lacesColor: '#F1EBDF',
            flowerSet1Color: '#DDCEAF',
            flowerSet2Color: '#FFFFFF',
            buttonColor: '#D9CAAA',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'lacesColor', label: 'Laces' },
            { key: 'flowerSet1Color', label: 'Flower Set 1' },
            { key: 'flowerSet2Color', label: 'Flower Set 2' },
            {key: 'buttonColor', label: 'Buttons' },
        ],
    },
    'bubble-tea': {
        defaults: {
            color: '#DDCEAF',
        },
        colorSlots: [
            { key: 'color', label: 'Drink' },
            { key: 'strawColor', label: 'Straw' }
        ],
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
    phone: {
        frameColor: '#D9D9D9',
        backgroundColor: '#575757',
        side: 'right',
    },
    'warm-hat': {
        color: '#4A6741',
    },
    'winter-jacket': {
        jacketColor: '#392E18',
        shirtColor: '#4A6741',
        furColor: '#E1D3AE',
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
    sneaker: {
        color: '#1A1A1A',
    },
};

let ensuredCustomizationIndexes = false;

function inventoryError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
}

function normalizeCustomizationForItem(item, customization = {}) {
    const defaults = CUSTOMIZABLE_ITEM_DEFAULTS[item.assetKey];

    if (!defaults) {
        return {};
    }

    const normalizedCustomization = {
        ...defaults,
        ...customization,
    };

    return normalizedCustomization;
}

function buildCustomizationKey(item, customization = {}) {
    const defaults = CUSTOMIZABLE_ITEM_DEFAULTS[item.assetKey];

    if (!defaults) {
        return 'default';
    }

    return JSON.stringify(
        Object.fromEntries(
            Object.keys(defaults)
                .filter((key) => !NON_OWNERSHIP_CUSTOMIZATION_FIELDS.has(key))
                .map((key) => [key, customization[key]]),
        ),
    );
}

function buildLegacyPlacementCustomizationKeys(item, customization = {}) {
    const defaults = CUSTOMIZABLE_ITEM_DEFAULTS[item.assetKey];

    if (!defaults?.side) {
        return [];
    }

    const legacyKeys = ['left', 'right'].map((side) => JSON.stringify(
        Object.fromEntries(
            Object.keys(defaults).map((key) => [
                key,
                key === 'side' ? side : customization[key],
            ]),
        ),
    ));

    if (item.assetKey === 'cup') {
        legacyKeys.push(
            ...['left', 'right'].map((side) => JSON.stringify({
                color: customization.color,
                side,
            })),
        );
    }

    return legacyKeys;
}

async function ensureCustomizationIndexes() {
    if (ensuredCustomizationIndexes) {
        return;
    }

    try {
        await UserItem.collection.dropIndex('user_1_item_1');
    } catch (error) {
        if (error.codeName !== 'IndexNotFound' && error.code !== 27) {
            throw error;
        }
    }

    await UserItem.collection.createIndex(
        { user: 1, item: 1, customizationKey: 1 },
        { unique: true },
    );
    ensuredCustomizationIndexes = true;
}

export async function listUserItems({ userId }) {
    return UserItem.find({ user: userId })
        .populate('item')
        .sort({ createdAt: -1 });
}

export async function buyItem({ userId, itemId, customization = {} }) {
    const [item, user] = await Promise.all([
        Item.findById(itemId),
        User.findById(userId),
    ]);

    if (!item) {
        throw inventoryError(INVENTORY_ERROR_CODES.ITEM_NOT_FOUND);
    }

    if (!user) {
        throw inventoryError(INVENTORY_ERROR_CODES.USER_NOT_FOUND);
    }

    await ensureCustomizationIndexes();

    const normalizedCustomization = normalizeCustomizationForItem(item, customization);
    const customizationKey = buildCustomizationKey(item, normalizedCustomization);
    const defaultCustomizationKey = buildCustomizationKey(item, normalizeCustomizationForItem(item, {}));
    const customizationKeyConditions = [
        { customizationKey },
        ...buildLegacyPlacementCustomizationKeys(item, normalizedCustomization).map((legacyCustomizationKey) => ({
            customizationKey: legacyCustomizationKey,
        })),
    ];

    if (customizationKey === defaultCustomizationKey || customizationKey === 'default') {
        customizationKeyConditions.push(
            { customizationKey: 'default' },
            { customizationKey: { $exists: false } },
            { customizationKey: null },
        );
    }

    const existingUserItem = await UserItem.findOne({
        user: userId,
        item: itemId,
        $or: customizationKeyConditions,
    });

    if (existingUserItem) {
        throw inventoryError(INVENTORY_ERROR_CODES.ITEM_ALREADY_OWNED);
    }

    const plan = getPlanForUser(user);

    if (item.premiumOnly && !plan.permissions.canBuyPremiumItems) {
        throw inventoryError(INVENTORY_ERROR_CODES.PREMIUM_REQUIRED);
    }

    if (user.coins < item.price) {
        throw inventoryError(INVENTORY_ERROR_CODES.NOT_ENOUGH_COINS);
    }

    user.coins -= item.price;
    await user.save();

    let userItem;

    try {
        userItem = await UserItem.create({
            user: userId,
            item: itemId,
            customization: normalizedCustomization,
            customizationKey,
        });
    } catch (error) {
        if (error.code === 11000) {
            user.coins += item.price;
            await user.save();
            throw inventoryError(INVENTORY_ERROR_CODES.ITEM_ALREADY_OWNED);
        }

        throw error;
    }

    return userItem.populate('item');
}

export async function setItemEquipped({ userId, userItemId, equipped }) {
    const userItem = await UserItem.findOneAndUpdate(
        {
            _id: userItemId,
            user: userId,
        },
        { equipped },
        {
            returnDocument: 'after',
            runValidators: true,
        },
    ).populate('item');

    if (!userItem) {
        throw inventoryError(INVENTORY_ERROR_CODES.USER_ITEM_NOT_FOUND);
    }

    return userItem;
}

export async function saveOutfit({ userId, equippedUserItemIds, customizationUpdates = {} }) {
    const selectedUserItems = await UserItem.find({
        _id: { $in: equippedUserItemIds },
        user: userId,
    }).populate('item');

    if (selectedUserItems.length !== equippedUserItemIds.length) {
        throw inventoryError(INVENTORY_ERROR_CODES.OUTFIT_ITEM_NOT_OWNED);
    }

    const selectedSingleTypes = new Set();
    const selectedSingleSlots = new Set();
    const selectedHandSides = new Set();

    selectedUserItems.forEach((userItem) => {
        const itemType = userItem.item?.type;
        const itemSlot = EQUIP_SLOTS_BY_ASSET_KEY[userItem.item?.assetKey];
        const effectiveCustomization = {
            ...(userItem.customization ?? {}),
            ...(customizationUpdates[userItem._id.toString()] ?? {}),
        };

        if (!SINGLE_EQUIP_ITEM_TYPES.has(itemType)) {
            if (SINGLE_EQUIP_SLOTS.has(itemSlot)) {
                if (selectedSingleSlots.has(itemSlot)) {
                    throw inventoryError(INVENTORY_ERROR_CODES.OUTFIT_ITEM_TYPE_CONFLICT);
                }

                selectedSingleSlots.add(itemSlot);
            }

            if (itemSlot === 'hand') {
                const side = effectiveCustomization.side === 'left' ? 'left' : 'right';

                if (selectedHandSides.has(side)) {
                    throw inventoryError(INVENTORY_ERROR_CODES.OUTFIT_ITEM_TYPE_CONFLICT);
                }

                selectedHandSides.add(side);
            }

            return;
        }

        if (selectedSingleTypes.has(itemType)) {
            throw inventoryError(INVENTORY_ERROR_CODES.OUTFIT_ITEM_TYPE_CONFLICT);
        }
        selectedSingleTypes.add(itemType);
    });

    const customizationUpdateEntries = Object.entries(customizationUpdates)
        .filter(([, customization]) => customization && Object.keys(customization).length > 0);

    if (customizationUpdateEntries.length) {
        const customizationUpdateIds = customizationUpdateEntries.map(([userItemId]) => userItemId);
        const ownedItemsForCustomization = await UserItem.find({
            _id: { $in: customizationUpdateIds },
            user: userId,
        });

        if (ownedItemsForCustomization.length !== customizationUpdateIds.length) {
            throw inventoryError(INVENTORY_ERROR_CODES.OUTFIT_ITEM_NOT_OWNED);
        }

        await Promise.all(ownedItemsForCustomization.map((userItem) => {
            const nextCustomization = {
                ...(userItem.customization ?? {}),
                ...customizationUpdates[userItem._id.toString()],
            };

            return UserItem.updateOne(
                { _id: userItem._id, user: userId },
                { customization: nextCustomization },
            );
        }));
    }

    await UserItem.updateMany({ user: userId, equipped: true }, { equipped: false });

    if (equippedUserItemIds.length) {
        await UserItem.updateMany(
            { _id: { $in: equippedUserItemIds }, user: userId },
            { equipped: true },
        );
    }

    return listUserItems({ userId });
}
