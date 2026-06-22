import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReactionButton({
    liked = false,
    count = 0,
    label = 'Like post',
    onClick,
    onCountClick,
    className,
    disabled = false,
    ...props
}) {
    return (
        <div
            className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200',
                liked && 'bg-pink-500/15 text-pink-100',
                disabled && 'opacity-60',
                className,
            )}
            {...props}
        >
            <button
                type="button"
                className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                aria-label={label}
                aria-pressed={liked}
                disabled={disabled}
                onClick={onClick}
            >
                <Heart className={cn('size-4', liked && 'fill-pink-300')} aria-hidden="true" />
            </button>
            <button
                type="button"
                className="min-w-3 rounded-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 disabled:cursor-default"
                aria-label={count ? `Show ${count} ${count === 1 ? 'like' : 'likes'}` : label}
                disabled={disabled}
                onClick={count && onCountClick ? onCountClick : onClick}
            >
                {count}
            </button>
        </div>
    );
}
