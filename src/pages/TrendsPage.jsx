import { useEffect, useState } from 'react';
import { BarChart3, CircleHelp, Globe, Loader2, Sparkles, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Page, PageSection, Heading } from '@/components/layout';
import { getTrendsAnalytics } from '@/services/trendsService';
import { useAuth } from '@/context/authContext';
import { appCardClassName, appCardInsetClassName, appTabsListCompactClassName, appTabsTriggerCompactClassName } from '@/components/cards/cardStyles';
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

const PERIOD_COMPARISON_LABELS = {
    '24h': 'the previous 24 hours',
    week: 'the previous 7 days',
    month: 'the previous 30 days',
};

const helpButtonClassName = 'grid h-6 w-6 shrink-0 place-items-center rounded-full border border-theme-text/10 bg-theme-text/10 text-theme-text transition hover:bg-theme-text/20 hover:text-theme-text';

const helpPopoverContentClassName = 'z-[120] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-theme-text/10 bg-theme-bg/95 p-4 text-left text-xs leading-snug text-theme-text shadow-xl shadow-theme-bg/30';

function InfoPopover({ ariaLabel, title, children }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={helpButtonClassName}
                    aria-label={ariaLabel}
                >
                    <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                side="bottom"
                sideOffset={8}
                className={helpPopoverContentClassName}
            >
                <p className="text-sm font-bold text-theme-text">{title}</p>
                <div className="mt-3 space-y-3">{children}</div>
            </PopoverContent>
        </Popover>
    );
}

function HelpSection({ heading, children }) {
    return (
        <div>
            <p className="font-semibold text-theme-accent-soft">{heading}</p>
            <p className="mt-1">{children}</p>
        </div>
    );
}

function ConsistencyHelpPopover() {
    return (
        <InfoPopover ariaLabel="What does your consistency mean?" title="Your consistency">
            <HelpSection heading="Ahead of X%">
                Compares your personal habit completion rate to other Howly users for this period.
                &ldquo;Ahead of X%&rdquo; means you completed a higher share of your scheduled habits
                than X% of eligible users. Ties do not count.
            </HelpSection>
            <HelpSection heading="Completion rate">
                Your own rate: completed habit days divided by expected days. Challenge habits are
                excluded. Only habits that existed at the start of the period count.
            </HelpSection>
        </InfoPopover>
    );
}

function CategoryBreakdownHelpPopover({ comparisonPeriod }) {
    return (
        <InfoPopover ariaLabel="What do these category percentages mean?" title="What Howly is working on">
            <HelpSection heading="Share %">
                The share of all classified habit check-ins on Howly in this period that belong to
                this life area. For example, 28% means about 28% of platform check-ins were in
                Movement.
            </HelpSection>
            <HelpSection heading="Trend arrows">
                How much check-ins changed compared to {comparisonPeriod}. For example, &uarr; 17%
                means 17% more check-ins and &darr; 8% means 8% fewer. &ldquo;New&rdquo; means there
                were no check-ins in the previous window.
            </HelpSection>
        </InfoPopover>
    );
}

function TrendingHabitsHelpPopover({ comparisonPeriod }) {
    return (
        <InfoPopover ariaLabel="What do these trend percentages mean?" title="Trending on Howly">
            <HelpSection heading="Trend arrows">
                How much check-ins for each standard habit type changed compared to{' '}
                {comparisonPeriod}. For example, &uarr; 17% means 17% more check-ins and &darr; 8%
                means 8% fewer. &ldquo;New&rdquo; means there were no check-ins in the previous
                window.
            </HelpSection>
            <HelpSection heading="Habit labels">
                Shows standard habit types from Howly&apos;s taxonomy, not individual user habit
                titles.
            </HelpSection>
        </InfoPopover>
    );
}

function formatCategory(value) {
    return value?.categoryLabel ?? 'No data';
}

