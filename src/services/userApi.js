import { apiRequest } from './apiClient';

export function searchUsers(query) {
    const params = new URLSearchParams({ query });

    return apiRequest(`/users/search?${params.toString()}`);
}

export function getUserByUsername(username) {
    return apiRequest(`/users/profile/${username}`);
}
