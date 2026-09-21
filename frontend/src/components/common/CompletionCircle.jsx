import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CompletionCircle({ completed = false, label = 'Mark complete', onClick, className }) {
    return (
        <button
            type="button"
            className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-success/30',
                completed 
                    ? 'border-2 border-theme-success bg-transparent text-theme-success hover:bg-theme-success/10'
                    : 'border-2 border-theme-text/20 bg-theme-text/5 text-theme-text/50 hover:bg-theme-text/10 hover:text-theme-text',
                className,
            )}
            aria-label={label}
            aria-pressed={completed}
            onClick={onClick}
        >
            {completed ? <Check className="size-5" aria-hidden="true" /> : null}
        </button>
    );
}
