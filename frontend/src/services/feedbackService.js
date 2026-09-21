import { apiRequest } from './apiClient';

export function sendFeedback(payload) {
    return apiRequest('/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}