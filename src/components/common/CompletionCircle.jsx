import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CompletionCircle({ completed = false, label = 'Mark complete', onClick, className }) {
    return (
        <button
            type="button"
            className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0ba360]/30',
                completed 
                    ? 'border-2 border-[#0ba360] bg-transparent text-[#0ba360] hover:bg-[#0ba360]/10'
                    : 'border-2 border-white/20 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white',
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
