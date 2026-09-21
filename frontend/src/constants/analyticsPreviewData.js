/* Builds fake analytics data for the Premium preview. */
export function buildAnalyticsPreviewData(currentYear) {
    const habitAnalytics = {
        availableYears: [currentYear],
        summary: {
            completionRate: 84,
            completed: 21,
            expected: 25,
            averageCompletionTime: { label: '8:20 AM' },
            averageCompletionTimeComparison: {
                earlierThanPercent: 68,
                comparedUsers: 120,
            },
        },
        dailyTotals: [
            { date: 'preview-1', label: 'Mon', completed: 3, expected: 3 },
            { date: 'preview-2', label: 'Tue', completed: 2, expected: 3 },
            { date: 'preview-3', label: 'Wed', completed: 3, expected: 3 },
            { date: 'preview-4', label: 'Thu', completed: 2, expected: 4 },
            { date: 'preview-5', label: 'Fri', completed: 4, expected: 4 },
            { date: 'preview-6', label: 'Sat', completed: 3, expected: 4 },
            { date: 'preview-7', label: 'Sun', completed: 4, expected: 4 },
        ],
        monthlyTotals: [
            { key: 'preview-jan', label: 'Jan', completed: 18, expected: 24, completionRate: 75 },
            { key: 'preview-feb', label: 'Feb', completed: 20, expected: 24, completionRate: 83 },
            { key: 'preview-mar', label: 'Mar', completed: 22, expected: 26, completionRate: 85 },
            { key: 'preview-apr', label: 'Apr', completed: 19, expected: 24, completionRate: 79 },
            { key: 'preview-may', label: 'May', completed: 24, expected: 26, completionRate: 92 },
            { key: 'preview-jun', label: 'Jun', completed: 21, expected: 25, completionRate: 84 },
            { key: 'preview-jul', label: 'Jul', completed: 23, expected: 26, completionRate: 88 },
            { key: 'preview-aug', label: 'Aug', completed: 20, expected: 25, completionRate: 80 },
            { key: 'preview-sep', label: 'Sep', completed: 22, expected: 25, completionRate: 88 },
            { key: 'preview-oct', label: 'Oct', completed: 25, expected: 27, completionRate: 93 },
            { key: 'preview-nov', label: 'Nov', completed: 21, expected: 26, completionRate: 81 },
            { key: 'preview-dec', label: 'Dec', completed: 24, expected: 27, completionRate: 89 },
        ],
        habits: [
            {
                habit: { id: 'preview-run', title: 'Morning run', icon: '\uD83C\uDFC3' },
                completed: 6,
                expected: 7,
                completionRate: 86,
                averageCompletionTime: { label: '7:10 AM' },
            },
            {
                habit: { id: 'preview-read', title: 'Read 20 pages', icon: '\uD83D\uDCDA' },
                completed: 5,
                expected: 6,
                completionRate: 83,
                averageCompletionTime: { label: '9:30 PM' },
            },
            {
                habit: { id: 'preview-water', title: 'Drink water', icon: '\uD83D\uDCA7' },
                completed: 7,
                expected: 7,
                completionRate: 100,
                averageCompletionTime: { label: '10:00 AM' },
            },
        ],
    };

    return {
        habitAnalytics,
        challengeAnalytics: {
            availableYears: [currentYear],
            summary: {
                activeChallengeCount: 2,
                completionRate: 78,
                completed: 14,
                expected: 18,
                averageCompletionTime: { label: '6:45 PM' },
                averageCompletionTimeComparison: {
                    earlierThanPercent: 55,
                    comparedUsers: 88,
                },
            },
            challenges: [
                {
                    challenge: { title: 'Move Every Day', durationDays: 30 },
                    habit: { title: 'Evening walk' },
                    completed: 6,
                    expected: 7,
                    completionRate: 86,
                    progressRate: 63,
                    averageCompletionTime: { label: '6:30 PM' },
                    participant: { id: 'preview-challenge-1', status: 'active', daysCompleted: 19 },
                    daily: habitAnalytics.dailyTotals,
                    monthly: habitAnalytics.monthlyTotals,
                },
                {
                    challenge: { title: 'Mindful Month', durationDays: 21 },
                    habit: { title: 'Meditate' },
                    completed: 5,
                    expected: 7,
                    completionRate: 71,
                    progressRate: 48,
                    averageCompletionTime: { label: '8:15 AM' },
                    participant: { id: 'preview-challenge-2', status: 'active', daysCompleted: 10 },
                    daily: habitAnalytics.dailyTotals,
                    monthly: habitAnalytics.monthlyTotals,
                },
            ],
        },
    };
}
