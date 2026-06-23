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
    const labelInterval = dailyTotals.length > 14 ? 5 : 1;

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
                                <div className="relative flex h-36 w-full items-end justify-center rounded-t-lg bg-slate-950/30">
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
                                    className="h-4 truncate text-[11px] text-slate-400"
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
                            <div className="relative flex h-12 w-full items-end justify-center rounded-t-md bg-slate-950/30">
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
            <div className="flex justify-between text-[11px] text-slate-400">
                <span>{visibleDays[0]?.label}</span>
                <span>{visibleDays[visibleDays.length - 1]?.label}</span>
            </div>
        </div>
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
            <div
                className="relative h-4 rounded-full"
                style={{
                    background: 'linear-gradient(90deg, #a5b4fc 0%, #a5b4fc 20%, #6ee7b7 28%, #fde68a 36%, #fde68a 74%, #6ee7b7 82%, #a5b4fc 90%, #a5b4fc 100%)',
                }}
            >
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

                <div className="grid gap-3 xl:grid-cols-2">
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

function ChallengeProgressChart({ challenges }) {
    const visibleChallenges = challenges.filter((item) => item.expected > 0 || item.completed > 0 || item.participant.daysCompleted > 0);

    return (
        <Card className={appCardClassName}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Trophy className="size-5 text-emerald-300" aria-hidden="true" />
                    Challenge progress
                </CardTitle>
            </CardHeader>
            <CardContent className={visibleChallenges.length ? "grid gap-4 xl:grid-cols-2" : "space-y-4"}>
                {visibleChallenges.length ? visibleChallenges.map((item) => {
                    const periodRate = item.completionRate;
                    const totalRate = item.progressRate;

                    return (
                        <div key={item.participant.id} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-white">{item.challenge.title}</p>
                                    <p className="truncate text-sm text-emerald-100">{item.habit.title}</p>
                                </div>
                                <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
                                    {item.participant.status}
                                </span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-slate-300">
                                    <span>Selected period</span>
                                    <span>{item.completed}/{item.expected} · {percent(periodRate)}</span>
                                </div>
                                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className={cn('h-full rounded-full transition-all', getCompletionTone(periodRate))}
                                        style={{ width: `${clampPercent(periodRate)}%` }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-slate-300">
                                    <span>Total progress</span>
                                    <span>
                                        {item.participant.daysCompleted}/{item.challenge.durationDays} days · {percent(totalRate)}
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full bg-emerald-300"
                                        style={{ width: `${clampPercent(totalRate)}%` }}
                                    />
                                </div>
                            </div>
                            <MiniCompletionTrend daily={item.daily ?? []} />
                        </div>
                    );
                }) : (
                    <p className="rounded-xl bg-white/5 p-4 text-center text-sm text-slate-300">
                        Join a challenge and check off its habit to see challenge analytics.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function ChallengeTimeAnalytics({ summary, challenges }) {
    const timedChallenges = challenges.filter((item) => item.averageCompletionTime?.label);

    return (
        <Card className={appCardClassName}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Clock3 className="size-5 text-emerald-300" aria-hidden="true" />
                    Average challenge completion time
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

                <div className="grid gap-3 xl:grid-cols-2">
                    {timedChallenges.length ? timedChallenges.map((item) => (
                        <div key={item.participant.id} className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:grid-cols-[220px_1fr_64px] sm:items-center">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{item.challenge.title}</p>
                                <p className="truncate text-xs text-emerald-100">{item.habit.title}</p>
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
                            Complete challenge habits to see average times per challenge.
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
    const [habitAnalytics, setHabitAnalytics] = useState(null);
    const [challengeAnalytics, setChallengeAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

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
    }, [period]);

    const bestHabit = useMemo(() => (
        habitAnalytics?.habits?.find((item) => item.completionRate !== null) ?? null
    ), [habitAnalytics]);

    const bestChallenge = useMemo(() => (
        challengeAnalytics?.challenges?.find((item) => item.completionRate !== null) ?? null
    ), [challengeAnalytics]);

    return (
        <Page theme="forest" contentClassName="max-w-[1600px]">
            <Heading
                title="Analytics"
                subtitle="Understand when your habits stick and where they slip."
                streakDays={user?.streak ?? 0}
            />

            <PageSection width="full" title={`${PERIOD_LABELS[period]} overview`}>
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
                                helper="Across all completed habits"
                            />
                            <SummaryCard
                                icon={TrendingUp}
                                label="Strongest habit"
                                value={bestHabit?.habit?.title ?? 'No data'}
                                helper={bestHabit ? `${percent(bestHabit.completionRate)} completed` : 'Complete habits to compare'}
                            />
                        </div>
                        <TimelineChart dailyTotals={habitAnalytics.dailyTotals ?? []} />
                        <CompletionChart habits={habitAnalytics.habits ?? []} />
                        <TimeAnalytics summary={habitAnalytics.summary} habits={habitAnalytics.habits ?? []} />
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
                                helper={bestChallenge ? `Best: ${bestChallenge.challenge.title}` : 'Complete challenges to compare'}
                            />
                        </div>
                        <ChallengeProgressChart challenges={challengeAnalytics.challenges ?? []} />
                        <ChallengeTimeAnalytics
                            summary={challengeAnalytics.summary}
                            challenges={challengeAnalytics.challenges ?? []}
                        />
                    </>
                ) : null}
            </PageSection>
        </Page>
    );
}
