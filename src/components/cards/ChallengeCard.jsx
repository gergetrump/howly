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
                    <Trophy className="size-7 text-emerald-300" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <CardTitle className="break-words text-2xl font-bold leading-tight">{title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 px-6 pb-6">
                {habitTitle ? (
                    <div className="inline-flex max-w-full rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2">
                        <span className="min-w-0 break-words text-lg font-bold leading-snug text-emerald-50">
                            {habitTitle}
                        </span>
                    </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                    {category ? (
                        <Badge className="border border-purple-400/30 bg-purple-500/15 text-purple-100 hover:bg-purple-500/15">
                            {category}
                        </Badge>
                    ) : null}
                    {status ? (
                        <Badge className="border border-white/15 bg-white/10 text-slate-100">
                            {toTitleCase(status)}
                        </Badge>
                    ) : null}
                    {visibility ? (
                        <Badge className="border border-white/15 bg-white/10 text-slate-100">
                            {toTitleCase(visibility)}
                        </Badge>
                    ) : null}
                    <Badge className="border border-white/15 bg-white/10 text-slate-100">
                        <UsersRound className="size-3" aria-hidden="true" />
                        {participants} joined
                    </Badge>
                    <Badge className="border border-white/15 bg-white/10 text-slate-100">
                        <CalendarDays className="size-3" aria-hidden="true" />
                        {totalDays} days
                    </Badge>
                </div>
                {description ? <p className="text-sm leading-relaxed text-slate-300">{description}</p> : null}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-300">
                        <span>Progress</span>
                        <span>
                            {displayedDay}/{totalDays} days
                        </span>
                    </div>
                    <Progress value={progressValue} className="h-2" indicatorClassName="bg-emerald-400" />
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto pb-1">{children}</div>
                    <div className="ml-auto shrink-0">
                        <MoonCoin amount={reward ?? 0} compact />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
