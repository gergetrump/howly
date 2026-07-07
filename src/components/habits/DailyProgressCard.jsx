import { Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useTheme } from '@/context/themeContext';
import { cn } from '@/lib/utils';

export function DailyProgressCard({ completed = 0, total = 0 }) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const { theme } = useTheme();
    const isSakura = theme === 'sakura-light';

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl p-6 text-theme-text shadow-lg',
                isSakura
                    ? 'bg-gradient-to-r from-theme-accent to-pink-500'
                    : 'bg-theme-surface ring-1 ring-theme-text/10',
            )}
        >
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-theme-text/90">Today's Progress</h3>
                    <p className="text-2xl font-bold">
                        {completed} / {total} completed
                    </p>
                </div>
                <Trophy className={cn('h-12 w-12', isSakura ? 'text-theme-text/80' : 'text-howly-primary')} />
            </div>

            <div className="mt-6">
                <Progress
                    value={percentage}
                    className="h-1.5 bg-theme-text/15"
                    indicatorClassName={isSakura ? 'bg-theme-invert' : 'bg-howly-primary'}
                />
            </div>
        </div>
    );
}
