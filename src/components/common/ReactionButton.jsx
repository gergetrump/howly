import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReactionButton({
    liked = false,
    count = 0,
    label = 'Like post',
    onClick,
    className,
    disabled = false,
    ...props
}) {
    return (
        <button
            type="button"
            className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-theme-text/10 px-3 py-2 text-sm font-medium text-theme-text transition hover:bg-theme-text/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-love/40',
                liked && 'bg-theme-love/15 text-theme-love',
                disabled && 'opacity-60',
                className,
            )}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={liked}
            {...props}
        >
            <Heart className={cn('size-4', liked && 'fill-pink-300')} aria-hidden="true" />
            <span className="min-w-3 text-center">{count}</span>
        </button>
    );
}
