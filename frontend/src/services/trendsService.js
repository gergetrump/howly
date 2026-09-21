import { apiRequest } from './apiClient';

export async function getTrendsAnalytics(period = '7d') {
    const searchParams = new URLSearchParams({ period });
    return apiRequest(`/trends/analytics?${searchParams.toString()}`);
}
