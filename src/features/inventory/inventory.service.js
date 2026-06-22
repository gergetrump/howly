import User from '../users/user.model.js';
import Item from '../items/item.model.js';
import UserItem from './inventory.model.js';
import { getPlanForUser, MAX_STREAK_SHIELDS } from '../../config/plans.js';

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
};

// Consumable power-up in the catalog: buying it grants a streak shield instead
export const STREAK_FREEZE_ASSET_KEY = 'streak-freeze';

const SINGLE_EQUIP_ITEM_TYPES = new Set(['clothing', 'shoes']);

function inventoryError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
}

export async function listUserItems({ userId }) {
    return UserItem.find({ user: userId })
        .populate('item')
        .sort({ createdAt: -1 });
}

export async function buyItem({ userId, itemId }) {
    const [item, existingUserItem, user] = await Promise.all([
        Item.findById(itemId),
        UserItem.findOne({ user: userId, item: itemId }),
        User.findById(userId),
    ]);

    if (!item) {
        throw inventoryError(INVENTORY_ERROR_CODES.ITEM_NOT_FOUND);
    }

    if (!user) {
        throw inventoryError(INVENTORY_ERROR_CODES.USER_NOT_FOUND);
    }

    // Streak Freeze is a consumable power-up: grant a shield instead of an item.
    if (item.assetKey === STREAK_FREEZE_ASSET_KEY) {
        return buyStreakFreeze({ user, item });
    }

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

    const userItem = await UserItem.create({
        user: userId,
        item: itemId,
    });

    return userItem.populate('item');
}

// Buy the consumable Streak Freeze: +1 shield (capped), repeatable.
async function buyStreakFreeze({ user, item }) {
    const plan = getPlanForUser(user);

    if (item.premiumOnly && !plan.permissions.canBuyPremiumItems) {
        throw inventoryError(INVENTORY_ERROR_CODES.PREMIUM_REQUIRED);
    }

    if ((user.streakShields ?? 0) >= MAX_STREAK_SHIELDS) {
        throw inventoryError(INVENTORY_ERROR_CODES.SHIELDS_AT_MAX);
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

export async function saveOutfit({ userId, equippedUserItemIds }) {
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

    await UserItem.updateMany({ user: userId, equipped: true }, { equipped: false });

    if (equippedUserItemIds.length) {
        await UserItem.updateMany(
            { _id: { $in: equippedUserItemIds }, user: userId },
            { equipped: true },
        );
    }

    return listUserItems({ userId });
}
