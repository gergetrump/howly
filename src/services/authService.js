import { apiRequest } from './apiClient';

export function registerUser(userData) {
    return apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
}

export function loginUser(credentials) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
}

export function logoutUser() {
    return apiRequest('/auth/logout', {
        method: 'POST',
    });
}

export function forgotPassword(email) {
    return apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
}

export function resetPassword(token, password) {
    return apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password })
    });
}