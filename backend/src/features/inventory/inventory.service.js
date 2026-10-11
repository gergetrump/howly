import User from '../users/user.model.js';
import Item from '../items/item.model.js';
import UserItem from './inventory.model.js';
import BoostPurchaseLimit from './boostPurchaseLimit.model.js';
import { getPlanForUser } from '../../config/plans.js';
import {
    activateHabitBoost,
    BOOST_ERROR_CODES,
    isBoostAssetKey,
} from '../boosts/habitBoost.service.js';

export const INVENTORY_ERROR_CODES = {
    ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
    USER_ITEM_NOT_FOUND: 'USER_ITEM_NOT_FOUND',
    ITEM_ALREADY_OWNED: 'ITEM_ALREADY_OWNED',
    PREMIUM_REQUIRED: 'PREMIUM_REQUIRED',
    NOT_ENOUGH_COINS: 'NOT_ENOUGH_COINS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    OUTFIT_ITEM_NOT_OWNED: 'OUTFIT_ITEM_NOT_OWNED',
    OUTFIT_ITEM_TYPE_CONFLICT: 'OUTFIT_ITEM_TYPE_CONFLICT',
    SHIELDS_AT_MAX: 'SHIELDS_AT_MAX',
    BOOST_NOT_AVAILABLE: 'BOOST_NOT_AVAILABLE',
    BOOST_QUANTITY_LIMIT_REACHED: 'BOOST_QUANTITY_LIMIT_REACHED',
    BOOST_MONTHLY_LIMIT_REACHED: 'BOOST_MONTHLY_LIMIT_REACHED',
    ...BOOST_ERROR_CODES,
};

// Consumable power-up in the catalog: buying it grants a streak shield instead
// of creating a normal owned cosmetic item.
export const STREAK_FREEZE_ASSET_KEY = 'streak-freeze';
// Boost limits are split into stock and monthly purchase caps. This prevents
// both long-term stacking and repeated farming within a single month.
export const MAX_OWNED_BOOST_QUANTITY = 20;
export const MAX_MONTHLY_BOOST_PURCHASE_QUANTITY = 20;

const SINGLE_EQUIP_ITEM_TYPES = new Set(['clothing', 'shoes']);
const SINGLE_EQUIP_SLOTS = new Set(['body', 'face', 'head', 'neck']);
const SIDEABLE_HEAD_ITEM_KEYS = new Set(['cute-hat', 'hairpin']);
const EQUIP_SLOTS_BY_ASSET_KEY = {
    bag: 'body',
    balloon: 'hand',
    'bambus-flute': 'hand',
    'bubble-tea': 'hand',
    book: 'hand',
    'blossom-crown': 'head',
    cup: 'hand',
    'cute-hat': 'head',
    'dango-skewer': 'hand',
    'drink-togo': 'hand',
    eyepatch: 'face',
    glasses: 'face',
    hairpin: 'head',
    hat: 'head',
    'hat-with-pompom': 'head',
    'magic-wand': 'hand',
    'matcha-bowl': 'hand',
    necklace: 'neck',
    'hogwarts-scarf': 'neck',
    nerdglasses: 'face',
    phone: 'hand',
    'sakura-branch': 'hand',
    'sakura-neckclace': 'neck',
    'sakura-pouch': 'hand',
    'sensu-fan': 'hand',
    'shell-crown': 'head',
    'straw-hat': 'head',
    'warm-hat': 'head',
    'warm-hat-2-pompom': 'head',
};
const NON_OWNERSHIP_CUSTOMIZATION_FIELDS = new Set(['side']);
const wholeColorCustomization = (color) => ({ color });

function isSideableHeadItem(assetKey) {
    return SIDEABLE_HEAD_ITEM_KEYS.has(assetKey);
}

