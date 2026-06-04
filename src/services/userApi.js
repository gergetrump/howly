import { apiRequest } from './apiClient';

export function searchUsers(query) {
    const params = new URLSearchParams({ query });

    return apiRequest(`/api/users/search?${params.toString()}`);
}
