import { apiRequest } from './apiClient';

export async function getHabitAnalytics(period = 'week') {
    const searchParams = new URLSearchParams({ period });
    return apiRequest(`/analytics/habits?${searchParams.toString()}`);
}

export async function getChallengeAnalytics(period = 'week') {
    const searchParams = new URLSearchParams({ period });
    return apiRequest(`/analytics/challenges?${searchParams.toString()}`);
}