const CUSTOMIZABLE_ITEM_DEFAULTS = {
    ballerina: wholeColorCustomization('#F1EBDF'),
    'bambus-flute': wholeColorCustomization('#4A6741'),
    'bambus-shoes': wholeColorCustomization('#E1D3AE'),
    'cute-ballerinas': {
        color: '#F1EBDF',
        stripeColor: '#B3A6C1',
    },
    hairpin: {
        color: '#FCE8EC',
        holderColor: '#EFE7D3',
    },
    hat: wholeColorCustomization('#4C4C4C'),
    'hogwarts-cape': wholeColorCustomization('#1A1A1A'),
    'hogwarts-scarf': {
        color: '#822121',
        stripeColor: '#D19B26',
    },
    hoodie: {
        color: '#C66E6E',
        stringColor: '#DADADA',
        textColor: '#FFFFFF',
        text: 'HOWLY',
    },
    jersie: {
        color: '#32326F',
        line: '#FFFFFF',
        textColor: '#FFFFFF',
        text: 'HOWLY',
    },
    'sunset-jersey': {
        color: '#3A2433',
        line: '#FB923C',
        textColor: '#FFE8B6',
        text: 'HOWLY',
    },
    'magic-wand': wholeColorCustomization('#D4A373'),
    necklace: {
        color: '#990000',
        symbol: 'heart',
        symbolColor: '#990000',
    },
    'sakura-outfit': {
        color: '#FCE8EC',
        cordColor: '#E1D3AE',
        flowerSet1Color: '#F6BBC7',
        flowerSet2Color: '#FFFFFF',
        symbol: 'flower',
    },
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
    'ocean-top': {
        color: '#123A4A',
        waveColor: '#38BDF8',
        pocketColor: '#2DD4BF',
        buttonColor: '#DDF7FF',
    },
    summertop: {
        shirtColor: '#FFFFFF',
        jacket: '#4B6942',
        stripeColor: '#FFFFFF',
    },
    'warm-boots': wholeColorCustomization('#392E18'),
    'cozy-jacket': {
        jacketColor: '#4A6741',
        stringColor: '#DADADA',
        shirtColor: '#F4EFE5',
    },
    'sakura-pouch': {
        color: '#FCE8EC',
        holderColor: '#E1D3AE',
        tapeColor: '#E1D3AE',
        flowerSet1Color: '#F6BBC7',
        flowerSet2Color: '#FFFFFF',
        symbol: 'flower',
    },
    'warm-hat-2-pompom': {
        color: '#392E18',
        pompom1Color: '#392E18',
        pompom2Color: '#392E18',
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
        color: '#4C4C4C',
    },
    'sakura-neckclace': {
        color: '#F6BBC7',
        chainColor: '#CEB88B',
    },
    'blossom-crown': {
        color: '#FFE1EB',
        accentColor: '#FFF5F9',
        leafColor: '#A8C48A',
    },
    balloon: wholeColorCustomization('#EF5A6F'),
    'matcha-bowl': {
        bowlColor: '#E3D6C0',
        matchaColor: '#7CAD3E',
    },
    'sakura-branch': {
        blossomColor: '#F6BBC7',
        branchColor: '#7A5A3E',
    },
    eyepatch: {
        color: '#26262B',
        side: 'right',
    },
    book: {
        coverColor: '#7D3A4A',
        bookmarkColor: '#E0B13A',
    },
    'shell-crown': {
        shellColor: '#F6CDBA',
        starfishColor: '#E8895A',
        pearlColor: '#FBF4EC',
        bandColor: '#7FB8AE',
    },
    'straw-hat': {
        strawColor: '#E8C88A',
        ribbonColor: '#E6947A',
    },
    'dango-skewer': {
        topColor: '#F6BBC7',
        middleColor: '#FFFDF5',
        bottomColor: '#BFE0B2',
    },
    'sensu-fan': {
        color: '#F6BBC7',
        borderColor: '#FFF0F6',
        blossomColor: '#FFF5F9',
    },
    dress: {
        color: '#F2E6FF',
        lacesColor: '#F1EBDF',
        flowerSet1Color: '#DDCEAF',
        flowerSet2Color: '#FFFFFF',
        buttonColor: '#D9CAAA',
        symbol: 'flower',
    },
    'bubble-tea': {
        color: '#DDCEAF',
        strawColor: '#F4EFE5',
        symbol: 'bubble',
    },
    'drink-togo': {
        color: '#F6F3EB',
        holderColor: '#DDCEAF',
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
        shirtColor: '#394F32',
        furColor: '#E1D3AE',
    },
    'bag': {
        color: '#F4EFE5',
        strapColor: '#DDCEAF',
        lockColor: '#CEB88B',
        flapClosureColor: '#D7C6A2',
    },
    'cute-hat': {
        color: '#F1EBDF',
        stripeColor: '#B3A6C1',
    },
    'hat-with-pompom': {
        color: '#32326F',
        pompomColor: '#32326F',
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

export function getBoostPurchaseMonthKey(date = new Date()) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

let boostPurchaseLimitReady = null;

async function incrementMonthlyBoostPurchaseCount({ userId, assetKey, date = new Date() }) {
    boostPurchaseLimitReady ??= BoostPurchaseLimit.init();
    await boostPurchaseLimitReady;

    const monthKey = getBoostPurchaseMonthKey(date);

    try {
        // The counter update is atomic, so parallel boost purchases cannot pass
        // the monthly limit by racing each other.
        const counter = await BoostPurchaseLimit.findOneAndUpdate(
            {
                user: userId,
                assetKey,
                monthKey,
                quantity: { $lt: MAX_MONTHLY_BOOST_PURCHASE_QUANTITY },
            },
            {
                $inc: { quantity: 1 },
                $setOnInsert: {
                    user: userId,
                    assetKey,
                    monthKey,
                },
            },
            {
                returnDocument: 'after',
                upsert: true,
                setDefaultsOnInsert: true,
            },
        );

        if (!counter || counter.quantity > MAX_MONTHLY_BOOST_PURCHASE_QUANTITY) {
            throw inventoryError(INVENTORY_ERROR_CODES.BOOST_MONTHLY_LIMIT_REACHED);
        }

        return { monthKey, quantity: counter.quantity };
    } catch (error) {
        if (error.code === 11000) {
            throw inventoryError(INVENTORY_ERROR_CODES.BOOST_MONTHLY_LIMIT_REACHED);
        }

        throw error;
    }
}

async function decrementMonthlyBoostPurchaseCount({ userId, assetKey, monthKey }) {
    await BoostPurchaseLimit.updateOne(
        {
            user: userId,
            assetKey,
            monthKey,
            quantity: { $gt: 0 },
        },
        { $inc: { quantity: -1 } },
    );
}

function normalizeCustomizationForItem(item, customization = {}) {
    const defaults = CUSTOMIZABLE_ITEM_DEFAULTS[item.assetKey];

    if (!defaults) {
        return {};
    }

    const normalizedCustomization = {
        // Merge caller input with defaults before building the ownership key.
        // This lets "no text" be a real saved choice while keeping color defaults.
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
    return UserItem.find({
        user: userId,
        $or: [
            { quantity: { $gt: 0 } },
            { quantity: { $exists: false } },
        ],
    })
        .populate('item')
        .sort({ createdAt: -1 });
}

export async function listCurrentBoostPurchaseLimits({ userId, date = new Date() }) {
    const monthKey = getBoostPurchaseMonthKey(date);
    const counters = await BoostPurchaseLimit.find({ user: userId, monthKey }).lean();

    return {
        monthKey,
        maxQuantity: MAX_MONTHLY_BOOST_PURCHASE_QUANTITY,
        purchases: Object.fromEntries(
            counters.map((counter) => [counter.assetKey, counter.quantity ?? 0]),
        ),
    };
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

    if (item.assetKey === STREAK_FREEZE_ASSET_KEY) {
        // Streak shields are purchased through the shop but stored on the user,
        // not as equipable inventory rows.
        return buyStreakFreeze({ user, item });
    }

    if (isBoostAssetKey(item.assetKey)) {
        return buyBoostPowerUp({ user, item });
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

async function buyBoostPowerUp({ user, item }) {
    const plan = getPlanForUser(user);

    if (item.premiumOnly && !plan.permissions.canBuyPremiumItems) {
        throw inventoryError(INVENTORY_ERROR_CODES.PREMIUM_REQUIRED);
    }

    await ensureCustomizationIndexes();

    const existingUserItem = await UserItem.findOne({
        user: user._id,
        item: item._id,
        customizationKey: 'default',
    });

    if ((existingUserItem?.quantity ?? 0) >= MAX_OWNED_BOOST_QUANTITY) {
        throw inventoryError(INVENTORY_ERROR_CODES.BOOST_QUANTITY_LIMIT_REACHED);
    }

    if (user.coins < item.price) {
        throw inventoryError(INVENTORY_ERROR_CODES.NOT_ENOUGH_COINS);
    }

    const monthlyPurchase = await incrementMonthlyBoostPurchaseCount({
        userId: user._id,
        assetKey: item.assetKey,
    });

    let coinsCharged = false;
    let savedUserItem;
    try {
        // Charge coins and increase inventory after the monthly counter is
        // reserved. If saving inventory fails, the counter and coins roll back.
        user.coins -= item.price;
        await user.save();
        coinsCharged = true;

        if (existingUserItem) {
            existingUserItem.quantity = (existingUserItem.quantity ?? 1) + 1;
            savedUserItem = await existingUserItem.save();
        } else {
            savedUserItem = await UserItem.create({
                user: user._id,
                item: item._id,
                quantity: 1,
                customization: {},
                customizationKey: 'default',
            });
        }
    } catch (error) {
        await decrementMonthlyBoostPurchaseCount({
            userId: user._id,
            assetKey: item.assetKey,
            monthKey: monthlyPurchase.monthKey,
        });

        if (coinsCharged) {
            user.coins += item.price;
            await user.save();
        }

        throw error;
    }

    return savedUserItem.populate('item');
}

export async function useInventoryItem({ userId, userItemId, habitId }) {
    const userItem = await UserItem.findOne({
        _id: userItemId,
        user: userId,
    }).populate('item');

    if (!userItem) {
        throw inventoryError(INVENTORY_ERROR_CODES.USER_ITEM_NOT_FOUND);
    }

    if (!isBoostAssetKey(userItem.item?.assetKey) || (userItem.quantity ?? 1) <= 0) {
        throw inventoryError(INVENTORY_ERROR_CODES.BOOST_NOT_AVAILABLE);
    }

    const result = await activateHabitBoost({
        userId,
        item: userItem.item,
        habitId,
    });

    // Activating a boost consumes exactly one owned boost item. Remove the row
    // when quantity reaches zero so inventory does not show empty stock.
    userItem.quantity = Math.max(0, (userItem.quantity ?? 1) - 1);

    if (userItem.quantity === 0) {
        await UserItem.deleteOne({ _id: userItem._id, user: userId });
    } else {
        await userItem.save();
    }

    return {
        ...result,
        inventoryItemId: userItem._id.toString(),
        quantity: userItem.quantity,
    };
}

// Buy the consumable Streak Freeze: +1 shield, repeatable (no stockpile cap).
async function buyStreakFreeze({ user, item }) {
    const plan = getPlanForUser(user);

    if (item.premiumOnly && !plan.permissions.canBuyPremiumItems) {
        throw inventoryError(INVENTORY_ERROR_CODES.PREMIUM_REQUIRED);
    }

    if (user.coins < item.price) {
        throw inventoryError(INVENTORY_ERROR_CODES.NOT_ENOUGH_COINS);
    }

    user.coins -= item.price;
    user.streakShields = (user.streakShields ?? 0) + 1;
    await user.save();

    const fresh = await User.findById(user._id).select('coins streakShields');
    return {
        consumable: true,
        assetKey: item.assetKey,
        coins: fresh.coins,
        streakShields: fresh.streakShields,
    };
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
    const selectedHeadSides = new Set();

    selectedUserItems.forEach((userItem) => {
        const itemType = userItem.item?.type;
        const itemSlot = EQUIP_SLOTS_BY_ASSET_KEY[userItem.item?.assetKey];
        const effectiveCustomization = {
            ...(userItem.customization ?? {}),
            ...(customizationUpdates[userItem._id.toString()] ?? {}),
        };

        if (!SINGLE_EQUIP_ITEM_TYPES.has(itemType)) {
            if (itemSlot === 'head' && isSideableHeadItem(userItem.item?.assetKey)) {
                const side = effectiveCustomization.side === 'left' ? 'left' : 'right';

                if (selectedSingleSlots.has('head') || selectedHeadSides.has(side)) {
                    throw inventoryError(INVENTORY_ERROR_CODES.OUTFIT_ITEM_TYPE_CONFLICT);
                }

                selectedHeadSides.add(side);
                return;
            }

            if (SINGLE_EQUIP_SLOTS.has(itemSlot)) {
                if (itemSlot === 'head' && selectedHeadSides.size > 0) {
                    throw inventoryError(INVENTORY_ERROR_CODES.OUTFIT_ITEM_TYPE_CONFLICT);
                }

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
