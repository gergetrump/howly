import { UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MoonCoin } from '@/components/brand/MoonCoin.jsx';
import { appCardClassName, appCardInsetClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

export function ChallengeCard({
    emoji = '🏆',
    title,
    description,
    participants = 0,
    currentDay = 0,
    totalDays = 30,
    reward = 0,
}) {
    const progressValue = totalDays ? Math.round((currentDay / totalDays) * 100) : 0;

    return (
        <Card className={cn(appCardClassName, 'text-base')}>
            <CardHeader className="grid grid-cols-[auto_1fr] items-start gap-4 px-6 pt-6">
                <div className={cn('flex size-14 items-center justify-center rounded-xl text-2xl', appCardInsetClassName)}>
                    <span aria-hidden="true">{emoji}</span>
                </div>
                <div className="min-w-0">
                    <CardTitle className="text-xl">{title}</CardTitle>
                    {description ? <p className="mt-2 text-base text-slate-300">{description}</p> : null}
                </div>
            </CardHeader>
            <CardContent className="space-y-5 px-6 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border border-white/15 bg-white/10 text-slate-100">
                        <UsersRound className="size-3" aria-hidden="true" />
                        {participants} joined
                    </Badge>
                    <MoonCoin amount={reward} compact />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-300">
                        <span>Progress</span>
                        <span>
                            {currentDay}/{totalDays} days
                        </span>
                    </div>
                    <Progress value={progressValue} className="h-2" indicatorClassName="bg-emerald-400" />
                </div>
            </CardContent>
        </Card>
    );
}
