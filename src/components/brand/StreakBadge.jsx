import { cn } from '@/lib/utils';

const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1',
    lg: 'text-2xl gap-2 font-bold',
};

export function StreakBadge({ days = 0, showLabel = true, size = 'md', icon = '🌙', className }) {
    return (
        <span
            className={cn(
                'inline-flex items-center text-slate-300',
                sizeClasses[size] ?? sizeClasses.md,
                className,
            )}
        >
            <span aria-hidden="true">🌙</span>
            {showLabel ? `${days} day streak` : days}
        </span>
    );
}
