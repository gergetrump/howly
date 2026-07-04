import { useState } from 'react';
import { Activity, BarChart3, CheckCircle2, Globe, Sparkles, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Page, PageSection, Heading } from '@/components/layout';
import { useAuth } from '@/context/authContext';
import { appCardClassName, appCardInsetClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

const PERIOD_LABELS = {
    week: 'Week',
    month: 'Month',
};

const periodTabTriggerClassName = 'px-3 py-1 text-xs text-white/70 data-active:!bg-white/20 data-active:!text-white sm:text-sm';

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

function PlaceholderPanel({ title, icon: Icon, message }) {
    return (
        <Card className={appCardClassName}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Icon className="size-5 text-emerald-300" aria-hidden="true" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="rounded-xl bg-white/5 p-4 text-center text-sm text-slate-300">
                    {message}
                </p>
            </CardContent>
        </Card>
    );
}

export function CommunityPage() {
    const { user } = useAuth();
    const [period, setPeriod] = useState('week');

    return (
        <Page theme="forest" contentClassName="max-w-[1400px]">
            <Heading
                title="Community"
                subtitle="See how Howly is doing together."
                streakDays={user?.streak ?? 0}
            />

            <div className="space-y-8">
                <PageSection width="full" title="Today on Howly" description="Right now across the community">
                    <div className="grid gap-4 md:grid-cols-3">
                        <SummaryCard
                            icon={CheckCircle2}
                            label="Check-ins today"
                            value="Coming soon"
                            helper="Total habits completed on Howly today"
                        />
                        <SummaryCard
                            icon={Users}
                            label="Active today"
                            value="Coming soon"
                            helper="Howly users who checked in today"
                        />
                        <SummaryCard
                            icon={Sparkles}
                            label="Leading area"
                            value="Coming soon"
                            helper="Top habit category today"
                        />
                    </div>
                </PageSection>

                <PageSection width="full">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-white">
                            This {PERIOD_LABELS[period].toLowerCase()} on Howly
                        </h2>
                        <PeriodToggle period={period} onPeriodChange={setPeriod} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <SummaryCard
                            icon={Users}
                            label="Active Howly users"
                            value="Coming soon"
                            helper={`Users with check-ins this ${period}`}
                        />
                        <SummaryCard
                            icon={Activity}
                            label="Habits completed"
                            value="Coming soon"
                            helper={`Check-ins this ${period}`}
                        />
                        <SummaryCard
                            icon={Globe}
                            label="Top focus area"
                            value="Coming soon"
                            helper={`Leading category this ${period}`}
                        />
                    </div>
                </PageSection>

                <PlaceholderPanel
                    title="What Howly is working on"
                    icon={BarChart3}
                    message="Category breakdown will appear here once community analytics are connected."
                />

                <PlaceholderPanel
                    title="Trending on Howly"
                    icon={Sparkles}
                    message="Most completed habit types across Howly will show up here."
                />

                <p className="text-center text-xs text-slate-400">
                    Anonymous totals only. Howly never shows individual habit names or usernames here.
                </p>
            </div>
        </Page>
    );
}
