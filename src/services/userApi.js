import { apiRequest } from './apiClient';

export function searchUsers(query) {
    const params = new URLSearchParams({ query });

    return apiRequest(`/users/search?${params.toString()}`);
}

export function updateUserPreferences(preferences) {
    return apiRequest('/users/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify(preferences),
    });
}

export function getUserByUsername(username) {
    return apiRequest(`/users/profile/${username}`);
}
