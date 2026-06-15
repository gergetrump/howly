// Curated starter habits offered during onboarding (from the design mockup).
// The fields title/icon/frequency/category match what the backend
// `POST /habits/templates` expects; `id` is only used as a React key and to
// track selection on the client (it is not sent to the backend).
export const STARTER_HABITS = [
    { id: 'morning-workout', title: 'Morning Workout', icon: '💪', frequency: 'Daily', category: 'Movement' },
    { id: 'read-30-minutes', title: 'Read 30 Minutes', icon: '📖', frequency: 'Daily', category: 'Productivity' },
    { id: 'drink-water', title: 'Drink Water', icon: '💧', frequency: 'Daily', category: 'Nutrition' },
    { id: 'meditate', title: 'Meditate', icon: '🧘', frequency: 'Daily', category: 'Movement' },
    { id: 'practice-language', title: 'Practice Language', icon: '🗣️', frequency: 'Daily', category: 'Productivity' },
    { id: 'yoga-session', title: 'Yoga Session', icon: '🤸', frequency: 'Weekly', category: 'Movement' },
    { id: 'meal-prep', title: 'Meal Prep', icon: '🥗', frequency: 'Weekly', category: 'Nutrition' },
    { id: 'journal', title: 'Journal', icon: '✍️', frequency: 'Daily', category: 'Productivity' },
];

// Free-tier users can select at most this many habits during onboarding.
export const FREE_TIER_HABIT_LIMIT = 2;
