// Curated starter habits offered during onboarding (from the design mockup).
// The fields title/icon/frequency match what the backend
// `POST /habits/templates` expects; category is assigned server-side via taxonomy.
export const STARTER_HABITS = [
    { id: 'morning-workout', title: 'Morning Workout', icon: '💪', frequency: 'Daily' },
    { id: 'read-30-minutes', title: 'Read 30 Minutes', icon: '📖', frequency: 'Daily' },
    { id: 'drink-water', title: 'Drink Water', icon: '💧', frequency: 'Daily' },
    { id: 'meditate', title: 'Meditate', icon: '🧘', frequency: 'Daily' },
    { id: 'practice-language', title: 'Practice Language', icon: '🗣️', frequency: 'Daily' },
    { id: 'yoga-session', title: 'Yoga Session', icon: '🤸', frequency: 'Weekly' },
    { id: 'meal-prep', title: 'Meal Prep', icon: '🥗', frequency: 'Weekly' },
    { id: 'journal', title: 'Journal', icon: '✍️', frequency: 'Daily' },
];

export const FREE_TIER_HABIT_LIMIT = 2;
