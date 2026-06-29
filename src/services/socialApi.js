import { apiRequest } from './apiClient';

export function getFriends() {
    return apiRequest('/social/friends');
}

export function deleteFriend(friendshipId) {
    return apiRequest(`/social/friends/${friendshipId}`, {
        method: 'DELETE',
    });
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
    return apiRequest('/milestones/feed');
}

export function reactToMilestone(postId, emoji) {
    return apiRequest(`/milestones/${postId}/like`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
    });
}

export function likeMilestone(postId) {
    return reactToMilestone(postId, '💜');
}

export function unlikeMilestone(postId) {
    return reactToMilestone(postId, '💜');
}

export function getBlockedUsers() {
    return apiRequest('/social/blocked');
}

export function getBlockers() {
    return apiRequest('/social/blockers');
}

export function blockUser(userId) {
    return apiRequest(`/social/block/${userId}`, {
        method: 'POST',
    });
}

export function unblockUser(userId) {
    return apiRequest(`/social/unblock/${userId}`, {
        method: 'POST',
    });
}
