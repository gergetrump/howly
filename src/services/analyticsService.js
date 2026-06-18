import { apiRequest } from './apiClient';

export async function getHabitAnalytics(period = 'week') {
    const searchParams = new URLSearchParams({ period });
    return apiRequest(`/analytics/habits?${searchParams.toString()}`);
}
