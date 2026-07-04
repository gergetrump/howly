import { apiRequest } from './apiClient';

export function getUnreadNotificationCount(types) {
    const query = Array.isArray(types) && types.length
        ? `?types=${encodeURIComponent(types.join(','))}`
        : '';

    return apiRequest(`/notifications/unread-count${query}`);
}

export function getNotifications() {
    return apiRequest('/notifications');
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
