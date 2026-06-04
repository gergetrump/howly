import { apiRequest } from './apiClient';

export function getFriends() {
    return apiRequest('/api/social/friends');
}

export function getFriendRequests() {
    return apiRequest('/api/social/friends/requests');
}

export function sendFriendRequest(userId) {
    return apiRequest('/api/social/friends/requests', {
        method: 'POST',
        body: JSON.stringify({ recipientId: userId }),
    });
}

export function acceptFriendRequest(requestId) {
    return apiRequest(`/api/social/friends/requests/${requestId}/accept`, {
        method: 'POST',
    });
}

export function rejectFriendRequest(requestId) {
    return apiRequest(`/api/social/friends/requests/${requestId}/reject`, {
        method: 'POST',
    });
}

export function getSocialFeed() {
    return apiRequest('/api/social/feed');
}

export function likeMilestone(postId) {
    return apiRequest(`/api/social/milestones/${postId}/like`, {
        method: 'POST',
    });
}

export function unlikeMilestone(postId) {
    return likeMilestone(postId);
}
