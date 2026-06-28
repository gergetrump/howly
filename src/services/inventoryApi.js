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

export function saveOutfit(equippedUserItemIds, customizationUpdates = {}) {
    return apiRequest('/inventory/outfit', {
        method: 'PUT',
        body: JSON.stringify({ equippedUserItemIds, customizationUpdates }),
    });
}

export function useInventoryItem(userItemId, habitId) {
    return apiRequest(`/inventory/${userItemId}/use`, {
        method: 'POST',
        body: JSON.stringify({ habitId }),
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
