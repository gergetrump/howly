import { cn } from '@/lib/utils';
import { StreakShieldIcon } from './StreakShieldIcon.jsx';

const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-2xl gap-2 font-bold',
};

const iconSizes = {
    sm: 'h-3.5',
    md: 'h-4',
    lg: 'h-7',
};

// Shows the user's streak-freeze reserve. Presentational — pass the count in
// (e.g. from useAuth().user.streakShields). Reusable on dashboard, shop, profile.
export function StreakShieldBadge({ count = 0, showLabel = true, size = 'md', className }) {
    return (
        <span
            className={cn(
                'inline-flex items-center text-theme-text-soft',
                sizeClasses[size] ?? sizeClasses.md,
                className,
            )}
            title="Streak shields"
        >
            <StreakShieldIcon className={cn('w-auto', iconSizes[size] ?? iconSizes.md)} />
            {showLabel ? `${count} shield${count === 1 ? '' : 's'}` : count}
        </span>
    );
}
