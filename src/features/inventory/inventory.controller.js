import * as inventoryService from './inventory.service.js';
import { INVENTORY_ERROR_CODES } from './inventory.service.js';
import {
    validateBuyItemInput,
    validateSaveOutfitInput,
    validateUseInventoryItemInput,
    validateUserItemId,
} from './inventory.validation.js';

const statusByErrorCode = {
    [INVENTORY_ERROR_CODES.ITEM_NOT_FOUND]: 404,
    [INVENTORY_ERROR_CODES.USER_ITEM_NOT_FOUND]: 404,
    [INVENTORY_ERROR_CODES.USER_NOT_FOUND]: 404,
    [INVENTORY_ERROR_CODES.ITEM_ALREADY_OWNED]: 409,
    [INVENTORY_ERROR_CODES.PREMIUM_REQUIRED]: 403,
    [INVENTORY_ERROR_CODES.NOT_ENOUGH_COINS]: 400,
    [INVENTORY_ERROR_CODES.OUTFIT_ITEM_NOT_OWNED]: 400,
    [INVENTORY_ERROR_CODES.OUTFIT_ITEM_TYPE_CONFLICT]: 400,
    [INVENTORY_ERROR_CODES.SHIELDS_AT_MAX]: 400,
    [INVENTORY_ERROR_CODES.BOOST_NOT_AVAILABLE]: 400,
    [INVENTORY_ERROR_CODES.BOOST_QUANTITY_LIMIT_REACHED]: 400,
    [INVENTORY_ERROR_CODES.BOOST_HABIT_REQUIRED]: 400,
    [INVENTORY_ERROR_CODES.BOOST_HABIT_NOT_FOUND]: 404,
    [INVENTORY_ERROR_CODES.BOOST_ALREADY_ACTIVE]: 409,
};

export async function listMyInventory(req, res) {
    const inventory = await inventoryService.listUserItems({ userId: req.user.id });

    return res.status(200).json(inventory);
}

async function setEquipped(req, res, equipped) {
    const { error, value: userItemId } = validateUserItemId(req.params.userItemId);

    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const userItem = await inventoryService.setItemEquipped({
            userId: req.user.id,
            userItemId,
            equipped,
        });

        return res.status(200).json(userItem);
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

export async function equipItem(req, res) {
    return setEquipped(req, res, true);
}

export async function unequipItem(req, res) {
    return setEquipped(req, res, false);
}

export async function saveOutfit(req, res) {
    const { error, value } = validateSaveOutfitInput(req.body);

    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const inventory = await inventoryService.saveOutfit({
            userId: req.user.id,
            equippedUserItemIds: value.equippedUserItemIds,
            customizationUpdates: value.customizationUpdates,
        });

        return res.status(200).json(inventory);
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

export async function buyItem(req, res) {
    const { error, value } = validateBuyItemInput(req.body);

    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const userItem = await inventoryService.buyItem({
            userId: req.user.id,
            itemId: value.itemId,
            customization: value.customization,
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

export async function useInventoryItem(req, res) {
    const { error: userItemIdError, value: userItemId } = validateUserItemId(req.params.userItemId);

    if (userItemIdError) {
        return res.status(400).json({ message: userItemIdError });
    }

    const { error, value } = validateUseInventoryItemInput(req.body);

    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const result = await inventoryService.useInventoryItem({
            userId: req.user.id,
            userItemId,
            habitId: value.habitId,
        });

        return res.status(200).json(result);
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
