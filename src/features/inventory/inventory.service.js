import User from '../users/user.model.js';
import Item from '../items/item.model.js';
import UserItem from './inventory.model.js';

export const INVENTORY_ERROR_CODES = {
    ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
    ITEM_ALREADY_OWNED: 'ITEM_ALREADY_OWNED',
    PREMIUM_REQUIRED: 'PREMIUM_REQUIRED',
    NOT_ENOUGH_COINS: 'NOT_ENOUGH_COINS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
};

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

    if (existingUserItem) {
        throw inventoryError(INVENTORY_ERROR_CODES.ITEM_ALREADY_OWNED);
    }

    if (item.premiumOnly) {
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
