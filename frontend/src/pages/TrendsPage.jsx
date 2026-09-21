import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BarChart3, ChevronDown, CircleHelp, Globe, Loader2, Sparkles, Trophy, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Page, PageSection, Heading } from '@/components/layout';
import { PremiumFeaturePreview } from '@/components/common';
import { getTrendsAnalytics } from '@/services/trendsService';
import { useAuth } from '@/context/AuthContext';
import { buildTrendCompanionIntent, storePendingCompanionIntent } from '@/lib/trendCompanionIntent';
import { appCardClassName, appCardInsetClassName, appTabsListCompactClassName, appTabsTriggerCompactClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

const TRENDS_PERIOD_OPTIONS = [
    {
        value: '24h',
        tabLabel: '24 hours',
        heading: 'Last 24 hours on Howly',
        inRange: 'in the last 24 hours',
        comparison: 'the previous 24 hours',
    },
    {
        value: '7d',
        tabLabel: '7 days',
        heading: 'Last 7 days on Howly',
        inRange: 'in the last 7 days',
        comparison: 'the previous 7 days',
    },
    {
        value: '30d',
        tabLabel: '30 days',
        heading: 'Last 30 days on Howly',
        inRange: 'in the last 30 days',
        comparison: 'the previous 30 days',
    },
];

const helpButtonClassName = 'grid h-6 w-6 shrink-0 place-items-center rounded-full border border-theme-text/10 bg-theme-text/10 text-theme-text transition hover:bg-theme-text/20 hover:text-theme-text';

const helpPopoverContentClassName = 'z-[120] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-theme-text/10 bg-theme-bg/95 p-4 text-left text-xs leading-snug text-theme-text shadow-xl shadow-theme-bg/30';

const PERSONAL_SCOPE_HELPER = 'Personal habits only. Challenges excluded.';

const MOCK_TRENDS_ANALYTICS = {
    summary: {
        standing: {
            display: 'percent',
            aheadPercent: 72,
            userCompletionRate: 86,
        },
        topCategory: {
            categoryLabel: 'Movement',
        },
        pulse: {
            checkIns: 1240,
            checkInsTrend: {
                changePercent: 12,
                direction: 'up',
                display: 'percent',
            },
            activeUsers: {
                count: 86,
                trend: {
                    changePercent: 8,
                    direction: 'up',
                    display: 'percent',
                },
            },
        },
    },
    byCategory: [
        {
            categoryKey: 'movement',
            categoryLabel: 'Movement',
            share: 34,
            checkIns: 340,
            trend: { direction: 'up', changePercent: 18 },
            bySubcategory: [
                { subcategoryKey: 'cardio', subcategoryLabel: 'Cardio', share: 18, checkIns: 180 },
                { subcategoryKey: 'strength', subcategoryLabel: 'Strength', share: 10, checkIns: 100 },
                { subcategoryKey: 'mobility', subcategoryLabel: 'Mobility', share: 6, checkIns: 60 },
            ],
        },
        {
            categoryKey: 'mindfulness',
            categoryLabel: 'Mindfulness',
            share: 27,
            checkIns: 270,
            trend: { direction: 'up', changePercent: 9 },
        },
        {
            categoryKey: 'learning',
            categoryLabel: 'Learning',
            share: 21,
            checkIns: 210,
            trend: { direction: 'flat', changePercent: 0 },
        },
        {
            categoryKey: 'sleep',
            categoryLabel: 'Sleep',
            share: 18,
            checkIns: 180,
            trend: { direction: 'down', changePercent: 6 },
        },
    ],
    trendingHabits: [
        {
            canonicalHabitKey: 'run',
            label: 'Run',
            categoryKey: 'movement',
            categoryLabel: 'Movement',
            checkIns: 412,
            uniqueUsers: 78,
            trend: { direction: 'up', changePercent: 24 },
        },
        {
            canonicalHabitKey: 'drink-water',
            label: 'Drink water',
            categoryKey: 'health',
            categoryLabel: 'Health',
            checkIns: 280,
            uniqueUsers: 52,
            trend: { direction: 'up', changePercent: 17 },
        },
        {
            canonicalHabitKey: 'read',
            label: 'Read',
            categoryKey: 'learning',
            categoryLabel: 'Learning',
            checkIns: 195,
            uniqueUsers: 41,
            trend: { direction: 'flat', changePercent: 0 },
        },
        {
            canonicalHabitKey: 'meditate',
            label: 'Meditate',
            categoryKey: 'mindfulness',
            categoryLabel: 'Mindfulness',
            checkIns: 120,
            uniqueUsers: 29,
            trend: { display: 'new', direction: 'up', changePercent: 100 },
        },
    ],
};

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
        <InfoPopover ariaLabel="What does your consistency mean?" title="Your consistency (personal habits)">
            <HelpSection heading="Personal habits only">
                This card uses your own habits only. Challenge habits are excluded so the
                benchmark stays fair and comparable across users.
            </HelpSection>
            <HelpSection heading="Ahead of X%">
                Compares your personal habit completion rate to other Howly users for this period.
                &ldquo;Ahead of X%&rdquo; means you completed a higher share of your scheduled habits
                than X% of eligible users. Ties do not count.
            </HelpSection>
            <HelpSection heading="Completion rate">
                Your own rate: completed habit days divided by expected days. Only personal habits
                that existed at the start of the period count.
            </HelpSection>
        </InfoPopover>
    );
}

