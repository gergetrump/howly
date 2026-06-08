import mongoose from 'mongoose';

export function validateBuyItemInput(body = {}) {
    if (!mongoose.Types.ObjectId.isValid(body.itemId)) {
        return { error: 'itemId must be a valid ObjectId' };
    }

    return { value: { itemId: body.itemId } };
}
