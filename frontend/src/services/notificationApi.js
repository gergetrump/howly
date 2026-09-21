import { apiRequest } from './apiClient';

export function getUnreadNotificationCount(types) {
    const query = Array.isArray(types) && types.length
        ? `?types=${encodeURIComponent(types.join(','))}`
        : '';

    return apiRequest(`/notifications/unread-count${query}`);
}

export function getNotifications({ limit, offset } = {}) {
    const params = new URLSearchParams();

    if (Number.isInteger(limit)) {
        params.set('limit', String(limit));
    }

    if (Number.isInteger(offset)) {
        params.set('offset', String(offset));
    }

    const query = params.toString();

    return apiRequest(`/notifications${query ? `?${query}` : ''}`);
}

export function markNotificationRead(notificationId) {
    return apiRequest(`/notifications/${notificationId}/read`, {
        method: 'POST',
    });
}

export function clearNotifications() {
    return apiRequest('/notifications', {
        method: 'DELETE',
    });
}

export function deleteNotification(notificationId) {
    return apiRequest(`/notifications/${notificationId}`, {
        method: 'DELETE',
    });
}
