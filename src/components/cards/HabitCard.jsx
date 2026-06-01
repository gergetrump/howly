import { Badge } from '@/components/ui/badge';
import { StreakBadge } from '@/components/brand/StreakBadge';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName, appCardInsetClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

export function HabitCard({
    emoji = '🔥',
    title,
    frequency,
    streakDays = 0,
    completed = false,
    children,
}) {
    return (
        <Card className={cn(appCardClassName, completed && 'bg-pink-500/20 ring-pink-300/30')}>
            <CardContent className="flex items-center gap-4">
                <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl text-xl', appCardInsetClassName)}>
                    <span aria-hidden="true">{emoji}</span>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{title}</h3>
                        {frequency ? <Badge variant="secondary">{frequency}</Badge> : null}
                    </div>
                    <StreakBadge days={streakDays} className="mt-1" />
                </div>

                {children}
            </CardContent>
        </Card>
    );
}
