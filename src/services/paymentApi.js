import { apiRequest } from './apiClient';

export async function createPremiumCheckoutSession() {
    return apiRequest('/payments/create-checkout-session', {
        method: 'POST',
    });
}
