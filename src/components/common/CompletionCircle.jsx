import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CompletionCircle({ completed = false, label = 'Mark complete', onClick, className }) {
    return (
        <button
            type="button"
            className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200',
                completed && 'border-emerald-300 bg-emerald-400 text-slate-950 hover:bg-emerald-300',
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
