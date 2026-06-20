import { cn } from '@/lib/utils';

const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-2xl gap-2 font-bold',
};

// Shows the user's streak-freeze reserve ("shields"). Presentational — pass the
// count in (e.g. from useAuth().user.streakShields). Reusable on dashboard,
// shop and profile.


// PLATZHALTER ICON
export function StreakShieldBadge({ count = 0, showLabel = true, size = 'md', className }) {
    return (
        <span
            className={cn(
                'inline-flex items-center text-slate-300',
                sizeClasses[size] ?? sizeClasses.md,
                className,
            )}
            title="Streak freezes"
        >
            <span aria-hidden="true">🛡️</span>
            {showLabel ? `${count} freeze${count === 1 ? '' : 's'}` : count}
        </span>
    );
}
