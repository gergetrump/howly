import { apiRequest } from './apiClient';

/**
 * Fetch the authenticated user's companion.
 * Returns { data: { id, name, type, inventorySize } | null }.
 */
export async function getMyCompanion() {
    return apiRequest('/companions/me');
}

/**
 * Create or update the user's companion (used during onboarding and when switching/renaming the companion later).
 */
export async function selectCompanion({ type, name }) {
    return apiRequest('/companions/me', {
        method: 'PUT',
        body: JSON.stringify({ type, name }),
    });
}
