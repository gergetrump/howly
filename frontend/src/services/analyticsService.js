import { apiRequest } from './apiClient';

export async function getHabitAnalytics(period = 'week', year) {
    const searchParams = new URLSearchParams({ period });

    if (year) {
        searchParams.set('year', String(year));
    }

    return apiRequest(`/analytics/habits?${searchParams.toString()}`);
}

export async function getChallengeAnalytics(period = 'week', year) {
    const searchParams = new URLSearchParams({ period });

    if (year) {
        searchParams.set('year', String(year));
    }

    return apiRequest(`/analytics/challenges?${searchParams.toString()}`);
}
