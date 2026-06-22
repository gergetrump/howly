const FRONTEND_CATEGORY_MATCHERS = {
    all: () => true,
    clothing: (item) => item?.type === 'clothing' || item?.type === 'shoes',
    accessory: (item) => item?.type === 'accessory',
    powerUp: (item) => item?.type === 'powerUp',
};

export function itemMatchesCategory(item, category) {
    const matcher = FRONTEND_CATEGORY_MATCHERS[category];

    return matcher ? matcher(item) : item?.type === category;
}

export function getEquippedItemConfigsFromInventory(inventory = []) {
    return (inventory ?? [])
        .filter((entry) => entry.equipped)
        .map((entry) => ({
            assetKey: entry.item?.assetKey,
            customization: entry.customization ?? {},
        }))
        .filter((item) => item.assetKey);
}
