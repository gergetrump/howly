import { apiRequest } from './apiClient';

export async function getChallenges(params = {}) {
    const searchParams = new URLSearchParams(params);
    const queryString = searchParams.toString();
    const url = queryString ? `/challenges?${queryString}` : '/challenges';

    return apiRequest(url);
}

export async function createChallenge(data) {
    return apiRequest('/challenges', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateChallenge(challengeId, data) {
    return apiRequest(`/challenges/${challengeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function joinChallenge(challengeId) {
    return apiRequest(`/challenges/${challengeId}/join`, {
        method: 'POST',
    });
}

export async function leaveChallenge(challengeId) {
    return apiRequest(`/challenges/${challengeId}/leave`, {
        method: 'POST',
    });
}

export async function claimChallengeReward(challengeId) {
    return apiRequest(`/challenges/${challengeId}/reward`, {
        method: 'POST',
    });
}

export async function getMyChallengeHabits() {
    return apiRequest('/challenges/my-habits');
}

export async function getChallengeInvitations() {
    return apiRequest('/challenges/invitations');
}

export async function createChallengeInvitation(challengeId, inviteeId) {
    return apiRequest(`/challenges/${challengeId}/invitations`, {
        method: 'POST',
        body: JSON.stringify({ inviteeId }),
    });
}

export async function acceptChallengeInvitation(invitationId) {
    return apiRequest(`/challenges/invitations/${invitationId}/accept`, {
        method: 'POST',
    });
}

export async function rejectChallengeInvitation(invitationId) {
    return apiRequest(`/challenges/invitations/${invitationId}/reject`, {
        method: 'POST',
    });
}
