import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, Loader2, Target, TrendingUp, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Page, PageSection, Heading } from '@/components/layout';
import { PremiumFeaturePreview } from '@/components/common';
import { getChallengeAnalytics, getHabitAnalytics } from '@/services/analyticsService';
import { useAuth } from '@/context/AuthContext';
import {
    analyticsCompletionBarClassName,
    analyticsCompletionBarShadowClassName,
    analyticsYearSelectClassName,
    appCardClassName,
    appCardInsetClassName,
    appTabsListFullWidthClassName,
    appTabsTriggerClassName,
} from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

const PERIOD_LABELS = {
    week: 'Week',
    month: 'Month',
    year: 'Year',
};

const CURRENT_YEAR = new Date().getFullYear();

const MOCK_HABIT_ANALYTICS = {
    availableYears: [CURRENT_YEAR],
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
            habit: { id: 'preview-run', title: 'Morning run', icon: '🏃' },
            completed: 6,
            expected: 7,
            completionRate: 86,
            averageCompletionTime: { label: '7:10 AM' },
        },
        {
            habit: { id: 'preview-read', title: 'Read 20 pages', icon: '📚' },
            completed: 5,
            expected: 6,
            completionRate: 83,
            averageCompletionTime: { label: '9:30 PM' },
        },
        {
            habit: { id: 'preview-water', title: 'Drink water', icon: '💧' },
            completed: 7,
            expected: 7,
            completionRate: 100,
            averageCompletionTime: { label: '10:00 AM' },
        },
    ],
};

const MOCK_CHALLENGE_ANALYTICS = {
    availableYears: [CURRENT_YEAR],
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
            daily: MOCK_HABIT_ANALYTICS.dailyTotals,
            monthly: MOCK_HABIT_ANALYTICS.monthlyTotals,
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
            daily: MOCK_HABIT_ANALYTICS.dailyTotals,
            monthly: MOCK_HABIT_ANALYTICS.monthlyTotals,
        },
    ],
};

function percent(value) {
    return value === null || value === undefined ? 'No data' : `${value}%`;
}

function formatStatusLabel(status) {
    const normalizedStatus = String(status ?? '').trim().replaceAll('_', ' ');

    if (!normalizedStatus) {
        return '';
    }

    return normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
}

function clampPercent(value) {
    return Math.min(Math.max(value ?? 0, 0), 100);
}

function getCompletionTone(rate) {
    if (rate === null || rate === undefined) {
        return 'bg-theme-text/20';
    }

    if (rate >= 80) {
        return analyticsCompletionBarClassName;
    }

    if (rate >= 50) {
        return 'bg-theme-gold';
    }

    return 'bg-theme-danger';
}

function averageTimePeerHelper(summary, fallback) {
    const comparison = summary?.averageCompletionTimeComparison;

    if (
        summary?.averageCompletionTime?.label
        && comparison
        && Number.isFinite(comparison.earlierThanPercent)
        && comparison.comparedUsers > 0
    ) {
        return `Earlier than ${comparison.earlierThanPercent}% of other users`;
    }

    return fallback;
}

function SummaryCard({ icon: Icon, label, value, helper }) {
    return (
        <Card className={appCardClassName}>
            <CardContent className="flex items-center gap-4">
                <div className={cn('flex size-12 items-center justify-center rounded-xl', appCardInsetClassName)}>
                    <Icon className="size-6 text-theme-accent" aria-hidden="true" />
                </div>
                <div>
                    <p className="text-sm text-theme-text-soft">{label}</p>
                    <p className="text-2xl font-bold text-theme-text">{value}</p>
                    {helper ? <p className="text-xs text-theme-text-muted">{helper}</p> : null}
                </div>
            </CardContent>
        </Card>
    );
}

