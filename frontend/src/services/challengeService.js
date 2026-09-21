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

export async function deleteChallenge(challengeId) {
    return apiRequest(`/challenges/${challengeId}`, {
        method: 'DELETE',
    });
}

export async function getChallengeById(challengeId) {
    return apiRequest(`/challenges/${challengeId}`);
}

/**
 * Poll until background taxonomy assignment sets a category on the challenge.
 */
export async function waitForChallengeTaxonomy(challengeId, { maxAttempts = 10, intervalMs = 1500 } = {}) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (attempt > 0) {
            await new Promise((resolve) => {
                setTimeout(resolve, intervalMs);
            });
        }

        const response = await getChallengeById(challengeId);
        if (response?.challenge?.taxonomy?.categoryKey) {
            return response.challenge;
        }
    }

    return null;
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

export async function getChallengeParticipants(challengeId) {
    return apiRequest(`/challenges/${challengeId}/participants`);
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
