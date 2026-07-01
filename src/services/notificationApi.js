import { apiRequest } from './apiClient';

export const SOCIAL_NOTIFICATION_TYPES = [
    'friend_request_received',
    'friend_request_accepted',
    'milestone_reacted',
    'story_liked',
    'story_commented',
];

export function getUnreadNotificationCount(types) {
    const query = Array.isArray(types) && types.length
        ? `?types=${encodeURIComponent(types.join(','))}`
        : '';

    return apiRequest(`/notifications/unread-count${query}`);
}

export function getNotifications() {
    return apiRequest('/notifications');
}

export function markNotificationsRead(types) {
    return apiRequest('/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ types }),
    });
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