function CategoryBreakdownHelpPopover({ comparisonPeriod }) {
    return (
        <InfoPopover ariaLabel="What do these category percentages mean?" title="What Howly is working on">
            <HelpSection heading="Platform totals">
                Counts all classified check-ins on Howly in this period, including personal habits
                and challenge habits.
            </HelpSection>
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
            <HelpSection heading="Subcategories">
                Tap a category to see finer sub-areas (for example Cardio or Strength under Movement).
                Subcategory percentages are shares of all classified check-ins in this period, same as
                the parent category row.
            </HelpSection>
        </InfoPopover>
    );
}

function TrendingHabitsHelpPopover({ comparisonPeriod }) {
    return (
        <InfoPopover ariaLabel="What do these trend percentages mean?" title="Trending on Howly">
            <HelpSection heading="Platform totals">
                Ranks standard habit types by check-ins across Howly, including personal habits
                and challenge habits.
            </HelpSection>
            <HelpSection heading="User counts">
                The &ldquo;X users did this&rdquo; line counts distinct users who checked in on
                that habit type in the period. Anonymous totals only — ghost-mode users are
                excluded, same as other platform pulse metrics.
            </HelpSection>
            <HelpSection heading="Try what&apos;s rising">
                Ask Howly for habit ideas opens your companion on the dashboard with tailored
                suggestions, or find public challenges in the same life area.
            </HelpSection>
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

function PulseHelpPopover() {
    return (
        <InfoPopover ariaLabel="What do these platform totals mean?" title="Howly together">
            <HelpSection heading="Platform totals">
                Anonymous check-in counts across all non-deleted Howly users for the selected
                period. Includes personal habits and challenge habits. No usernames or individual
                habit titles are shown.
            </HelpSection>
            <HelpSection heading="Ghost mode">
                Users in ghost mode are excluded from platform totals so their activity stays
                private.
            </HelpSection>
            <HelpSection heading="Trend arrows">
                Each card shows how the total changed compared to the previous equivalent period.
                For example, &uarr; 12% means 12% more than the prior window and &darr; 8% means
                8% fewer. &ldquo;New&rdquo; means there were none in the previous window.
            </HelpSection>
            <HelpSection heading="Active users">
                Distinct users who completed at least one habit in the period, including personal
                and challenge check-ins.
            </HelpSection>
        </InfoPopover>
    );
}

function formatCategory(value) {
    return value?.categoryLabel ?? 'No data';
}

function formatPulseCheckIns(checkIns) {
    const count = Number.isFinite(checkIns) ? checkIns : 0;
    return count.toLocaleString();
}

function formatActiveUsers(activeUsers) {
    const count = activeUsers?.count ?? 0;
    return count.toLocaleString();
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
        return `Completion rate ${periodInRange}. ${PERSONAL_SCOPE_HELPER}`;
    }

    if (standing?.display === 'no_habits') {
        return `${PERSONAL_SCOPE_HELPER} ${periodInRange}`;
    }

    if (standing?.display === 'not_eligible') {
        return `Nothing was due on personal habits ${periodInRange}. ${PERSONAL_SCOPE_HELPER}`;
    }

    return `${PERSONAL_SCOPE_HELPER} ${periodInRange}`;
}

function standingValueClassName(standing) {
    if (standing?.display === 'percent') {
        return 'text-theme-success';
    }

    return 'text-theme-text';
}

function formatUniqueUsersShort(count) {
    if (!Number.isFinite(count) || count <= 0) {
        return null;
    }

    return count === 1 ? '1 user' : `${count.toLocaleString()} users`;
}

const habitCategoryBadgeClassName =
    'shrink-0 border border-theme-accent/30 bg-theme-accent/15 text-theme-accent-soft hover:bg-theme-accent/15';

const trendingHabitSecondaryCtaClassName = cn(
    'rounded-full px-3 py-1.5 text-sm',
    'border-theme-text/20 bg-theme-text/5 text-theme-text-soft',
    'hover:bg-theme-text/10 hover:text-theme-text',
);

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
                {TRENDS_PERIOD_OPTIONS.map(({ value, tabLabel }) => (
                    <TabsTrigger key={value} value={value} className={appTabsTriggerCompactClassName}>
                        {tabLabel}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}

function SummaryCard({ icon: Icon, label, labelAction, value, trend, helper, valueClassName }) {
    return (
        <Card className={appCardClassName}>
            <CardContent className="flex items-center gap-4">
                <div className={cn('flex size-12 items-center justify-center rounded-xl', appCardInsetClassName)}>
                    <Icon className="size-6 text-howly-primary" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        <p className="text-sm text-theme-text-soft">{label}</p>
                        {labelAction}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className={cn('text-2xl font-bold tabular-nums', valueClassName ?? 'text-theme-text')}>{value}</p>
                        {trend ? <TrendDelta trend={trend} size="sm" className="text-sm font-semibold" /> : null}
                    </div>
                    {helper ? <p className="text-xs text-theme-text-muted">{helper}</p> : null}
                </div>
            </CardContent>
        </Card>
    );
}

function CategoryBreakdown({ categories, showTrends, expandedCategoryKey, onExpandedCategoryChange }) {
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
            {categories.map((item) => {
                const hasSubcategories = item.bySubcategory?.length > 0;
                const isExpanded = expandedCategoryKey === item.categoryKey;

                return (
                    <div key={item.categoryKey} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                            {hasSubcategories ? (
                                <button
                                    type="button"
                                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left font-medium text-theme-text transition hover:text-howly-primary"
                                    aria-expanded={isExpanded}
                                    onClick={() => onExpandedCategoryChange(
                                        isExpanded ? null : item.categoryKey,
                                    )}
                                >
                                    <ChevronDown
                                        className={cn(
                                            'size-4 shrink-0 text-theme-text-soft transition-transform',
                                            isExpanded && 'rotate-180',
                                        )}
                                        aria-hidden="true"
                                    />
                                    <span className="truncate">{item.categoryLabel}</span>
                                </button>
                            ) : (
                                <span className="font-medium text-theme-text">{item.categoryLabel}</span>
                            )}
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
                        {isExpanded ? (
                            <div className="space-y-2 border-l-2 border-theme-text/10 pl-4">
                                {hasSubcategories ? (
                                    item.bySubcategory.map((subcategory) => (
                                        <div key={subcategory.subcategoryKey} className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-3 text-sm">
                                                <span className="text-theme-text-soft">
                                                    └ {subcategory.subcategoryLabel}
                                                </span>
                                                <span className="shrink-0 tabular-nums text-theme-text-soft">
                                                    {subcategory.share}%
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-theme-text/10">
                                                <div
                                                    className="h-full rounded-full bg-howly-primary/70 transition-all"
                                                    style={{
                                                        width: `${Math.max(
                                                            (subcategory.checkIns / item.checkIns) * 100,
                                                            subcategory.checkIns ? 4 : 0,
                                                        )}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-theme-text-muted">
                                        No subcategory breakdown for this period.
                                    </p>
                                )}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

const trendingHabitPrimaryCtaClassName = 'rounded-full px-3 py-1.5 text-sm';

function TrendingHabits({
    habits,
    showTrends,
    companionName = 'Howly',
    onAddHabit,
    onFindChallenges,
}) {
    if (!habits?.length) {
        return (
            <p className="rounded-xl bg-theme-text/5 p-4 text-center text-sm text-theme-text-soft">
                No trending habits yet. Check-ins on classified habits will show up here.
            </p>
        );
    }

    const maxCheckIns = Math.max(...habits.map((item) => item.checkIns ?? 0), 1);

    return (
        <div className="space-y-6">
            {habits.map((item) => {
                const uniqueUsersLabel = formatUniqueUsersShort(item.uniqueUsers);
                const categoryLabel = item.categoryLabel ?? null;

                return (
                    <div key={item.canonicalHabitKey} className="space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                            <span className="min-w-0 truncate text-base font-semibold leading-snug text-theme-text">
                                {item.label}
                            </span>
                            {showTrends ? (
                                <TrendDelta trend={item.trend} className="mt-0.5 w-12 shrink-0 text-right" />
                            ) : null}
                        </div>

                        {categoryLabel || uniqueUsersLabel ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                                {categoryLabel ? (
                                    <Badge className={habitCategoryBadgeClassName}>
                                        {categoryLabel}
                                    </Badge>
                                ) : null}
                                {uniqueUsersLabel ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-theme-text-soft">
                                        <Users className="size-3.5 shrink-0" aria-hidden="true" />
                                        {uniqueUsersLabel}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="h-3 overflow-hidden rounded-full bg-theme-text/10">
                            <div
                                className="h-full rounded-full bg-howly-primary shadow-[0_0_12px] shadow-howly-primary/25 transition-all"
                                style={{
                                    width: `${Math.max(
                                        ((item.checkIns ?? 0) / maxCheckIns) * 100,
                                        item.checkIns ? 4 : 0,
                                    )}%`,
                                }}
                            />
                        </div>

                        {onAddHabit || onFindChallenges ? (
                            <div className="flex flex-wrap gap-2 pt-0.5">
                                {onAddHabit ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="primary"
                                        className={cn(trendingHabitPrimaryCtaClassName, 'gap-1.5')}
                                        onClick={() => onAddHabit(item)}
                                    >
                                        <Sparkles size={14} aria-hidden="true" />
                                        Ask {companionName} for habit ideas
                                    </Button>
                                ) : null}
                                {onFindChallenges && item.categoryKey ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className={trendingHabitSecondaryCtaClassName}
                                        onClick={() => onFindChallenges(item)}
                                    >
                                        Find challenges
                                    </Button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

export function TrendsPage() {
    const navigate = useNavigate();
    const { user, companion } = useAuth();
    const isPremiumUser = user?.isPremium === true || user?.role === 'admin';
    const [period, setPeriod] = useState('7d');
    const [expandedCategoryKey, setExpandedCategoryKey] = useState(null);
    const [trendsAnalytics, setTrendsAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isPremiumUser) {
            return undefined;
        }

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
    }, [isPremiumUser, period]);

    function handlePeriodChange(nextPeriod) {
        setExpandedCategoryKey(null);
        setPeriod(nextPeriod);
    }

    function handleFindChallenges(item) {
        const params = new URLSearchParams({ tab: 'public' });
        if (item.categoryKey) {
            params.set('category', item.categoryKey);
        }
        navigate(`/challenges?${params.toString()}`);
    }

    const displayTrendsAnalytics = isPremiumUser ? trendsAnalytics : MOCK_TRENDS_ANALYTICS;
    const displayIsLoading = isPremiumUser ? isLoading : false;
    const displayError = isPremiumUser ? error : '';
    const summary = displayTrendsAnalytics?.summary;
    const selectedPeriod = TRENDS_PERIOD_OPTIONS.find((option) => option.value === period)
        ?? TRENDS_PERIOD_OPTIONS[1];
    const periodInRange = selectedPeriod.inRange;
    const comparisonPeriod = displayTrendsAnalytics?.comparisonPeriod?.label ?? selectedPeriod.comparison;
    const standing = summary?.standing;
    const pulse = summary?.pulse;

    function handleAddTrendingHabit(item) {
        const companionIntent = buildTrendCompanionIntent(item, periodInRange);
        storePendingCompanionIntent(companionIntent);
        navigate('/dashboard', {
            state: { companionIntent },
        });
    }

    const trendsContent = (
            <div className="space-y-8">
                {displayError ? (
                    <div className="rounded-xl border border-theme-danger/30 bg-theme-danger/10 p-4 text-sm text-theme-danger">
                        {displayError}
                    </div>
                ) : null}

                <PageSection width="full">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-theme-text">
                            {selectedPeriod.heading}
                        </h2>
                        <PeriodToggle period={period} onPeriodChange={handlePeriodChange} />
                    </div>

                    {displayIsLoading ? (
                        <div className="flex items-center gap-2 rounded-xl border border-theme-text/10 bg-theme-text/5 p-4 text-sm text-theme-text-soft">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            Loading trends analytics
                        </div>
                    ) : (
                        <div>
                            <div className="mb-3 flex items-center gap-1.5">
                                <h3 className="text-sm font-semibold text-theme-text-soft">Howly together</h3>
                                <PulseHelpPopover />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <SummaryCard
                                    icon={Activity}
                                    label="Habit check-ins"
                                    value={formatPulseCheckIns(pulse?.checkIns)}
                                    trend={pulse?.checkInsTrend}
                                    helper={`All platform check-ins, incl. challenges ${periodInRange}`}
                                />
                                <SummaryCard
                                    icon={Users}
                                    label="Active users"
                                    value={formatActiveUsers(pulse?.activeUsers)}
                                    trend={pulse?.activeUsers?.trend}
                                    helper={`Users with any check-in, incl. challenges ${periodInRange}`}
                                />
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
                                    helper={`Leading platform category, incl. challenges ${periodInRange}`}
                                />
                            </div>
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
                        {displayIsLoading ? (
                            <div className="flex items-center gap-2 rounded-xl bg-theme-text/5 p-4 text-sm text-theme-text-soft">
                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                Loading categories
                            </div>
                        ) : (
                            <CategoryBreakdown
                                categories={displayTrendsAnalytics?.byCategory ?? []}
                                showTrends
                                expandedCategoryKey={expandedCategoryKey}
                                onExpandedCategoryChange={setExpandedCategoryKey}
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
                            Try what&apos;s rising {periodInRange}. Howly will suggest habits on your
                            dashboard, or find a fitting challenge.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {displayIsLoading ? (
                            <div className="flex items-center gap-2 rounded-xl bg-theme-text/5 p-4 text-sm text-theme-text-soft">
                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                Loading trending habits
                            </div>
                        ) : (
                            <TrendingHabits
                                habits={displayTrendsAnalytics?.trendingHabits ?? []}
                                showTrends
                                companionName={companion?.name || 'Howly'}
                                onAddHabit={handleAddTrendingHabit}
                                onFindChallenges={handleFindChallenges}
                            />
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-theme-text-muted">
                    Anonymous platform totals and patterns only. Never individual usernames or habit titles. Your consistency rank is a private benchmark against other Howly users.
                </p>
            </div>
    );

    return (
        <Page theme="forest" contentClassName="max-w-[1400px]">
            <Heading
                title="Trends"
                subtitle="See how Howly is doing together."
                streakDays={user?.streak ?? 0}
            />

            {isPremiumUser ? (
                trendsContent
            ) : (
                <PremiumFeaturePreview
                    title="Unlock Trends"
                    description="Trends shows anonymous community habit patterns, focus areas, and your private consistency benchmark. Upgrade to Premium to explore these insights."
                    returnTo="/trends"
                >
                    {trendsContent}
                </PremiumFeaturePreview>
            )}
        </Page>
    );
}
