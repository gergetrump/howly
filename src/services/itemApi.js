import { apiRequest } from './apiClient';

export function getItems(filters = {}) {
    const searchParams = new URLSearchParams();

    if (filters.type) {
        searchParams.set('type', filters.type);
    }

    if (filters.premiumOnly !== undefined) {
        searchParams.set('premiumOnly', String(filters.premiumOnly));
    }

    const query = searchParams.toString();

    return apiRequest(`/items${query ? `?${query}` : ''}`);
}