function formatStandingValue(standing) {
    if (!standing) {
        return 'N/A';
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

    return 'N/A';
}

function standingHelperText(standing, periodInRange) {
    if (standing?.display === 'percent') {
        const rate = standing.userCompletionRate;
        const rateLabel = Number.isFinite(rate) ? `${rate}% completion rate` : 'Personal habit completion rate';
        return `${rateLabel} ${periodInRange}`;
    }

    if (standing?.display === 'no_habits') {
        return `Personal habits only ${periodInRange}`;
    }

    if (standing?.display === 'not_eligible') {
        return `Nothing was due ${periodInRange}`;
    }

    return `Personal habit completion rate ${periodInRange}`;
}

function standingValueClassName(standing) {
    if (standing?.display === 'percent') {
        return 'text-theme-success';
    }

    return 'text-theme-text';
}

function formatTrendValue(trend) {
    if (!trend) {
        return 'N/A';
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

    if (value === 'N/A') {
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
            <TabsList className={appTabsListCompactClassName}>
                <TabsTrigger value="24h" className={appTabsTriggerCompactClassName}>
                    24 hours
                </TabsTrigger>
                <TabsTrigger value="week" className={appTabsTriggerCompactClassName}>
                    7 days
                </TabsTrigger>
                <TabsTrigger value="month" className={appTabsTriggerCompactClassName}>
                    30 days
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}

function SummaryCard({ icon: Icon, label, labelAction, value, helper, valueClassName }) {
    return (
        <Card className={appCardClassName}>
            <CardContent className="flex items-center gap-4">
                <div className={cn('flex size-12 items-center justify-center rounded-xl', appCardInsetClassName)}>
                    <Icon className="size-6 text-howly-primary" aria-hidden="true" />
                </div>
                <div>
                    <div className="flex items-center gap-1.5">
                        <p className="text-sm text-theme-text-soft">{label}</p>
                        {labelAction}
                    </div>
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
                            className="h-full rounded-full bg-howly-primary shadow-[0_0_12px] shadow-howly-primary/25 transition-all"
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

export function TrendsPage() {
    const { user } = useAuth();
    const [period, setPeriod] = useState('24h');
    const [trendsAnalytics, setTrendsAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        async function loadTrendsAnalytics() {
            setIsLoading(true);
            setError('');

            try {
                const response = await getTrendsAnalytics(period);

                if (isMounted) {
                    setTrendsAnalytics(response?.data ?? null);
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError.message || 'Could not load trends analytics.');
                    setTrendsAnalytics(null);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadTrendsAnalytics();

        return () => {
            isMounted = false;
        };
    }, [period]);

    const summary = trendsAnalytics?.summary;
    const periodInRange = PERIOD_IN_RANGE_LABELS[period] ?? PERIOD_IN_RANGE_LABELS.week;
    const comparisonPeriod = PERIOD_COMPARISON_LABELS[period] ?? PERIOD_COMPARISON_LABELS.week;
    const standing = summary?.standing;

    return (
        <Page theme="forest" contentClassName="max-w-[1400px]">
            <Heading
                title="Trends"
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
                            Loading trends analytics
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <SummaryCard
                                icon={Trophy}
                                label="Your consistency"
                                labelAction={<ConsistencyHelpPopover />}
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
                            <BarChart3 className="size-5 text-howly-primary" aria-hidden="true" />
                            <span>What Howly is working on</span>
                            <CategoryBreakdownHelpPopover comparisonPeriod={comparisonPeriod} />
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
                                categories={trendsAnalytics?.byCategory ?? []}
                                showTrends
                            />
                        )}
                    </CardContent>
                </Card>

                <Card className={appCardClassName}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-theme-text">
                            <Sparkles className="size-5 text-howly-primary" aria-hidden="true" />
                            <span>Trending on Howly</span>
                            <TrendingHabitsHelpPopover comparisonPeriod={comparisonPeriod} />
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
                                habits={trendsAnalytics?.trendingHabits ?? []}
                                showTrends
                            />
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-theme-text-muted">
                    Anonymous patterns only: shares and trends, never individual habit names or usernames. Your consistency rank is a private benchmark against other Howly users.
                </p>
            </div>
        </Page>
    );
}
