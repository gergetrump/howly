import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Page, PageSection, Heading } from '@/components/layout';
import { getHabitAnalytics } from '@/services/analyticsService';
import { useAuth } from '@/context/authContext';
import { appCardClassName, appCardInsetClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

const PERIOD_LABELS = {
    week: 'Week',
    month: 'Month',
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

function SummaryCard({ icon: Icon, label, value, helper }) {
    return (
        <Card className={appCardClassName}>
            <CardContent className="flex items-center gap-4">
                <div className={cn('flex size-12 items-center justify-center rounded-xl', appCardInsetClassName)}>
                    <Icon className="size-6 text-emerald-300" aria-hidden="true" />
                </div>
                <div>
                    <p className="text-sm text-slate-300">{label}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    {helper ? <p className="text-xs text-slate-400">{helper}</p> : null}
                </div>
            </CardContent>
        </Card>
    );
}

function CompletionChart({ habits }) {
    const visibleHabits = habits.filter((item) => item.expected > 0 || item.completed > 0);

    return (
        <Card className={appCardClassName}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="size-5 text-emerald-300" aria-hidden="true" />
                    Habit follow-through
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {visibleHabits.length ? visibleHabits.map((item) => {
                    const rate = item.completionRate;

                    return (
                        <div key={item.habit.id} className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="text-lg" aria-hidden="true">{item.habit.icon}</span>
                                    <span className="truncate font-semibold text-white">{item.habit.title}</span>
                                </div>
                                <span className="shrink-0 text-sm text-slate-300">
                                    {item.completed}/{item.expected} · {percent(rate)}
                                </span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-white/10">
                                <div
                                    className={cn('h-full rounded-full transition-all', getCompletionTone(rate))}
                                    style={{ width: `${clampPercent(rate)}%` }}
                                />
                            </div>
                        </div>
                    );
                }) : (
                    <p className="rounded-xl bg-white/5 p-4 text-center text-sm text-slate-300">
                        Complete a habit to start seeing follow-through analytics.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function TimelineChart({ dailyTotals }) {
    const maxExpected = Math.max(1, ...dailyTotals.map((day) => day.expected));

    return (
        <Card className={appCardClassName}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <TrendingUp className="size-5 text-emerald-300" aria-hidden="true" />
                    Daily completion trend
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex h-48 items-end gap-2">
                    {dailyTotals.map((day) => {
                        const expectedHeight = Math.max((day.expected / maxExpected) * 100, 4);
                        const completedHeight = day.expected
                            ? Math.max((day.completed / maxExpected) * 100, day.completed ? 4 : 0)
                            : 0;

                        return (
                            <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                                <div className="relative flex h-36 w-full items-end justify-center rounded-t-lg bg-white/5">
                                    <div
                                        className="absolute bottom-0 w-3/5 rounded-t-lg bg-white/10"
                                        style={{ height: `${expectedHeight}%` }}
                                        title={`${day.expected} scheduled`}
                                    />
                                    <div
                                        className="absolute bottom-0 w-3/5 rounded-t-lg bg-emerald-400"
                                        style={{ height: `${completedHeight}%` }}
                                        title={`${day.completed} completed`}
                                    />
                                </div>
                                <span className="truncate text-[11px] text-slate-400">{day.label}</span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

function TimeMarker({ minutes, label }) {
    if (!label) {
        return (
            <p className="rounded-xl bg-white/5 p-4 text-center text-sm text-slate-300">
                No completion time data yet.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            <div className="relative h-4 rounded-full bg-gradient-to-r from-indigo-300 via-emerald-300 to-amber-200">
                <div
                    className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-950 shadow-lg"
                    style={{ left: `${timePosition(minutes)}%` }}
                />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
                <span>00:00</span>
                <span>12:00</span>
                <span>24:00</span>
            </div>
        </div>
    );
}

function TimeAnalytics({ summary, habits }) {
    const timedHabits = habits.filter((item) => item.averageCompletionTime?.label);

    return (
        <Card className={appCardClassName}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Clock3 className="size-5 text-emerald-300" aria-hidden="true" />
                    Average completion time
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3 rounded-xl bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-white">Overall</span>
                        <span className="text-lg font-bold text-emerald-100">
                            {summary.averageCompletionTime?.label ?? 'No data'}
                        </span>
                    </div>
                    <TimeMarker
                        minutes={summary.averageCompletionTime?.minutes}
                        label={summary.averageCompletionTime?.label}
                    />
                </div>

                <div className="space-y-3">
                    {timedHabits.length ? timedHabits.map((item) => (
                        <div key={item.habit.id} className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:grid-cols-[180px_1fr_64px] sm:items-center">
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="text-lg" aria-hidden="true">{item.habit.icon}</span>
                                <span className="truncate text-sm font-semibold text-white">{item.habit.title}</span>
                            </div>
                            <TimeMarker
                                minutes={item.averageCompletionTime.minutes}
                                label={item.averageCompletionTime.label}
                            />
                            <span className="text-right text-sm font-semibold text-emerald-100">
                                {item.averageCompletionTime.label}
                            </span>
                        </div>
                    )) : (
                        <p className="rounded-xl bg-white/5 p-4 text-center text-sm text-slate-300">
                            Complete habits to see average times per habit.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export function AnalyticsPage() {
    const { user } = useAuth();
    const [period, setPeriod] = useState('week');
    const [analytics, setAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        async function loadAnalytics() {
            setIsLoading(true);
            setError('');

            try {
                const response = await getHabitAnalytics(period);

                if (isMounted) {
                    setAnalytics(response?.data ?? null);
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError.message || 'Could not load analytics.');
                    setAnalytics(null);
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
    }, [period]);

    const bestHabit = useMemo(() => (
        analytics?.habits?.find((item) => item.completionRate !== null) ?? null
    ), [analytics]);

    return (
        <Page theme="forest">
            <Heading
                title="Analytics"
                subtitle="Understand when your habits stick and where they slip."
                streakDays={user?.streak ?? 0}
            />

            <PageSection width="lg" title={`${PERIOD_LABELS[period]} overview`}>
                <Tabs value={period} onValueChange={setPeriod}>
                    <TabsList className="w-full border border-white/10 bg-white/10 text-white">
                        <TabsTrigger
                            value="week"
                            className="text-white/70 data-active:!bg-white/20 data-active:!text-white"
                        >
                            Week
                        </TabsTrigger>
                        <TabsTrigger
                            value="month"
                            className="text-white/70 data-active:!bg-white/20 data-active:!text-white"
                        >
                            Month
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {isLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Loading analytics
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-xl border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
                        {error}
                    </div>
                ) : null}

                {!isLoading && analytics ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-3">
                            <SummaryCard
                                icon={CheckCircle2}
                                label="Follow-through"
                                value={percent(analytics.summary.completionRate)}
                                helper={`${analytics.summary.completed}/${analytics.summary.expected} scheduled habits`}
                            />
                            <SummaryCard
                                icon={Clock3}
                                label="Average time"
                                value={analytics.summary.averageCompletionTime?.label ?? 'No data'}
                                helper="Across all completed habits"
                            />
                            <SummaryCard
                                icon={TrendingUp}
                                label="Strongest habit"
                                value={bestHabit?.habit?.title ?? 'No data'}
                                helper={bestHabit ? `${percent(bestHabit.completionRate)} completed` : 'Complete habits to compare'}
                            />
                        </div>

                        <CompletionChart habits={analytics.habits ?? []} />
                        <TimelineChart dailyTotals={analytics.dailyTotals ?? []} />
                        <TimeAnalytics summary={analytics.summary} habits={analytics.habits ?? []} />
                    </>
                ) : null}
            </PageSection>
        </Page>
    );
}
