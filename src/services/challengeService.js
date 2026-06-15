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

export async function joinChallenge(challengeId, { habitId }) {
    return apiRequest(`/challenges/${challengeId}/join`, {
        method: 'POST',
        body: JSON.stringify({ habitId }),
    });
}

export async function getChallengeInvitations() {
    return apiRequest('/challenges/invitations');
}

export async function acceptChallengeInvitation(invitationId, { habitId }) {
    return apiRequest(`/challenges/invitations/${invitationId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ habitId }),
    });
}

export async function rejectChallengeInvitation(invitationId) {
    return apiRequest(`/challenges/invitations/${invitationId}/reject`, {
        method: 'POST',
    });
}
