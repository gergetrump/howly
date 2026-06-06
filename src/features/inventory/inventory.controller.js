import * as inventoryService from './inventory.service.js';
import { INVENTORY_ERROR_CODES } from './inventory.service.js';
import { validateBuyItemInput } from './inventory.validation.js';

const statusByErrorCode = {
    [INVENTORY_ERROR_CODES.ITEM_NOT_FOUND]: 404,
    [INVENTORY_ERROR_CODES.USER_NOT_FOUND]: 404,
    [INVENTORY_ERROR_CODES.ITEM_ALREADY_OWNED]: 409,
    [INVENTORY_ERROR_CODES.PREMIUM_REQUIRED]: 403,
    [INVENTORY_ERROR_CODES.NOT_ENOUGH_COINS]: 400,
};

export async function listMyInventory(req, res) {
    const inventory = await inventoryService.listUserItems({ userId: req.user.id });

    return res.status(200).json(inventory);
}

export async function buyItem(req, res) {
    const { error, value } = validateBuyItemInput(req.body);

    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const userItem = await inventoryService.buyItem({
            userId: req.user.id,
            itemId: value.itemId,
        });

        return res.status(201).json(userItem);
    } catch (serviceError) {
        if (serviceError.code && statusByErrorCode[serviceError.code]) {
            return res.status(statusByErrorCode[serviceError.code]).json({
                message: 'Inventory action failed',
                code: serviceError.code,
            });
        }

        throw serviceError;
    }
}
