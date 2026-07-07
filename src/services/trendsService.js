import { apiRequest } from './apiClient';

export async function getTrendsAnalytics(period = 'week') {
    const searchParams = new URLSearchParams({ period });
    return apiRequest(`/trends/analytics?${searchParams.toString()}`);
}
