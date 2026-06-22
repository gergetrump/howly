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
const NON_OWNERSHIP_CUSTOMIZATION_FIELDS = new Set(['side']);
const CUSTOMIZABLE_ITEM_DEFAULTS = {
    hoodie: {
        color: '#C66E6E',
        stringColor: '#DADADA',
        textColor: '#FFFFFF',
        text: 'HOWLY',
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
    'cozy-jacket': {
        jacketColor: '#4A6741',
        stringColor: '#DADADA',
        shirtColor: '#F4EFE5',
    },
    suit: {
        jacketColor: '#392E18',
        shirtColor: '#EEEEEE',
        tieColor: '#670000',
        tieStripeColor: '#FFC000',
    },
    cup: {
        color: '#E09AAB',
        side: 'right',
    },
    glasses: {
        color: '#000000',
    },
    phone: {
        frameColor: '#D9D9D9',
        backgroundColor: '#575757',
        side: 'right',
    },
    'warm-hat': {
        color: '#4A6741',
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

    return {
        ...defaults,
        ...customization,
    };
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

    return ['left', 'right'].map((side) => JSON.stringify(
        Object.fromEntries(
            Object.keys(defaults).map((key) => [
                key,
                key === 'side' ? side : customization[key],
            ]),
        ),
    ));
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

    selectedUserItems.forEach((userItem) => {
        const itemType = userItem.item?.type;

        if (!SINGLE_EQUIP_ITEM_TYPES.has(itemType)) {
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
