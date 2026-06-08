import { apiRequest } from './apiClient';

export async function createCheckoutSession() {
    return apiRequest('/payments/create-checkout-session', {
        method: 'POST',
    });
}