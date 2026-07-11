import { apiRequest } from './apiClient';

export function applyHabitStreakFreeze(habitId) {
    return apiRequest(`/streak-freeze/habits/${habitId}`, {
        method: 'POST',
    });
}

export function applyOverallStreakFreeze() {
    return apiRequest('/streak-freeze/overall', {
        method: 'POST',
    });
}

export function getStreakCalendar(month) {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    return apiRequest(`/streak-freeze/calendar${query}`);
}
