import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReactionButton({ liked = false, count = 0, label = 'Like post', onClick, className, ...props }) {
    return (
        <button
            type="button"
            className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-theme-text/10 px-3 py-2 text-sm font-medium text-theme-text transition hover:bg-theme-text/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200',
                liked && 'bg-theme-love/15 text-theme-love',
                className,
            )}
            aria-label={label}
            aria-pressed={liked}
            onClick={onClick}
            {...props}
        >
            <Heart className={cn('size-4', liked && 'fill-pink-300')} aria-hidden="true" />
            {count}
        </button>
    );
}