function TimelineChart({ dailyTotals }) {
    const maxExpected = Math.max(1, ...dailyTotals.map((day) => day.expected));
    const labelInterval = dailyTotals.length > 14 ? 5 : 1;

    return (
        <Card className={appCardClassName}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-theme-text">
                    <TrendingUp className="size-5 text-theme-accent" aria-hidden="true" />
                    Daily completion trend
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex h-48 items-end gap-2">
                    {dailyTotals.map((day, index) => {
                        const completionRate = day.expected ? Math.round((day.completed / day.expected) * 100) : null;
                        const expectedHeight = Math.max((day.expected / maxExpected) * 100, 4);
                        const rawCompletedHeight = day.expected ? (day.completed / maxExpected) * 100 : 0;
                        const completedHeight = day.expected
                            ? Math.min(expectedHeight, Math.max(rawCompletedHeight, day.completed ? 4 : 0))
                            : 0;
                        const showLabel = dailyTotals.length <= 14
                            || index === 0
                            || index === dailyTotals.length - 1
                            || index % labelInterval === 0;

                        return (
                            <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                                <div className="relative flex h-36 w-full items-end justify-center overflow-hidden rounded-t-lg bg-theme-bg/30">
                                    <div
                                        className="absolute bottom-0 w-3/5 rounded-t-lg border border-theme-text/10 bg-theme-text/10"
                                        style={{ height: `${expectedHeight}%` }}
                                        title={`${day.expected} scheduled`}
                                    />
                                    <div
                                        className={cn(
                                            'absolute bottom-0 w-3/5 rounded-t-lg shadow-lg',
                                            getCompletionTone(completionRate),
                                            analyticsCompletionBarShadowClassName,
                                        )}
                                        style={{ height: `${completedHeight}%` }}
                                        title={`${day.completed}/${day.expected} completed`}
                                    />
                                </div>
                                <span
                                    className="h-4 truncate text-[11px] text-theme-text-muted"
                                    title={day.label}
                                >
                                    {showLabel ? day.label : ''}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

function MonthlyCompletionChart({ monthlyTotals }) {
    const visibleMonths = monthlyTotals ?? [];

    return (
        <Card className={appCardClassName}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-theme-text">
                    <TrendingUp className="size-5 text-theme-accent" aria-hidden="true" />
                    Monthly completion overview
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex h-56 items-end gap-2 sm:gap-3">
                    {visibleMonths.map((month) => {
                        const hasData = month.expected > 0;
                        const height = hasData ? Math.max(clampPercent(month.completionRate), 4) : 4;

                        return (
                            <div key={month.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                                <div className="relative flex h-40 w-full items-end justify-center overflow-hidden rounded-t-lg bg-theme-text/5">
                                    <div className="absolute bottom-0 h-full w-3/5 rounded-t-lg border border-theme-text/10 bg-theme-text/10" />
                                    <div
                                        className={cn(
                                            'absolute bottom-0 w-3/5 rounded-t-lg shadow-lg',
                                            analyticsCompletionBarShadowClassName,
                                            hasData ? getCompletionTone(month.completionRate) : 'bg-theme-text/15',
                                        )}
                                        style={{ height: `${height}%` }}
                                        title={hasData
                                            ? `${month.label}: ${percent(month.completionRate)} (${month.completed}/${month.expected})`
                                            : `${month.label}: No data`}
                                    />
                                </div>
                                <span className="h-4 text-[11px] font-medium text-theme-text-muted" title={month.label}>
                                    {month.label.slice(0, 1)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

function MiniCompletionTrend({ daily }) {
    const visibleDays = daily ?? [];

    if (!visibleDays.length) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="flex h-16 items-end gap-1.5">
                {visibleDays.map((day) => {
                    const completionRate = day.expected ? Math.round((day.completed / day.expected) * 100) : null;
                    const expectedHeight = day.expected ? 100 : 8;
                    const completedHeight = day.expected
                        ? Math.min(expectedHeight, Math.max(completionRate, day.completed ? 8 : 0))
                        : 0;

                    return (
                        <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                            <div className="relative flex h-12 w-full items-end justify-center overflow-hidden rounded-t-md bg-theme-bg/30">
                                <div
                                    className="absolute bottom-0 w-3/5 rounded-t-md border border-theme-text/10 bg-theme-text/10"
                                    style={{ height: `${expectedHeight}%` }}
                                    title={`${day.label}: ${day.expected ? 'scheduled' : 'not scheduled'}`}
                                />
                                <div
                                    className={cn(
                                        'absolute bottom-0 w-3/5 rounded-t-md shadow-md',
                                        getCompletionTone(completionRate),
                                        analyticsCompletionBarShadowClassName,
                                    )}
                                    style={{ height: `${completedHeight}%` }}
                                    title={`${day.label}: ${day.completed ? 'completed' : 'not completed'}`}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-[11px] text-theme-text-muted">
                <span>{visibleDays[0]?.label}</span>
                <span>{visibleDays[visibleDays.length - 1]?.label}</span>
            </div>
        </div>
    );
}

function MiniMonthlyCompletionTrend({ monthly }) {
    const visibleMonths = monthly ?? [];

    if (!visibleMonths.length) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="flex h-20 items-end gap-1.5">
                {visibleMonths.map((month) => {
                    const hasData = month.expected > 0;
                    const completedHeight = hasData ? Math.max(clampPercent(month.completionRate), 4) : 4;

                    return (
                        <div key={month.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                            <div className="relative flex h-14 w-full items-end justify-center overflow-hidden rounded-t-md bg-theme-text/5">
                                <div className="absolute bottom-0 h-full w-3/5 rounded-t-md border border-theme-text/10 bg-theme-text/10" />
                                <div
                                    className={cn(
                                        'absolute bottom-0 w-3/5 rounded-t-md shadow-md',
                                        analyticsCompletionBarShadowClassName,
                                        hasData ? getCompletionTone(month.completionRate) : 'bg-theme-text/15',
                                    )}
                                    style={{ height: `${completedHeight}%` }}
                                    title={hasData
                                        ? `${month.label}: ${percent(month.completionRate)} (${month.completed}/${month.expected})`
                                        : `${month.label}: No data`}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-[11px] text-theme-text-muted">
                <span>J</span>
                <span>F</span>
                <span>M</span>
                <span>A</span>
                <span>M</span>
                <span>J</span>
                <span>J</span>
                <span>A</span>
                <span>S</span>
                <span>O</span>
                <span>N</span>
                <span>D</span>
            </div>
        </div>
    );
}
function YearSelector({ years, value, onChange }) {
    const visibleYears = years.length ? years : [CURRENT_YEAR];

    return (
        <label className="flex items-center gap-2 text-sm text-theme-text-soft">
            <span>Year</span>
            <select
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                disabled={visibleYears.length <= 1}
                className={analyticsYearSelectClassName}
            >
                {visibleYears.map((year) => (
                    <option key={year} value={year}>
                        {year}
                    </option>
                ))}
            </select>
        </label>
    );
}

function HabitPerformance({ habits }) {
    const visibleHabits = habits.filter((item) => (
        item.expected > 0
        || item.completed > 0
        || item.averageCompletionTime?.label
    ));

    return (
        <Card className={appCardClassName}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-theme-text">
                    <BarChart3 className="size-5 text-theme-accent" aria-hidden="true" />
                    Habit performance
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {visibleHabits.length ? (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-3">
                        {visibleHabits.map((item) => {
                            const rate = item.completionRate;
                            const averageTime = item.averageCompletionTime;

                            return (
                                <div
                                    key={item.habit.id}
                                    className="flex flex-col gap-4 rounded-xl border border-theme-text/10 bg-theme-text/5 p-4"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span
                                                className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl text-xl', appCardInsetClassName)}
                                                aria-hidden="true"
                                            >
                                                {item.habit.icon}
                                            </span>
                                            <p className="truncate font-semibold text-theme-text">{item.habit.title}</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-theme-text-muted">
                                                Ø Time
                                            </p>
                                            <p className="text-lg font-bold text-theme-text">
                                                {averageTime?.label ?? 'No data'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-auto space-y-2">
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <span className="text-theme-text-muted">Follow-through</span>
                                            <span className="shrink-0 font-medium text-theme-text">
                                                {item.completed}/{item.expected} · {percent(rate)}
                                            </span>
                                        </div>
                                        <div className="h-3 overflow-hidden rounded-full bg-theme-text/10">
                                            <div
                                                className={cn('h-full rounded-full transition-all', getCompletionTone(rate))}
                                                style={{ width: `${clampPercent(rate)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="rounded-xl bg-theme-text/5 p-4 text-center text-sm text-theme-text-soft">
                        Complete a habit to start seeing performance analytics.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function ChallengePerformance({ challenges, period }) {
    const visibleChallenges = challenges.filter((item) => (
        item.expected > 0
        || item.completed > 0
        || item.participant.daysCompleted > 0
        || item.averageCompletionTime?.label
    ));

    return (
        <Card className={appCardClassName}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-theme-text">
                    <Trophy className="size-5 text-theme-accent" aria-hidden="true" />
                    Challenge performance
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {visibleChallenges.length ? (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-4">
                        {visibleChallenges.map((item) => {
                            const periodRate = item.completionRate;
                            const totalRate = item.progressRate;
                            const averageTime = item.averageCompletionTime;

                            return (
                                <div
                                    key={item.participant.id}
                                    className="flex flex-col gap-4 rounded-xl border border-theme-text/10 bg-theme-text/5 p-4"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-theme-text">{item.challenge.title}</p>
                                            <p className="truncate text-sm text-theme-text-soft">{item.habit.title}</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-theme-text-muted">
                                                Ø Time
                                            </p>
                                            <p className="text-lg font-bold text-theme-text">
                                                {averageTime?.label ?? 'No data'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex">
                                        <span className="rounded-full bg-theme-text/10 px-2.5 py-1 text-xs font-semibold text-theme-text">
                                            {formatStatusLabel(item.participant.status)}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between gap-3 text-sm text-theme-text-soft">
                                            <span>Selected period</span>
                                            <span className="shrink-0">{item.completed}/{item.expected} · {percent(periodRate)}</span>
                                        </div>
                                        <div className="h-3 overflow-hidden rounded-full bg-theme-text/10">
                                            <div
                                                className={cn('h-full rounded-full transition-all', getCompletionTone(periodRate))}
                                                style={{ width: `${clampPercent(periodRate)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between gap-3 text-sm text-theme-text-soft">
                                            <span>Total progress</span>
                                            <span className="shrink-0">
                                                {item.participant.daysCompleted}/{item.challenge.durationDays} days · {percent(totalRate)}
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-theme-text/10">
                                            <div
                                                className={cn('h-full rounded-full', analyticsCompletionBarClassName)}
                                                style={{ width: `${clampPercent(totalRate)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        {period === 'year' ? (
                                            <MiniMonthlyCompletionTrend monthly={item.monthly ?? []} />
                                        ) : (
                                            <MiniCompletionTrend daily={item.daily ?? []} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="rounded-xl bg-theme-text/5 p-4 text-center text-sm text-theme-text-soft">
                        Join a challenge and check off its habit to see challenge analytics.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
export function AnalyticsPage() {
    const { user } = useAuth();
    const isPremiumUser = user?.isPremium === true || user?.role === 'admin';
    const [period, setPeriod] = useState('week');
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
    const [habitAnalytics, setHabitAnalytics] = useState(null);
    const [challengeAnalytics, setChallengeAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!isPremiumUser) {
            return undefined;
        }

        function refreshAnalytics() {
            setRefreshKey((currentKey) => currentKey + 1);
        }

        function refreshWhenVisible() {
            if (!document.hidden) {
                refreshAnalytics();
            }
        }

        window.addEventListener('howly:habit-progress-updated', refreshAnalytics);
        window.addEventListener('focus', refreshAnalytics);
        document.addEventListener('visibilitychange', refreshWhenVisible);

        return () => {
            window.removeEventListener('howly:habit-progress-updated', refreshAnalytics);
            window.removeEventListener('focus', refreshAnalytics);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [isPremiumUser]);

    const displayHabitAnalytics = isPremiumUser ? habitAnalytics : MOCK_HABIT_ANALYTICS;
    const displayChallengeAnalytics = isPremiumUser ? challengeAnalytics : MOCK_CHALLENGE_ANALYTICS;
    const displayIsLoading = isPremiumUser ? isLoading : false;
    const displayError = isPremiumUser ? error : '';

    const availableYears = useMemo(() => {
        const years = new Set([
            CURRENT_YEAR,
            ...(displayHabitAnalytics?.availableYears ?? []),
            ...(displayChallengeAnalytics?.availableYears ?? []),
        ]);

        return [...years]
            .filter((year) => Number.isInteger(year) && year <= CURRENT_YEAR)
            .sort((left, right) => right - left);
    }, [displayChallengeAnalytics?.availableYears, displayHabitAnalytics?.availableYears]);

    const activeYear = period === 'year' && availableYears.includes(selectedYear)
        ? selectedYear
        : availableYears[0] ?? CURRENT_YEAR;

    useEffect(() => {
        if (!isPremiumUser) {
            return undefined;
        }

        let isMounted = true;

        async function loadAnalytics() {
            setIsLoading(true);
            setError('');

            try {
                const requestedYear = period === 'year' ? activeYear : undefined;
                const [habitResponse, challengeResponse] = await Promise.all([
                    getHabitAnalytics(period, requestedYear),
                    getChallengeAnalytics(period, requestedYear),
                ]);

                if (isMounted) {
                    setHabitAnalytics(habitResponse?.data ?? null);
                    setChallengeAnalytics(challengeResponse?.data ?? null);
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError.message || 'Could not load analytics.');
                    setHabitAnalytics(null);
                    setChallengeAnalytics(null);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadAnalytics();

        return () => {
            isMounted = false;
        };
    }, [activeYear, isPremiumUser, period, refreshKey]);

    const bestHabit = useMemo(() => (
        displayHabitAnalytics?.habits?.find((item) => item.completionRate !== null) ?? null
    ), [displayHabitAnalytics]);

    const bestChallenge = useMemo(() => (
        displayChallengeAnalytics?.challenges?.find((item) => item.completionRate !== null) ?? null
    ), [displayChallengeAnalytics]);

    const analyticsContent = (
        <>
            <PageSection width="full" title={`${PERIOD_LABELS[period]} overview`}>
                <Tabs value={period} onValueChange={setPeriod}>
                    <TabsList className={appTabsListFullWidthClassName}>
                        <TabsTrigger
                            value="week"
                            className={appTabsTriggerClassName}
                        >
                            Week
                        </TabsTrigger>
                        <TabsTrigger
                            value="month"
                            className={appTabsTriggerClassName}
                        >
                            Month
                        </TabsTrigger>
                        <TabsTrigger
                            value="year"
                            className={appTabsTriggerClassName}
                        >
                            Year
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {period === 'year' ? (
                    <div className="flex justify-end">
                        <YearSelector
                            years={availableYears}
                            value={activeYear}
                            onChange={setSelectedYear}
                        />
                    </div>
                ) : null}

                {displayIsLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-theme-text/10 bg-theme-text/5 p-4 text-sm text-theme-text">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Loading analytics
                    </div>
                ) : null}

                {displayError ? (
                    <div className="rounded-xl border border-theme-danger/30 bg-theme-danger/10 p-4 text-sm text-theme-danger">
                        {displayError}
                    </div>
                ) : null}

                {!displayIsLoading && displayHabitAnalytics ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-3">
                            <SummaryCard
                                icon={CheckCircle2}
                                label="Follow-through"
                                value={percent(displayHabitAnalytics.summary.completionRate)}
                                helper={`${displayHabitAnalytics.summary.completed}/${displayHabitAnalytics.summary.expected} scheduled habits`}
                            />
                            <SummaryCard
                                icon={Clock3}
                                label="Average time"
                                value={displayHabitAnalytics.summary.averageCompletionTime?.label ?? 'No data'}
                                helper={averageTimePeerHelper(displayHabitAnalytics.summary, 'Across all completed habits')}
                            />
                            <SummaryCard
                                icon={TrendingUp}
                                label="Strongest habit"
                                value={bestHabit?.habit?.title ?? 'No data'}
                                helper={bestHabit ? `${percent(bestHabit.completionRate)} completed` : 'Complete habits to compare'}
                            />
                        </div>
                        {period === 'year' ? (
                            <MonthlyCompletionChart monthlyTotals={displayHabitAnalytics.monthlyTotals ?? []} />
                        ) : (
                            <TimelineChart dailyTotals={displayHabitAnalytics.dailyTotals ?? []} />
                        )}
                        <HabitPerformance habits={displayHabitAnalytics.habits ?? []} />
                    </>
                ) : null}
            </PageSection>

            <PageSection width="full" title="Challenge analytics">
                {!displayIsLoading && displayChallengeAnalytics ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-3">
                            <SummaryCard
                                icon={Trophy}
                                label="Active challenges"
                                value={displayChallengeAnalytics.summary.activeChallengeCount}
                                helper={`${displayChallengeAnalytics.challenges?.length ?? 0} total challenge participations`}
                            />
                            <SummaryCard
                                icon={Target}
                                label="Challenge follow-through"
                                value={percent(displayChallengeAnalytics.summary.completionRate)}
                                helper={`${displayChallengeAnalytics.summary.completed}/${displayChallengeAnalytics.summary.expected} expected challenge days`}
                            />
                            <SummaryCard
                                icon={Clock3}
                                label="Average time"
                                value={displayChallengeAnalytics.summary.averageCompletionTime?.label ?? 'No data'}
                                helper={averageTimePeerHelper(
                                    displayChallengeAnalytics.summary,
                                    bestChallenge ? `Best: ${bestChallenge.challenge.title}` : 'Complete challenges to compare',
                                )}
                            />
                        </div>
                        <ChallengePerformance
                            challenges={displayChallengeAnalytics.challenges ?? []}
                            period={period}
                        />
                    </>
                ) : null}
            </PageSection>
        </>
    );

    return (
        <Page theme="forest" contentClassName="max-w-[1400px]">
            <Heading
                title="Analytics"
                subtitle="Understand when your habits stick and where they slip."
                streakDays={user?.streak ?? 0}
            />

            {isPremiumUser ? (
                analyticsContent
            ) : (
                <PremiumFeaturePreview
                    title="Unlock Analytics"
                    description="Analytics shows your habit completion, completion times, and challenge progress. Upgrade to Premium to use these insights."
                    returnTo="/analytics"
                >
                    {analyticsContent}
                </PremiumFeaturePreview>
            )}
        </Page>
    );
}
