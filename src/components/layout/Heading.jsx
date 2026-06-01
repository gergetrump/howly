import { LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StreakBadge } from '@/components/brand/StreakBadge';
import { cn } from '@/lib/utils';

// Available sizes: sm, md, lg.
const topBarSizes = {
    sm: {
        brand: 'text-xs',
        title: 'text-xl',
        subtitle: 'text-xs',
        subtitleSpacing: 'mt-1',
    },
    md: {
        brand: 'text-sm',
        title: 'text-2xl',
        subtitle: 'text-sm',
        subtitleSpacing: 'mt-1',
    },
    lg: {
        brand: 'text-base',
        title: 'text-4xl',
        subtitle: 'text-lg',
        subtitleSpacing: 'mt-2',
    },
};

export function Heading({
    title,
    subtitle,
    streakDays,
    size = 'md',
    onSettings,
    onLogout,
}) {
    const sizeClasses = topBarSizes[size] ?? topBarSizes.md;

    return (
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="min-w-0">
                <h1 className={cn('truncate font-bold text-white', sizeClasses.title)}>{title}</h1>
                {subtitle ? (
                    <p className={cn('text-slate-300', sizeClasses.subtitleSpacing, sizeClasses.subtitle)}>
                        {subtitle}
                    </p>
                ) : null}
            </div>

            <div className="flex items-center gap-2">
                {typeof streakDays === 'number' ? (
                    <StreakBadge days={streakDays} showLabel={false} size="lg" />
                ) : null}

                {onSettings ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Open settings"
                        onClick={onSettings}
                    >
                        <Settings />
                    </Button>
                ) : null}

                {onLogout ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Log out"
                        onClick={onLogout}
                    >
                        <LogOut />
                    </Button>
                ) : null}
            </div>
        </header>
    );
}
