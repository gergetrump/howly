import { apiRequest } from './apiClient';

export function registerUser(userData) {
    return apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
        redirectOnUnauthorized: false,
    });
}

export function verifyEmail(token) {
    return apiRequest(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        redirectOnUnauthorized: false,
    });
}

export function resendVerificationEmail(email) {
    return apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify( {email} ),
        redirectOnUnauthorized: false,
    });
}

export function loginUser(credentials) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        redirectOnUnauthorized: false,
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
        body: JSON.stringify({ email }),
        redirectOnUnauthorized: false,
    });
}

export function resetPassword(token, password) {
    return apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
        redirectOnUnauthorized: false,
    });
}