import mongoose from 'mongoose';

export function validateBuyItemInput(body = {}) {
    if (!mongoose.Types.ObjectId.isValid(body.itemId)) {
        return { error: 'itemId must be a valid ObjectId' };
    }

    return { value: { itemId: body.itemId } };
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
