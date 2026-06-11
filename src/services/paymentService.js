import { apiRequest } from './apiClient';

export async function createCheckoutSession() {
    return apiRequest('/payments/create-checkout-session', {
        method: 'POST',
    });
}

export async function createManagePremiumSession() {
    return apiRequest('/payments/manage-premium-session', {
        method: 'POST',
    });
}