import { apiRequest } from './apiClient';

export async function getCommunityAnalytics(period = 'week') {
    const searchParams = new URLSearchParams({ period });
    return apiRequest(`/community/analytics?${searchParams.toString()}`);
}
