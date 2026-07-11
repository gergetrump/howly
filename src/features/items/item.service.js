import Item from './item.model.js';

export async function listItems({ type, premiumOnly } = {}) {
    const filter = {};

    if (type) {
        filter.type = type;
    }

    if (premiumOnly !== undefined) {
        filter.premiumOnly = premiumOnly;
    }

    return Item.find(filter).sort({ type: 1, price: 1, name: 1 });
}

export async function getItemById(itemId) {
    return Item.findById(itemId);
}
