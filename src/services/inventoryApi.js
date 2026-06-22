import { apiRequest } from './apiClient';

export function getMyInventory() {
    return apiRequest('/inventory/me');
}

export function buyItem(itemId, customization = {}) {
    return apiRequest('/inventory/buy', {
        method: 'POST',
        body: JSON.stringify({ itemId, customization }),
    });
}

export function saveOutfit(equippedUserItemIds) {
    return apiRequest('/inventory/outfit', {
        method: 'PUT',
        body: JSON.stringify({ equippedUserItemIds }),
    });
}

export function equipInventoryItem(userItemId) {
    return apiRequest(`/inventory/${userItemId}/equip`, {
        method: 'POST',
    });
}

export function unequipInventoryItem(userItemId) {
    return apiRequest(`/inventory/${userItemId}/equip`, {
        method: 'DELETE',
    });
}
