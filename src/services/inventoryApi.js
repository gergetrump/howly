import { apiRequest } from './apiClient';

export function getMyInventory() {
    return apiRequest('/inventory/me');
}

export function buyItem(itemId) {
    return apiRequest('/inventory/buy', {
        method: 'POST',
        body: JSON.stringify({ itemId }),
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
