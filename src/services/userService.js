import { apiRequest } from './apiClient';

export function getCurrentUser() {
    return apiRequest('/users/me');
}

export function updateCurrentUser(userData) {
    return apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(userData),
    });
}

export function deleteCurrentUser() {
    return apiRequest('/users/me', {
        method: 'DELETE',
    });
}