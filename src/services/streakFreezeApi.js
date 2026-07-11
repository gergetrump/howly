import { apiRequest } from './apiClient';

/* Spends a streak freeze to protect a single habit's streak. */
export function applyHabitStreakFreeze(habitId) {
    return apiRequest(`/streak-freeze/habits/${habitId}`, {
        method: 'POST',
    });
}

/* Spends a streak freeze to protect the overall perfect-day streak. */
export function applyOverallStreakFreeze() {
    return apiRequest('/streak-freeze/overall', {
        method: 'POST',
    });
}

/* Fetches streak-freeze calendar data for the given month. */
export function getStreakCalendar(month) {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    return apiRequest(`/streak-freeze/calendar${query}`);
}
