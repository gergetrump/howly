import { apiRequest } from './apiClient';

/**
 * Fetch all habits for the authenticated user.
 * Supports pagination via query params (e.g. ?page=1&limit=20).
 */
export async function getMyHabits(params = {}) {
    const searchParams = new URLSearchParams(params);
    const queryString = searchParams.toString();
    const url = queryString ? `/habits?${queryString}` : '/habits';
    return apiRequest(url);
}

/**
 * Get a single habit by ID.
 */
export async function getHabitById(habitId) {
    return apiRequest(`/habits/${habitId}`);
}

/**
 * Create a new habit.
 * data should include: title, frequency, type, description, icon, category
 */
export async function createHabit(data) {
    return apiRequest('/habits', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Bulk create habits from templates (used during onboarding).
 * templates: Array of template objects.
 */
export async function createHabitsFromTemplates(templates) {
    return apiRequest('/habits/templates', {
        method: 'POST',
        body: JSON.stringify({ templates }),
    });
}

/**
 * Update a habit (partial update).
 */
export async function updateHabit(habitId, data) {
    return apiRequest(`/habits/${habitId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

/**
 * Delete a habit.
 */
export async function deleteHabit(habitId) {
    return apiRequest(`/habits/${habitId}`, {
        method: 'DELETE',
    });
}

/**
 * Check-in (complete) a habit for today.
 * Updates the streak count and lastCompletedAt.
 */
export async function checkInHabit(habitId) {
    return apiRequest(`/habits/${habitId}/check-ins`, {
        method: 'POST',
    });
}

/**
 * Undo check-in for a habit.
 */
export async function uncheckInHabit(habitId) {
    return apiRequest(`/habits/${habitId}/check-ins`, {
        method: 'DELETE',
    });
}
