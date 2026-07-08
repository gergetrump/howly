import { apiRequest } from './apiClient';

export async function getTaxonomyCategories() {
    const response = await apiRequest('/taxonomy/categories');
    return response?.data ?? [];
}
