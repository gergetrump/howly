import * as itemService from './item.service.js';
import {
    validateCreateItemInput,
    validateItemId,
    validateListItemsInput,
} from './item.validation.js';

const badRequest = (res, message) => res.status(400).json({ message });

function isDuplicateAssetKeyError(error) {
    return error?.code === 11000 && error?.keyPattern?.assetKey;
}

export async function createItem(req, res) {
    const { error, value } = validateCreateItemInput(req.body);

    if (error) {
        return badRequest(res, error);
    }

    try {
        const item = await itemService.createItem(value);

        return res.status(201).json(item);
    } catch (serviceError) {
        if (isDuplicateAssetKeyError(serviceError)) {
            return badRequest(res, 'assetKey already exists');
        }

        throw serviceError;
    }
}

export async function listItems(req, res) {
    const { error, value } = validateListItemsInput(req.query);

    if (error) {
        return badRequest(res, error);
    }

    const items = await itemService.listItems(value);

    return res.status(200).json(items);
}

export async function getItemById(req, res) {
    const { error } = validateItemId(req.params.itemId);

    if (error) {
        return badRequest(res, error);
    }

    const item = await itemService.getItemById(req.params.itemId);

    if (!item) {
        return res.status(404).json({ message: 'Item not found' });
    }

    return res.status(200).json(item);
}
