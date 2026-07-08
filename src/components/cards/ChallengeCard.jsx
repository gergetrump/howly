import { CalendarDays, Trophy, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MoonCoin } from '@/components/brand/MoonCoin.jsx';
import { appCardClassName, appCardInsetClassName } from './cardStyles';
import { cn } from '@/lib/utils';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toTitleCase(value) {
    if (!value) {
        return '';
    }

    const withSpaces = value.replace(/([a-z])([A-Z])/g, '$1 $2');

    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function getElapsedDays(startsAt, totalDays) {
    if (!startsAt || !totalDays) {
        return 0;
    }

    const startDate = new Date(startsAt);
    const elapsedDays = Math.floor((Date.now() - startDate.getTime()) / DAY_IN_MS) + 1;

    return Math.min(Math.max(elapsedDays, 0), totalDays);
}

export function ChallengeCard({
    title,
    description,
    habitTitle,
    category = null,
    recommendationReason = null,
    status,
    visibility,
    participants = 0,
    currentDay,
    totalDays = 30,
    reward,
    startsAt,
    children,
}) {
    const displayedDay = currentDay ?? getElapsedDays(startsAt, totalDays);
    const progressValue = totalDays ? Math.round((displayedDay / totalDays) * 100) : 0;

    return (
        <Card className={cn(appCardClassName, 'text-base')}>
            <CardHeader className="grid grid-cols-[auto_1fr] items-start gap-4 px-6 pt-6">
                <div className={cn('flex size-14 items-center justify-center rounded-xl text-2xl', appCardInsetClassName)}>
                    <Trophy className="size-7 text-theme-success" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <CardTitle className="break-words text-2xl font-bold leading-tight">{title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 px-6 pb-6">
                {habitTitle ? (
                    <div className="inline-flex max-w-full rounded-xl border border-theme-success/25 bg-theme-success/10 px-3 py-2">
                        <span className="min-w-0 break-words text-lg font-bold leading-snug text-theme-success">
                            {habitTitle}
                        </span>
                    </div>
                ) : null}
                <div className="flex min-h-12 flex-wrap content-start items-center gap-2">
                    {recommendationReason ? (
                        <Badge className="border border-theme-accent/30 bg-theme-accent/15 text-theme-accent-soft hover:bg-theme-accent/15">
                            {recommendationReason}
                        </Badge>
                    ) : null}
                    {category ? (
                        <Badge className="border border-theme-accent/30 bg-theme-accent/15 text-theme-accent-soft hover:bg-theme-accent/15">
                            {category}
                        </Badge>
                    ) : null}
                    {status ? (
                        <Badge className="border border-theme-text/15 bg-theme-text/10 text-theme-text">
                            {toTitleCase(status)}
                        </Badge>
                    ) : null}
                    {visibility ? (
                        <Badge className="border border-theme-text/15 bg-theme-text/10 text-theme-text">
                            {toTitleCase(visibility)}
                        </Badge>
                    ) : null}
                    <Badge className="border border-theme-text/15 bg-theme-text/10 text-theme-text">
                        <UsersRound className="size-3" aria-hidden="true" />
                        {participants} joined
                    </Badge>
                    <Badge className="border border-theme-text/15 bg-theme-text/10 text-theme-text">
                        <CalendarDays className="size-3" aria-hidden="true" />
                        {totalDays} days
                    </Badge>
                </div>
                {description ? <p className="text-sm leading-relaxed text-theme-text-soft">{description}</p> : null}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-theme-text-soft">
                        <span>Progress</span>
                        <span>
                            {displayedDay}/{totalDays} days
                        </span>
                    </div>
                    <Progress value={progressValue} className="h-2" indicatorClassName="bg-theme-success" />
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="shrink-0">
                        <MoonCoin amount={reward ?? 0} compact />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-nowrap justify-end gap-2 overflow-x-auto pb-1">{children}</div>
                </div>
            </CardContent>
        </Card>
    );
}
