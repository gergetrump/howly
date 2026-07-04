import { useEffect, useState } from 'react';
import { Activity, BarChart3, CheckCircle2, Globe, Loader2, Sparkles, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Page, PageSection, Heading } from '@/components/layout';
import { getCommunityAnalytics } from '@/services/communityService';
import { useAuth } from '@/context/authContext';
import { appCardClassName, appCardInsetClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

const PERIOD_LABELS = {
    week: 'Week',
    month: 'Month',
};

const periodTabTriggerClassName = 'px-3 py-1 text-xs text-white/70 data-active:!bg-white/20 data-active:!text-white sm:text-sm';

function formatCount(value) {
    if (value === null || value === undefined) {
        return '0';
    }

    return value.toLocaleString();
}

function formatCategory(value) {
    return value?.categoryLabel ?? 'No data';
}

function PeriodToggle({ period, onPeriodChange }) {
    return (
        <Tabs value={period} onValueChange={onPeriodChange}>
            <TabsList className="h-9 w-auto shrink-0 border border-white/10 bg-white/5 p-1 text-white">
                <TabsTrigger value="week" className={periodTabTriggerClassName}>
                    Week
                </TabsTrigger>
                <TabsTrigger value="month" className={periodTabTriggerClassName}>
                    Month
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
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

function CategoryBreakdown({ categories }) {
    if (!categories?.length) {
        return (
            <p className="rounded-xl bg-white/5 p-4 text-center text-sm text-slate-300">
                No classified check-ins yet. Habits need taxonomy labels to appear here.
            </p>
        );
    }

    const maxCheckIns = Math.max(...categories.map((item) => item.checkIns), 1);

    return (
        <div className="space-y-3">
            {categories.map((item) => (
                <div key={item.categoryKey} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-white">{item.categoryLabel}</span>
                        <span className="shrink-0 text-slate-300">
                            {item.share}% · {formatCount(item.checkIns)} check-ins
                        </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full rounded-full bg-emerald-300 transition-all"
                            style={{ width: `${Math.max((item.checkIns / maxCheckIns) * 100, item.checkIns ? 4 : 0)}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function TrendingHabits({ habits }) {
    if (!habits?.length) {
        return (
            <p className="rounded-xl bg-white/5 p-4 text-center text-sm text-slate-300">
                No trending habits yet. Check-ins on classified habits will show up here.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {habits.map((item, index) => (
                <div
                    key={item.canonicalHabitKey}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
                >
                    <div className="min-w-0">
                        <p className="font-semibold text-white">
                            {index + 1}. {item.label}
                        </p>
                        <p className="truncate text-sm text-slate-300">
                            {item.categoryLabel ?? 'Unclassified'}
                        </p>
                    </div>
                    <div className="shrink-0 text-right text-sm text-slate-300">
                        <p className="font-semibold text-white">{formatCount(item.checkIns)}</p>
                        <p>{formatCount(item.uniqueUsers)} users</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CommunityPage() {
    const { user } = useAuth();
    const [period, setPeriod] = useState('week');
    const [communityAnalytics, setCommunityAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        async function loadCommunityAnalytics() {
            setIsLoading(true);
            setError('');

            try {
                const response = await getCommunityAnalytics(period);

                if (isMounted) {
                    setCommunityAnalytics(response?.data ?? null);
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError.message || 'Could not load community analytics.');
                    setCommunityAnalytics(null);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadCommunityAnalytics();

        return () => {
            isMounted = false;
        };
    }, [period]);

    const today = communityAnalytics?.today;
    const summary = communityAnalytics?.summary;

    return (
        <Page theme="forest" contentClassName="max-w-[1400px]">
            <Heading
                title="Community"
                subtitle="See how Howly is doing together."
                streakDays={user?.streak ?? 0}
            />

            <div className="space-y-8">
                {error ? (
                    <div className="rounded-xl border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
                        {error}
                    </div>
                ) : null}

                <PageSection width="full" title="Today on Howly" description="Right now across the community">
                    {isLoading ? (
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            Loading community pulse
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-3">
                            <SummaryCard
                                icon={CheckCircle2}
                                label="Check-ins today"
                                value={formatCount(today?.checkIns)}
                                helper="Total habits completed on Howly today"
                            />
                            <SummaryCard
                                icon={Users}
                                label="Active today"
                                value={formatCount(today?.activeUsers)}
                                helper="Howly users who checked in today"
                            />
                            <SummaryCard
                                icon={Sparkles}
                                label="Leading area"
                                value={formatCategory(today?.topCategory)}
                                helper="Top habit category today"
                            />
                        </div>
                    )}
                </PageSection>

                <PageSection width="full">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-white">
                            This {PERIOD_LABELS[period].toLowerCase()} on Howly
                        </h2>
                        <PeriodToggle period={period} onPeriodChange={setPeriod} />
                    </div>

                    {isLoading ? (
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            Loading community analytics
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-3">
                            <SummaryCard
                                icon={Users}
                                label="Active Howly users"
                                value={formatCount(summary?.activeUsers)}
                                helper={`Users with check-ins this ${period}`}
                            />
                            <SummaryCard
                                icon={Activity}
                                label="Habits completed"
                                value={formatCount(summary?.checkIns)}
                                helper={`Check-ins this ${period}`}
                            />
                            <SummaryCard
                                icon={Globe}
                                label="Top focus area"
                                value={formatCategory(summary?.topCategory)}
                                helper={`Leading category this ${period}`}
                            />
                        </div>
                    )}
                </PageSection>

                <Card className={appCardClassName}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <BarChart3 className="size-5 text-emerald-300" aria-hidden="true" />
                            What Howly is working on
                        </CardTitle>
                        <CardDescription className="text-slate-300">
                            How check-ins split across life areas this{' '}
                            {period === 'month' ? 'month' : 'week'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center gap-2 rounded-xl bg-white/5 p-4 text-sm text-slate-200">
                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                Loading categories
                            </div>
                        ) : (
                            <CategoryBreakdown categories={communityAnalytics?.byCategory ?? []} />
                        )}
                    </CardContent>
                </Card>

                <Card className={appCardClassName}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Sparkles className="size-5 text-emerald-300" aria-hidden="true" />
                            Trending on Howly
                        </CardTitle>
                        <CardDescription className="text-slate-300">
                            The standard habit types completed most often this{' '}
                            {period === 'month' ? 'month' : 'week'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center gap-2 rounded-xl bg-white/5 p-4 text-sm text-slate-200">
                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                Loading trending habits
                            </div>
                        ) : (
                            <TrendingHabits habits={communityAnalytics?.trendingHabits ?? []} />
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-slate-400">
                    Anonymous totals only. Howly never shows individual habit names or usernames here.
                </p>
            </div>
        </Page>
    );
}
