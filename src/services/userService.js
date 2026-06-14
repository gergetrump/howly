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

export function completeOnboarding() {
    return apiRequest('/users/me/complete-onboarding', {
        method: 'POST',
    });
}

export async function uploadCurrentUserProfilePicture(file) {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const response = await apiRequest('/users/me/profile-picture', {
        method: 'PATCH',
        body: formData,
    });

    return response.user;
}

export async function deleteCurrentUserProfilePicture() {

    const response = await apiRequest('/users/me/profile-picture', {
        method: 'DELETE',
    });

    return response.user
}
