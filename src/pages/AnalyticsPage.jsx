import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, Loader2, Target, TrendingUp, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Page, PageSection, Heading } from '@/components/layout';
import { getChallengeAnalytics, getHabitAnalytics } from '@/services/analyticsService';
import { useAuth } from '@/context/authContext';
import { appCardClassName, appCardInsetClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

const PERIOD_LABELS = {
    week: 'Week',
    month: 'Month',
    year: 'Year',
};

function percent(value) {
    return value === null || value === undefined ? 'No data' : `${value}%`;
}

function clampPercent(value) {
    return Math.min(Math.max(value ?? 0, 0), 100);
}

function timePosition(minutes) {
    if (!Number.isFinite(minutes)) {
        return 0;
    }

    return Math.min(Math.max((minutes / 1440) * 100, 0), 100);
}

function getCompletionTone(rate) {
    if (rate === null || rate === undefined) {
        return 'bg-slate-500';
    }

    if (rate >= 80) {
        return 'bg-emerald-400';
    }

    if (rate >= 50) {
        return 'bg-amber-300';
    }

    return 'bg-red-400';
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
                    <Icon className="size-6 text-theme-success" aria-hidden="true" />
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
                    <TrendingUp className="size-5 text-theme-success" aria-hidden="true" />
                    Daily completion trend
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex h-48 items-end gap-2">
                    {dailyTotals.map((day, index) => {
                        const expectedHeight = Math.max((day.expected / maxExpected) * 100, 4);
                        const completedHeight = day.expected
                            ? Math.max((day.completed / maxExpected) * 100, day.completed ? 4 : 0)
                            : 0;
                        const showLabel = dailyTotals.length <= 14
                            || index === 0
                            || index === dailyTotals.length - 1
                            || index % labelInterval === 0;

                        return (
                            <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                                <div className="relative flex h-36 w-full items-end justify-center rounded-t-lg bg-theme-bg/30">
                                    <div
                                        className="absolute bottom-0 w-3/5 rounded-t-lg border border-slate-300/35 bg-slate-400/35"
                                        style={{ height: `${expectedHeight}%` }}
                                        title={`${day.expected} scheduled`}
                                    />
                                    <div
                                        className="absolute bottom-0 w-3/5 rounded-t-lg bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.35)]"
                                        style={{ height: `${completedHeight}%` }}
                                        title={`${day.completed} completed`}
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
                <CardTitle className="flex items-center gap-2 text-white">
                    <TrendingUp className="size-5 text-emerald-300" aria-hidden="true" />
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
                                <div className="relative flex h-40 w-full items-end justify-center rounded-t-lg bg-slate-950/30">
                                    <div className="absolute bottom-0 h-full w-3/5 rounded-t-lg border border-slate-300/25 bg-slate-400/20" />
                                    <div
                                        className={cn(
                                            'absolute bottom-0 w-3/5 rounded-t-lg shadow-[0_0_14px_rgba(110,231,183,0.28)]',
                                            hasData ? getCompletionTone(month.completionRate) : 'bg-slate-600/50',
                                        )}
                                        style={{ height: `${height}%` }}
                                        title={hasData
                                            ? `${month.label}: ${percent(month.completionRate)} (${month.completed}/${month.expected})`
                                            : `${month.label}: No data`}
                                    />
                                </div>
                                <span className="h-4 text-[11px] font-medium text-slate-400" title={month.label}>
                                    {month.label.slice(0, 1)}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3 text-xs text-slate-300">
                    <span>Each bar shows the average habit completion for that month.</span>
                    <span className="shrink-0 text-slate-400">No data = no scheduled habits</span>
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
                    const expectedHeight = day.expected ? 100 : 8;
                    const completedHeight = day.completed ? expectedHeight : 0;

                    return (
                        <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                            <div className="relative flex h-12 w-full items-end justify-center rounded-t-md bg-theme-bg/30">
                                <div
                                    className="absolute bottom-0 w-3/5 rounded-t-md border border-slate-300/25 bg-slate-400/25"
                                    style={{ height: `${expectedHeight}%` }}
                                    title={`${day.label}: ${day.expected ? 'scheduled' : 'not scheduled'}`}
                                />
                                <div
                                    className="absolute bottom-0 w-3/5 rounded-t-md bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.25)]"
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
                            <div className="relative flex h-14 w-full items-end justify-center rounded-t-md bg-slate-950/30">
                                <div className="absolute bottom-0 h-full w-3/5 rounded-t-md border border-slate-300/25 bg-slate-400/20" />
                                <div
                                    className={cn(
                                        'absolute bottom-0 w-3/5 rounded-t-md shadow-[0_0_10px_rgba(110,231,183,0.22)]',
                                        hasData ? getCompletionTone(month.completionRate) : 'bg-slate-600/45',
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
            <div className="flex justify-between text-[11px] text-slate-400">
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
function TimeMarker({ minutes, label }) {
    if (!label) {
        return (
            <p className="rounded-xl bg-theme-text/5 p-4 text-center text-sm text-theme-text-soft">
                No completion time data yet.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            <div
                className="relative h-4 rounded-full"
                style={{
                    background: 'linear-gradient(90deg, #818cf8 0%, #a5b4fc 20%, #fef3c7 34%, #facc15 50%, #fef3c7 66%, #c7d2fe 82%, #818cf8 100%)',
                }}
            >
                <div
                    className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-theme-bg shadow-lg"
                    style={{ left: `${timePosition(minutes)}%` }}
                />
            </div>
            <div className="flex justify-between text-xs text-theme-text-muted">
                <span>00:00</span>
                <span>12:00</span>
                <span>24:00</span>
            </div>
        </div>
    );
}

function HabitPerformance({ summary, habits }) {
    const visibleHabits = habits.filter((item) => (
        item.expected > 0
        || item.completed > 0
        || item.averageCompletionTime?.label
    ));

    return (
        <Card className={appCardClassName}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-theme-text">
                    <BarChart3 className="size-5 text-theme-success" aria-hidden="true" />
                    Habit performance
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 rounded-xl bg-theme-text/5 p-4 md:grid-cols-[minmax(180px,0.6fr)_minmax(0,1.4fr)] md:items-center">
                    <div>
                        <p className="text-sm text-theme-text-soft">Overall average completion time</p>
                        <p className="text-xl font-bold text-theme-success">
                            {summary.averageCompletionTime?.label ?? 'No data'}
                        </p>
                    </div>
                    <TimeMarker
                        minutes={summary.averageCompletionTime?.minutes}
                        label={summary.averageCompletionTime?.label}
                    />
                </div>

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
                                            <p className="text-lg font-bold text-theme-success">
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

function ChallengePerformance({ summary, challenges, period }) {
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
                    <Trophy className="size-5 text-theme-success" aria-hidden="true" />
                    Challenge performance
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 rounded-xl bg-theme-text/5 p-4 md:grid-cols-[minmax(180px,0.6fr)_minmax(0,1.4fr)] md:items-center">
                    <div>
                        <p className="text-sm text-theme-text-soft">Overall average completion time</p>
                        <p className="text-xl font-bold text-theme-success">
                            {summary.averageCompletionTime?.label ?? 'No data'}
                        </p>
                    </div>
                    <TimeMarker
                        minutes={summary.averageCompletionTime?.minutes}
                        label={summary.averageCompletionTime?.label}
                    />
                </div>

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
                                            <p className="truncate text-sm text-theme-success">{item.habit.title}</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-theme-text-muted">
                                                Ø Time
                                            </p>
                                            <p className="text-lg font-bold text-theme-success">
                                                {averageTime?.label ?? 'No data'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex">
                                        <span className="rounded-full bg-theme-text/10 px-2.5 py-1 text-xs font-semibold text-theme-text">
                                            {item.participant.status}
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
                                                className="h-full rounded-full bg-emerald-300"
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
    const [period, setPeriod] = useState('week');
    const [habitAnalytics, setHabitAnalytics] = useState(null);
    const [challengeAnalytics, setChallengeAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
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
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function loadAnalytics() {
            setIsLoading(true);
            setError('');

            try {
                const [habitResponse, challengeResponse] = await Promise.all([
                    getHabitAnalytics(period),
                    getChallengeAnalytics(period),
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
    }, [period, refreshKey]);

    const bestHabit = useMemo(() => (
        habitAnalytics?.habits?.find((item) => item.completionRate !== null) ?? null
    ), [habitAnalytics]);

    const bestChallenge = useMemo(() => (
        challengeAnalytics?.challenges?.find((item) => item.completionRate !== null) ?? null
    ), [challengeAnalytics]);

    return (
        <Page theme="forest" contentClassName="max-w-[1400px]">
            <Heading
                title="Analytics"
                subtitle="Understand when your habits stick and where they slip."
                streakDays={user?.streak ?? 0}
            />

            <PageSection width="full" title={`${PERIOD_LABELS[period]} overview`}>
                <Tabs value={period} onValueChange={setPeriod}>
                    <TabsList className="w-full border border-theme-text/10 bg-theme-surface text-theme-text">
                        <TabsTrigger
                            value="week"
                            className="!text-theme-text-soft data-active:!bg-theme-text/20 data-active:!text-theme-text"
                        >
                            Week
                        </TabsTrigger>
                        <TabsTrigger
                            value="month"
                            className="!text-theme-text-soft data-active:!bg-theme-text/20 data-active:!text-theme-text"
                        >
                            Month
                        </TabsTrigger>
                        <TabsTrigger
                            value="year"
                            className="text-white/70 data-active:!bg-white/20 data-active:!text-white"
                        >
                            Year
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {isLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-theme-text/10 bg-theme-text/5 p-4 text-sm text-theme-text">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Loading analytics
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-xl border border-theme-danger/30 bg-theme-danger/10 p-4 text-sm text-theme-danger">
                        {error}
                    </div>
                ) : null}

                {!isLoading && habitAnalytics ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-3">
                            <SummaryCard
                                icon={CheckCircle2}
                                label="Follow-through"
                                value={percent(habitAnalytics.summary.completionRate)}
                                helper={`${habitAnalytics.summary.completed}/${habitAnalytics.summary.expected} scheduled habits`}
                            />
                            <SummaryCard
                                icon={Clock3}
                                label="Average time"
                                value={habitAnalytics.summary.averageCompletionTime?.label ?? 'No data'}
                                helper={averageTimePeerHelper(habitAnalytics.summary, 'Across all completed habits')}
                            />
                            <SummaryCard
                                icon={TrendingUp}
                                label="Strongest habit"
                                value={bestHabit?.habit?.title ?? 'No data'}
                                helper={bestHabit ? `${percent(bestHabit.completionRate)} completed` : 'Complete habits to compare'}
                            />
                        </div>
                        {period === 'year' ? (
                            <MonthlyCompletionChart monthlyTotals={habitAnalytics.monthlyTotals ?? []} />
                        ) : (
                            <TimelineChart dailyTotals={habitAnalytics.dailyTotals ?? []} />
                        )}
                        <HabitPerformance summary={habitAnalytics.summary} habits={habitAnalytics.habits ?? []} />
                    </>
                ) : null}
            </PageSection>

            <PageSection width="full" title="Challenge analytics">
                {!isLoading && challengeAnalytics ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-3">
                            <SummaryCard
                                icon={Trophy}
                                label="Active challenges"
                                value={challengeAnalytics.summary.activeChallengeCount}
                                helper={`${challengeAnalytics.challenges?.length ?? 0} total challenge participations`}
                            />
                            <SummaryCard
                                icon={Target}
                                label="Challenge follow-through"
                                value={percent(challengeAnalytics.summary.completionRate)}
                                helper={`${challengeAnalytics.summary.completed}/${challengeAnalytics.summary.expected} expected challenge days`}
                            />
                            <SummaryCard
                                icon={Clock3}
                                label="Average time"
                                value={challengeAnalytics.summary.averageCompletionTime?.label ?? 'No data'}
                                helper={averageTimePeerHelper(
                                    challengeAnalytics.summary,
                                    bestChallenge ? `Best: ${bestChallenge.challenge.title}` : 'Complete challenges to compare',
                                )}
                            />
                        </div>
                        <ChallengePerformance
                            summary={challengeAnalytics.summary}
                            challenges={challengeAnalytics.challenges ?? []}
                            period={period}
                        />
                    </>
                ) : null}
            </PageSection>
        </Page>
    );
}
