import { apiRequest } from './apiClient';

export function getFriends() {
    return apiRequest('/social/friends');
}

export function getFriendRequests() {
    return apiRequest('/social/friends/requests');
}

export function sendFriendRequest(userId) {
    return apiRequest('/social/friends/requests', {
        method: 'POST',
        body: JSON.stringify({ recipientId: userId }),
    });
}

export function acceptFriendRequest(requestId) {
    return apiRequest(`/social/friends/requests/${requestId}/accept`, {
        method: 'POST',
    });
}

export function rejectFriendRequest(requestId) {
    return apiRequest(`/social/friends/requests/${requestId}/reject`, {
        method: 'POST',
    });
}

export function getSocialFeed() {
    return apiRequest('/social/feed');
}

export function likeMilestone(postId) {
    return apiRequest(`/social/milestones/${postId}/like`, {
        method: 'POST',
    });
}

export function unlikeMilestone(postId) {
    return likeMilestone(postId);
}
