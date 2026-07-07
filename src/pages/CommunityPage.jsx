import { useEffect, useState } from 'react';
import { BarChart3, Globe, Loader2, Sparkles, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Page, PageSection, Heading } from '@/components/layout';
import { getCommunityAnalytics } from '@/services/communityService';
import { useAuth } from '@/context/authContext';
import { appCardClassName, appCardInsetClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

const PERIOD_HEADINGS = {
    '24h': 'Last 24 hours on Howly',
    week: 'Last 7 days on Howly',
    month: 'Last 30 days on Howly',
};

const PERIOD_IN_RANGE_LABELS = {
    '24h': 'in the last 24 hours',
    week: 'in the last 7 days',
    month: 'in the last 30 days',
};

const periodTabTriggerClassName = 'px-3 py-1 text-xs text-theme-text-soft data-active:!bg-theme-invert data-active:!text-theme-invert-text sm:text-sm';

function formatCategory(value) {
    return value?.categoryLabel ?? 'No data';
}

function formatStandingValue(standing) {
    if (!standing) {
        return '—';
    }

    if (standing.display === 'percent' && standing.aheadPercent !== null) {
        return `Ahead of ${standing.aheadPercent}%`;
    }

    if (standing.display === 'no_habits') {
        return 'Add habits to compare';
    }

    if (standing.display === 'not_eligible') {
        return 'No habits due yet';
    }

    return '—';
}

function standingHelperText(standing, periodInRange) {
    if (standing?.display === 'percent') {
        const rate = standing.userCompletionRate;
        const rateLabel = Number.isFinite(rate) ? `${rate}% completion rate` : 'Personal habit completion rate';
        return `${rateLabel} · ${periodInRange}`;
    }

    if (standing?.display === 'no_habits') {
        return `Personal habits only · ${periodInRange}`;
    }

    if (standing?.display === 'not_eligible') {
        return `Nothing was due in this window · ${periodInRange}`;
    }

    return `Personal habit completion rate · ${periodInRange}`;
}

function standingValueClassName(standing) {
    if (standing?.display === 'percent') {
        return 'text-theme-success';
    }

    return 'text-theme-text';
}

function formatTrendValue(trend) {
    if (!trend) {
        return '—';
    }

    if (trend.display === 'new') {
        return 'New';
    }

    if (trend.direction === 'flat' || trend.changePercent === 0) {
        return 'Flat';
    }

    const arrow = trend.direction === 'up' ? '↑' : '↓';
    return `${arrow} ${Math.abs(trend.changePercent)}%`;
}

function trendValueClassName(trend) {
    if (!trend || trend.direction === 'flat' || trend.changePercent === 0) {
        return 'text-theme-text';
    }

    if (trend.display === 'new' || trend.direction === 'up') {
        return 'text-theme-success';
    }

    return 'text-theme-gold';
}

function TrendDelta({ trend, className, size = 'sm' }) {
    if (!trend) {
        return null;
    }

    const value = formatTrendValue(trend);

    if (value === '—') {
        return null;
    }

    return (
        <span
            className={cn(
                'tabular-nums',
                size === 'lg' ? 'text-2xl font-bold' : 'text-xs',
                trendValueClassName(trend),
                className,
            )}
        >
            {value}
        </span>
    );
}

function PeriodToggle({ period, onPeriodChange }) {
    return (
        <Tabs value={period} onValueChange={onPeriodChange}>
            <TabsList className="h-9 w-auto shrink-0 border border-theme-text/10 bg-theme-text/5 p-1 text-theme-text">
                <TabsTrigger value="24h" className={periodTabTriggerClassName}>
                    24 hours
                </TabsTrigger>
                <TabsTrigger value="week" className={periodTabTriggerClassName}>
                    7 days
                </TabsTrigger>
                <TabsTrigger value="month" className={periodTabTriggerClassName}>
                    30 days
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}

function SummaryCard({ icon: Icon, label, value, helper, valueClassName }) {
    return (
        <Card className={appCardClassName}>
            <CardContent className="flex items-center gap-4">
                <div className={cn('flex size-12 items-center justify-center rounded-xl', appCardInsetClassName)}>
                    <Icon className="size-6 text-theme-accent-soft" aria-hidden="true" />
                </div>
                <div>
                    <p className="text-sm text-theme-text-soft">{label}</p>
                    <p className={cn('text-2xl font-bold tabular-nums', valueClassName ?? 'text-theme-text')}>{value}</p>
                    {helper ? <p className="text-xs text-theme-text-muted">{helper}</p> : null}
                </div>
            </CardContent>
        </Card>
    );
}

function CategoryBreakdown({ categories, showTrends }) {
    if (!categories?.length) {
        return (
            <p className="rounded-xl bg-theme-text/5 p-4 text-center text-sm text-theme-text-soft">
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
                        <span className="font-medium text-theme-text">{item.categoryLabel}</span>
                        <span className="flex shrink-0 items-center gap-2 text-theme-text-soft">
                            <span>{item.share}%</span>
                            {showTrends ? <TrendDelta trend={item.trend} className="w-12 text-right" /> : null}
                        </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-theme-text/10">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-theme-accent to-theme-accent shadow-[0_0_12px_rgba(168,85,247,0.25)] transition-all"
                            style={{ width: `${Math.max((item.checkIns / maxCheckIns) * 100, item.checkIns ? 4 : 0)}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function TrendingHabits({ habits, showTrends }) {
    if (!habits?.length) {
        return (
            <p className="rounded-xl bg-theme-text/5 p-4 text-center text-sm text-theme-text-soft">
                No trending habits yet. Check-ins on classified habits will show up here.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {habits.map((item, index) => (
                <div
                    key={item.canonicalHabitKey}
                    className="flex items-center justify-between gap-4 rounded-xl border border-theme-text/10 bg-theme-text/5 p-4"
                >
                    <div className="min-w-0">
                        <p className="font-semibold text-theme-text">
                            {index + 1}. {item.label}
                        </p>
                        <p className="truncate text-sm text-theme-text-soft">
                            {item.categoryLabel ?? 'Unclassified'}
                        </p>
                    </div>
                    {showTrends ? (
                        <TrendDelta trend={item.trend} className="shrink-0 text-right" />
                    ) : null}
                </div>
            ))}
        </div>
    );
}

export function CommunityPage() {
    const { user } = useAuth();
    const [period, setPeriod] = useState('24h');
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

    const summary = communityAnalytics?.summary;
    const periodInRange = PERIOD_IN_RANGE_LABELS[period] ?? PERIOD_IN_RANGE_LABELS.week;
    const standing = summary?.standing;

    return (
        <Page theme="forest" contentClassName="max-w-[1400px]">
            <Heading
                title="Community"
                subtitle="See how Howly is doing together."
                streakDays={user?.streak ?? 0}
            />

            <div className="space-y-8">
                {error ? (
                    <div className="rounded-xl border border-theme-danger/30 bg-theme-danger/10 p-4 text-sm text-theme-danger">
                        {error}
                    </div>
                ) : null}

                <PageSection width="full">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-theme-text">
                            {PERIOD_HEADINGS[period] ?? PERIOD_HEADINGS.week}
                        </h2>
                        <PeriodToggle period={period} onPeriodChange={setPeriod} />
                    </div>

                    {isLoading ? (
                        <div className="flex items-center gap-2 rounded-xl border border-theme-text/10 bg-theme-text/5 p-4 text-sm text-theme-text-soft">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            Loading community analytics
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <SummaryCard
                                icon={Trophy}
                                label="Your consistency"
                                value={formatStandingValue(standing)}
                                valueClassName={standingValueClassName(standing)}
                                helper={standingHelperText(standing, periodInRange)}
                            />
                            <SummaryCard
                                icon={Globe}
                                label="Top focus area"
                                value={formatCategory(summary?.topCategory)}
                                helper={`Leading category ${periodInRange}`}
                            />
                        </div>
                    )}
                </PageSection>

                <Card className={appCardClassName}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-theme-text">
                            <BarChart3 className="size-5 text-theme-accent-soft" aria-hidden="true" />
                            What Howly is working on
                        </CardTitle>
                        <CardDescription className="text-theme-text-soft">
                            Share of habit completions across life areas {periodInRange}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center gap-2 rounded-xl bg-theme-text/5 p-4 text-sm text-theme-text-soft">
                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                Loading categories
                            </div>
                        ) : (
                            <CategoryBreakdown
                                categories={communityAnalytics?.byCategory ?? []}
                                showTrends
                            />
                        )}
                    </CardContent>
                </Card>

                <Card className={appCardClassName}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-theme-text">
                            <Sparkles className="size-5 text-theme-accent-soft" aria-hidden="true" />
                            Trending on Howly
                        </CardTitle>
                        <CardDescription className="text-theme-text-soft">
                            The standard habit types rising or falling {periodInRange}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center gap-2 rounded-xl bg-theme-text/5 p-4 text-sm text-theme-text-soft">
                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                Loading trending habits
                            </div>
                        ) : (
                            <TrendingHabits
                                habits={communityAnalytics?.trendingHabits ?? []}
                                showTrends
                            />
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-theme-text-muted">
                    Anonymous patterns only — shares and trends, never individual habit names or usernames. Your consistency rank is a private benchmark against the community.
                </p>
            </div>
        </Page>
    );
}
