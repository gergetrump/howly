import { apiRequest } from './apiClient';

function buildPaginationQuery(params = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (Number.isInteger(value)) {
            searchParams.set(key, String(value));
        }
    });

    const query = searchParams.toString();

    return query ? `?${query}` : '';
}

export function getFriends({ limit, offset } = {}) {
    return apiRequest(`/social/friends${buildPaginationQuery({ limit, offset })}`);
}

export function getFriendHabits(userId) {
    return apiRequest(`/social/friends/${userId}/habits`);
}

export function getFriendChallenges(userId) {
    return apiRequest(`/social/friends/${userId}/challenges`);
}

export function deleteFriend(friendshipId) {
    return apiRequest(`/social/friends/${friendshipId}`, {
        method: 'DELETE',
    });
}

export function getFriendRequests({
    incomingLimit,
    incomingOffset,
    outgoingLimit,
    outgoingOffset,
    limit,
    offset,
} = {}) {
    return apiRequest(`/social/friends/requests${buildPaginationQuery({
        incomingLimit,
        incomingOffset,
        outgoingLimit,
        outgoingOffset,
        limit,
        offset,
    })}`);
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

export function getSocialFeed({ limit, offset } = {}) {
    const params = new URLSearchParams();

    if (Number.isInteger(limit)) {
        params.set('limit', String(limit));
    }

    if (Number.isInteger(offset)) {
        params.set('offset', String(offset));
    }

    const query = params.toString();

    return apiRequest(`/milestones/feed${query ? `?${query}` : ''}`);
}

export function reactToMilestone(postId, emoji) {
    return apiRequest(`/milestones/${postId}/like`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
    });
}

export function getMilestoneReactions(postId, { limit, offset } = {}) {
    const params = new URLSearchParams();

    if (Number.isInteger(limit)) {
        params.set('limit', String(limit));
    }

    if (Number.isInteger(offset)) {
        params.set('offset', String(offset));
    }

    const query = params.toString();

    return apiRequest(`/milestones/${postId}/reactions${query ? `?${query}` : ''}`);
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
